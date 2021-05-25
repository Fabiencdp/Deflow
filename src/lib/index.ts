import EventEmitter from 'events';
import Debug from 'debug';
import { generate } from 'short-uuid';

import Workflow from './Workflow';
import Client from './Client';
import Step, { AddStep, JSONStep } from './Step';
import Task, { JSONTask } from './Task';

const debug = Debug('deflow');

export interface DeFlowOptions {
  connection: {
    host?: string;
    port?: number;
    maxAttempts?: number;
    connectTimeout?: number;
    retryMaxDelay?: number;
  };
}

interface SignalData<D = unknown> {
  workflowId: string;
  action: string;
  creatorId: string;
  step?: JSONStep<D>;
}

class DeFlowEmitter extends EventEmitter {}

export default class DeFlow extends DeFlowEmitter {
  // TODO:
  private subscriber!: Client;
  private publisher!: Client;
  public queue!: Client;

  private readonly uuid = generate();

  private static instance: DeFlow;

  private static readonly signalChannel = '_wfw:signal';
  private static readonly signalActions = {
    CREATE: 'create',
    STEP_START: 'run-next-step',
    RUN_NEXT_TASK: 'run-next-task',
    STEP_DONE: 'step-done',
    DONE: 'done',
  };

  public readonly options: DeFlowOptions = {
    connection: {
      host: 'localhost',
      port: 6379,
      maxAttempts: 10,
      connectTimeout: 10000,
      retryMaxDelay: 10000,
    },
  };

  /**
   */
  private constructor(opts?: DeFlowOptions) {
    super();
    this.options = {
      ...this.options,
      ...(opts || {}),
    };
  }

  /**
   * Get singleton instance
   * @param opts
   */
  public static getInstance(opts?: DeFlowOptions): DeFlow {
    if (!DeFlow.instance) {
      DeFlow.instance = new DeFlow(opts);
      DeFlow.instance._init();
    }
    return DeFlow.instance;
  }

  /**
   * Init needed classes
   */
  private _init() {
    DeFlow.log('_init');
    this.subscriber = Client.createRedisClient(this.options);
    this.publisher = Client.createRedisClient(this.options);
    this.queue = Client.createRedisClient(this.options);
  }

  /**
   * @param name
   * @param steps
   */
  public static async createWorkflow(name: string, steps: AddStep[]): Promise<Workflow> {
    DeFlow.log('createWorkflow');
    if (!DeFlow.instance) {
      throw new Error('DeFlow is not registered, did you forgot to call Flow.register() ?');
    }
    return Workflow.create(name, steps);
  }

  /**
   * Main run handler
   */
  public run(workflowId: string): void {
    DeFlow.log('run', workflowId);

    this._runNextStep(workflowId);
  }

  /**
   * @param workflowId
   * @param step
   * @private
   */
  private async _signalRunNextStep(workflowId: string, step: Step) {
    DeFlow.log('_signalRunNextStep');

    const data: SignalData = {
      action: DeFlow.signalActions.STEP_START,
      creatorId: this.uuid,
      workflowId,
      step,
    };

    const message = JSON.stringify(data);
    await this.publisher.publish(DeFlow.signalChannel, message);
  }

  /**
   * Register to events
   */
  public static register(option: DeFlowOptions): void {
    if (DeFlow.instance) {
      return;
    }

    const instance = DeFlow.getInstance(option);

    instance.subscriber.on('message', async (channel, message) => {
      const { workflowId, action, step } = JSON.parse(message) as SignalData;
      DeFlow.log('registerMessage', channel, workflowId, action);

      switch (action) {
        case DeFlow.signalActions.STEP_START:
          if (step) {
            instance._runNextTask(step);
          }
          break;
      }
    });

    instance.subscriber.subscribe(DeFlow.signalChannel);
  }

  /**
   * @param workflowId
   * @private
   */
  private async _runNextStep(workflowId: string) {
    DeFlow.log('_runNextStep', workflowId);

    const workflow = await Workflow.get(workflowId);

    // Get min
    this.queue.zrange(workflow.stepsQueue, 0, 1, (err, reply) => {
      DeFlow.log('zrange', reply);

      const [json] = reply;
      if (!json) {
        this._clean(workflowId);
        return;
      }

      const jsonStep = JSON.parse(json) as JSONStep;
      const step = new Step(jsonStep);

      this._signalRunNextStep(workflowId, step);
    });
  }

  /**
   * Run the task
   * @param jsonStep
   * @private
   */
  private async _runNextTask(jsonStep: JSONStep) {
    const step = new Step(jsonStep);
    DeFlow.log('_runNextTask', step.id);

    let running = 0;
    const promises = [];
    while (running < step.options.taskConcurrency) {
      running = running + 1;
      promises.push(this._runTaskHandler(step));
    }

    await Promise.all(promises);

    // Update step when all task are done
    this._updateStep(step);
  }

  /**
   * Run the task
   * @param step
   * @private
   */
  private async _runTaskHandler(step: Step): Promise<void> {
    DeFlow.log('_runNextTask', step.queues.pending);

    return new Promise((resolve) => {
      this.queue.rpop(step.taskQueues.pending, async (err, reply) => {
        if (!reply) {
          return resolve();
        }

        const jsonTask = JSON.parse(reply) as JSONTask;
        const task = new Task(jsonTask);

        // Run the task
        let dest = step.taskQueues.done;
        try {
          task.result = await step.runTask(task);
        } catch (e) {
          task.error = e.message;
          task.failedCount = task.failedCount + 1;

          // Retry failed task
          if (task.failedCount < step.options.taskMaxFailCount) {
            dest = step.taskQueues.pending;
          }
        }

        const doneTask = JSON.stringify(task);
        await this.queue.lpush(dest, doneTask);

        return resolve(this._runTaskHandler(step));
      });
    });
  }

  /**
   * @param step
   * @private
   */
  private async _updateStep(step: Step) {
    DeFlow.log('_updateStep', step.name);

    this.queue.zrange(step.queues.pending, 0, 0, (err, reply) => {
      const [json] = reply;
      if (!json) {
        return;
      }

      const jsonStep = JSON.parse(json) as JSONStep;
      if (json && jsonStep.id === step.id) {
        this.queue.llen(step.taskQueues.done, async (err, reply) => {
          if (reply === step.taskCount) {
            await this.queue.sendCommand('ZPOPMIN', [step.queues.pending]);
            await this.queue.zadd(step.queues.done, step.index, JSON.stringify(step));
            return this._runNextStep(step.workflowId);
          }
        });
      }
    });
  }

  /**
   * Clean workbench
   * @param workflowId
   * @private
   */
  private async _clean(workflowId: string): Promise<number | void> {
    const workflow = await Workflow.get(workflowId);
    if (workflow) {
      return workflow.clean();
    }
  }

  /**
   * @param message
   */
  public static log(...message: unknown[]): void {
    debug(message.join(' '));
  }
}
