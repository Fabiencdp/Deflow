import EventEmitter from 'events';

import { generate } from 'short-uuid';
import slugify from 'slugify';
import Debug from 'debug';

import { TypeSafeEventEmitter } from '../types';

import Step, { AddStep, JSONStepListItem, StepOptions } from './Step';
import PubSubManager, { Action } from './PubSubManager';
import StepHandler from './StepHandler';
import Task from './Task';

import DeFlow from './index';

const debug = Debug('deflow:workflow');

export type WorkFlowJSON = {
  id: string;
  name: string;
  queueId: string;
  options: WorkFlowOption;
};

type WorkFlowOption = Partial<StepOptions> & {
  ifExist: 'replace' | 'create';
  cleanOnDone: boolean;
};

export type WorkFlowResult = WorkFlow & {
  steps: (Step & { tasks: Task[] })[];
};

type NextTaskEventData = {
  id: string;
  workflowId: string;
  stepKey: string;
  data: any;
};

type Events = {
  done: WorkFlowResult;
  nextTask: NextTaskEventData;
};

const defaultOptions: WorkFlowOption = {
  ifExist: 'create',
  cleanOnDone: true,
};

export default class WorkFlow {
  public id: string;
  public name: string;
  public list: string;
  public options: WorkFlowOption;

  public events: TypeSafeEventEmitter<Events>;

  /**
   * Temp in memory store
   */
  #addedSteps: AddStep[] = [];

  /**
   * Create a workflow from json
   * @param json
   */
  constructor(json: WorkFlowJSON) {
    this.id = json.id;
    this.name = json.name;
    this.list = json.queueId;
    this.options = json.options;

    this.events = new EventEmitter();
  }

  /**
   * Create and save new workflow
   * @param name
   * @param opts
   */
  static create(name: string, opts: Partial<WorkFlowOption> = {}): WorkFlow {
    const id = slugify([name, generate()].join(':'));
    const queueId = [id, 'steps'].join(':');

    const options = { ...defaultOptions, ...opts };
    return new WorkFlow({ id, name, queueId, options });
  }

  /**
   * Run a step by key
   * @param key
   */
  public static async runStep(key: string): Promise<void> {
    debug(`runStep ${key}`);

    const step = await Step.getByKey(key);
    if (!step) {
      throw new Error('Does not exist');
    }
    await step.runNextTask();
  }

  /**
   * Get workflow by id
   * @param workflowId
   */
  public static async getById(workflowId: string): Promise<WorkFlow | null> {
    debug(`getById ${workflowId}`);

    const deFlow = DeFlow.getInstance();

    return new Promise((resolve, reject) => {
      deFlow.client.get(workflowId, (err, res) => {
        if (err) {
          return reject(err?.message || 'Workflow Unknown error');
        }

        if (!res) {
          return resolve(null);
        }

        const workflowJson: WorkFlowJSON = JSON.parse(res);
        return resolve(new WorkFlow(workflowJson));
      });
    });
  }

  /**
   * get next step and run
   * Publish event
   * @param workflowId
   */
  public static async runNextStep(workflowId: string): Promise<void> {
    debug(`runNextStep ${workflowId}`);

    const workflow = await WorkFlow.getById(workflowId);

    if (!workflow) {
      debug('workflow does not exist');
      throw new Error('workflow does not exist');
    }

    const stepKey = await workflow.#getNextStep();
    if (stepKey) {
      await PubSubManager.publish({
        action: Action.NextStep,
        data: { workflowId, stepKey },
      });
      return WorkFlow.runStep(stepKey);
    } else {
      await PubSubManager.publish({
        action: Action.Done,
        data: { workflowId },
      });
    }
  }

