import Debug from 'debug';
import { uuid } from 'short-uuid';
import Task, { TaskJSON } from './Task';
import DeFlow from './index';
import PubSubManager, { Action } from './PubSubManager';
import WorkFlow from './WorkFlow';

const debug = Debug('Step');

type HandlerModule = {
  beforeAll: (step: Step) => Promise<any>;
  handler: (task: Task) => Promise<any>;
  afterAll: (step: Step) => Promise<any>;
};

export type CreateStep = {
  name: string;
  tasks: any[];
  handler: string;
  index: number;

  options?: {
    taskConcurrency?: number;
    taskMaxFailCount?: number;
  };

  workFlowId: string;
};

export type JSONStep = {
  id: string;
  name: string;
  handler: string;
  index: number;
  taskCount: number;

  options: StepOptions;

  workflowId: string;
  key: string;
};

export type StepOptions = {
  taskMaxFailCount: number;
  taskConcurrency: number;
};

const defaultStepOptions: StepOptions = {
  taskConcurrency: 1,
  taskMaxFailCount: 1,
};

export default class Step {
  public id: string;
  public name: string;
  public index: number;
  public handler: string;
  public taskCount: number;

  public options = defaultStepOptions;

  public workflowId: string;
  public key: string;

  constructor(json: JSONStep) {
    this.id = json.id;
    this.name = json.name;
    this.index = json.index;
    this.handler = json.handler;
    this.taskCount = json.taskCount;

    this.options = json.options;

    this.workflowId = json.workflowId;
    this.key = json.key;
  }

  static async create(data: CreateStep) {
    const id = uuid();

    const { options: opts } = data;

    const options = {
      taskConcurrency: opts?.taskConcurrency || 1,
      taskMaxFailCount: opts?.taskMaxFailCount || 1,
    };

    const stepInstance = new Step({
      id,
      name: data.name,
      index: data.index,
      handler: data.handler,
      workflowId: data.workFlowId,
      key: [data.workFlowId, id].join(':'),
      taskCount: data.tasks.length,
      options,
    });

    await stepInstance.store();

    // Create tasks
    data.tasks.reduce(async (prev, taskData) => {
      await prev;
      await Task.create({
        stepId: stepInstance.id,
        workFlowId: stepInstance.workflowId,
        data: taskData,
      });
    }, Promise.resolve());

    return stepInstance;
  }

  private async store(): Promise<boolean[]> {
    const deFlow = DeFlow.getInstance();

    const list = [this.workflowId, 'steps'].join(':');
    const id = [this.workflowId, this.id].join(':');
    const data = JSON.stringify(this);

    const stepData = new Promise<boolean>((resolve) => {
      deFlow.client.set(id, data, (err, status) => {
        return resolve(true);
      });
    });

    const queueData = new Promise<boolean>((resolve) => {
      deFlow.client.zadd(list, this.index, data, (err, status) => {
        return resolve(true);
      });
    });

    return Promise.all([stepData, queueData]);
  }

  /**
   * run next task
   * @param stepKey
   */
  static async nextTask(stepKey: string): Promise<any> {
    const step = await Step.getByKey(stepKey);
    return step.runNextTask();
  }

  public async start(): Promise<any> {
    // Run beforeAll method
    await this.runBeforeAll();

    await PubSubManager.publish({
      action: Action.NextTask,
      data: { workFlowId: this.workflowId, stepKey: this.key },
    });

    return this.runNextTask();
  }

  /**
   * Run next task recursively
   */
  public async runNextTask(): Promise<any> {
    const deFlow = DeFlow.getInstance();
    const task = await this.getNextTask();

    if (!task) {
      return this.onTasksDone();
    }

    // Run the task
    let dest = 'done';
    try {
      task.result = await this.runTaskHandler(task);
    } catch (e) {
      task.error = e.message;
      task.failedCount = task.failedCount + 1;

      // Retry failed task
      if (task.failedCount < this.options.taskMaxFailCount) {
        dest = 'pending';
      }
    }

    const data = JSON.stringify(task);
    await deFlow.client.lpush([this.key, dest].join(':'), data);

    return this.runNextTask();
  }

  private async getModule() {
    const module: HandlerModule = await import(this.handler).then((m) => m.default);
    if (!module || !module.handler) {
      throw new Error('Module is not valid');
    }
    return module;
  }

  private async runTaskHandler(task: Task) {
    const module = await this.getModule();
    return module.handler(task);
  }

  private async runAfterAll() {
    const module = await this.getModule();
    if (typeof module.afterAll === 'function') {
      await module.afterAll(this);
    }
  }

  private async runBeforeAll() {
    const module = await this.getModule();
    if (typeof module.beforeAll === 'function') {
      await module.beforeAll(this);
    }
  }

  /**
   * @private
   */
  private async onTasksDone() {
    const deFlow = DeFlow.getInstance();

    const list = [this.workflowId, 'steps'].join(':');
    const listDone = [this.workflowId, 'steps-done'].join(':');

    deFlow.client.zrange(list, 0, 0, async (err, reply) => {
      const [json] = reply;
      if (!json) {
        return;
      }

      const jsonStep = JSON.parse(json) as JSONStep;
      if (json && jsonStep.id === this.id) {
        // Check if there is remaining job
        deFlow.client.llen([this.key, 'done'].join(':'), async (err, reply) => {
          if (reply < this.taskCount) {
            // There is more task to do
            return;
          }

          // Run afterAll method
          await this.runAfterAll();

          // Pop current step from the list
          await deFlow.client.sendCommand('ZPOPMIN', [list]);
          await deFlow.client.zadd(listDone, this.index, JSON.stringify(this));

          // Signal next step
          await PubSubManager.publish({
            action: Action.NextStep,
            data: { workFlowId: this.workflowId },
          });
          return WorkFlow.nextStep(this.workflowId);
        });
      }
    });
  }

  public static async getByKey(key: string): Promise<Step> {
    const deFlow = DeFlow.getInstance();

    return new Promise((resolve, reject) => {
      deFlow.client.get(key, (err, res) => {
        if (err || !res) {
          return reject(err?.message || 'Unknown error');
        }
        const stepJSON: JSONStep = JSON.parse(res);
        const step = new Step(stepJSON);
        return resolve(step);
      });
    });
  }

  private getNextTask(): Promise<Task | null> {
    const deFlow = DeFlow.getInstance();

    return new Promise((resolve, reject) => {
      deFlow.client.lpop([this.key, 'pending'].join(':'), (err, res) => {
        if (!res) {
          return resolve(null);
        }

        const taskJSON: TaskJSON = JSON.parse(res);
        const task = new Task(taskJSON);

        return resolve(task);
      });
    });
  }

  toJSON(): JSONStep {
    return {
      id: this.id,
      index: this.index,
      name: this.name,
      handler: this.handler,
      workflowId: this.workflowId,
      key: this.key,
      options: this.options,
      taskCount: this.taskCount,
    };
  }
}