  /**
   * Run the workflow
   */
  public run(): WorkFlow {
    this.#store().then(async () => {
      if (this.#addedSteps.length > 0) {
        await this.#storeSteps();
      }

      this.#listenPubSubEvents();

      // Run workflow
      return WorkFlow.runNextStep(this.id);
    });
    return this;
  }

  /**
   * Add a step to the current workflow
   * @param params
   */
  public addStep<T extends StepHandler>(params: AddStep<T>): WorkFlow {
    const { step, options, tasks } = params;

    let data = undefined;
    if (params && 'data' in params) {
      data = (params as any).data as T['data']; // Fix complex type error
    }

    this.#addedSteps.push({ step, data, tasks, options });

    return this;
  }

  /**
   * Return all results
   */
  public results(): Promise<WorkFlowResult> {
    const instance = DeFlow.getInstance();
    return new Promise<WorkFlowResult>((resolve, reject) => {
      instance.client.zrangebyscore(`${this.id}:steps-done`, '-inf', '+inf', (err, res) => {
        if (err) {
          return reject(err);
        }

        const doneSteps = res.map((r) => JSON.parse(r));

        const promises = doneSteps.map(async (s) => {
          const step = await Step.getByKey(s.key);
          const tasks = await step.getResults();
          return { ...step.toJSON(), tasks };
        });

        Promise.all(promises).then((results) => {
          const steps = results as unknown as (Step & { tasks: Task[] })[]; // TODO: fix type
          return resolve({ ...this, steps });
        });
      });
    });
  }

  /**
   * Remove from redis
   */
  public async clean(): Promise<void> {
    debug('clean');
    return this.#cleanByKey(this.id);
  }

  /**
   * Get the next step of the workflow
   */
  async #getNextStep(): Promise<string | null> {
    debug('getNextStep');

    const deFlow = DeFlow.getInstance();

    // Get step with the max score
    return new Promise<string | null>((resolve, reject) => {
      deFlow.client.zrevrange(this.list, 0, 0, async (err, reply) => {
        if (err) {
          return reject(err);
        }

        const [json] = reply;
        if (!json) {
          debug('empty workflow list');
          return resolve(null);
        }

        const jsonStep = JSON.parse(json) as JSONStepListItem;
        return resolve(jsonStep.key);
      });
    });
  }

  /**
   * Store in redis
   */
  async #store(): Promise<boolean> {
    debug('store');

    const deFlow = DeFlow.getInstance();

    if (this.options.ifExist === 'replace') {
      await this.#cleanByKey(this.name);
    }

    const data = JSON.stringify(this);
    return new Promise((resolve, reject) => {
      deFlow.client.set(this.id, data, (err) => {
        if (err) {
          return reject(err);
        }
        return resolve(true);
      });
    });
  }

  /**
   * Store added step sequentially, reverse order to keep good process order
   */
  async #storeSteps(): Promise<void> {
    await this.#addedSteps.reverse().reduce(async (prev: Promise<void | Step>, data) => {
      await prev;

      return Step.create({
        ...data,
        module: data.step,
        options: data.options,
        index: new Date().getTime(),
        workflowId: this.id,
      });
    }, Promise.resolve());
  }

  /**
   * Register some events
   * TODO: better event management
   */
  #listenPubSubEvents(): void {
    const onNextTask = async (data: NextTaskEventData) => {
      if (data.workflowId === this.id) {
        this.events.emit('nextTask', data);
      }
    };

    const onDone = async (workflowId: string) => {
      if (workflowId === this.id) {
        PubSubManager.emitter.removeListener('done', onDone);
        PubSubManager.emitter.removeListener('nextTask', onNextTask);

        const result = await this.results();
        this.events.emit('done', result);
        if (this.options.cleanOnDone) {
          setTimeout(() => {
            this.clean();
          }, 1500);
        }

        this.events.removeListener('done', onDone);
        this.events.removeListener('nextTask', onNextTask);
      }
    };

    PubSubManager.emitter.on('done', onDone);
    PubSubManager.emitter.on('nextTask', onNextTask);
  }

  /**
   * Remove from redis
   */
  async #cleanByKey(key: string): Promise<void> {
    debug('cleanByKey', key);

    const deFlow = DeFlow.getInstance();
    const pattern = [key, '*'].join(':');

    await deFlow.client.del(key);

    return new Promise((resolve, reject) => {
      deFlow.client.keys(pattern, (err, keys) => {
        if (err) {
          return reject(err);
        }

        if (keys.length === 0) {
          return resolve();
        }

        // There is a bit of a delay between get/delete but it is unavoidable
        const delCommands = keys.map((k) => ['del', k]);
        deFlow.client.multi(delCommands).exec((delErr) => {
          if (delErr) {
            return reject(delErr);
          }
          return resolve();
        });
      });
    });
  }

  /**
   * Stringify method
   */
  toJSON(): WorkFlowJSON {
    return {
      id: this.id,
      name: this.name,
      queueId: this.list,
      options: this.options,
    };
  }
}
