import EventEmitter from 'events';

import { generate } from 'short-uuid';
import slugify from 'slugify';
import Debug from 'debug';

import { TypeSafeEventEmitter } from '../types';

import Step, { AddStep, JSONStepListItem, StepOptions } from './Step';
import PubSubManager, { Action, SignalDone, SignalNextTask, SignalThrow } from './PubSubManager';
import StepHandler from './StepHandler';
import Task, { JSONTask } from './Task';

import DeFlow from './index';

const debug = Debug('deflow:WorkFlow');

type WorkFlowStatus = 'pending' | 'running' | 'done';

export type WorkFlowJSON = {
  id: string;
  name: string;
  queueId: string;
  options: WorkFlowOption;
  status: WorkFlowStatus;
};

type WorkFlowOption = Partial<StepOptions> & {
  ifExist: 'replace' | 'create';
  cleanOnDone: boolean;
};

export type WorkFlowResult = WorkFlow & {
  steps: (Step & { tasks: Task[] })[];
};

type Events = {
  done: WorkFlowResult;
  error: Error;
  nextTask: {
    id: string;
    workflowId: string;
    stepKey: string;
    data: any;
  };
};

const defaultOptions: WorkFlowOption = {
  ifExist: 'create',
  cleanOnDone: true,
};

class WorkFlowEventEmitter extends (EventEmitter as new () => TypeSafeEventEmitter<Events>) {}

export default class WorkFlow extends WorkFlowEventEmitter {
  public id: string;
  public name: string;
  public options: WorkFlowOption;
  public status: WorkFlowStatus;

  /**
   * Temp in memory store
   */
  #addedSteps: AddStep[] = [];

  /**
   * redis queue key
   */
  #list: string;

  /**
   * Create a workflow from json
   * @param json
   */
  constructor(json: WorkFlowJSON) {
    super();

    this.id = json.id;
    this.name = json.name;
    this.options = json.options;
    this.status = json.status;
    this.#list = json.queueId;
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
    return new WorkFlow({ id, name, queueId, options, status: 'pending' });
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
   * Get workflows by name
   * @param name
   */
  public static async getByName(name: string): Promise<WorkFlow[]> {
    debug(`getByName ${name}`);

    const deFlow = DeFlow.getInstance();
    const key = `${slugify(name)}:*`;

    // TODO: zscan iterator, must upgrade redis
    const ids: string[] = await new Promise((resolve, reject) => {
      deFlow.client.keys(key, (err, res) => {
        if (err) {
          return reject(err);
        }
        const mainKeys = res.map((r) => r.split(':').slice(0, 2).join(':'));
        return resolve([...new Set(mainKeys)]);
      });
    });

    const results = await Promise.all(ids.map((id) => WorkFlow.getById(id).catch(() => null)));
    return results.filter((w) => w) as WorkFlow[]; // remove null
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
    let promise = Promise.resolve();
    if (this.options.ifExist === 'replace') {
      promise = this.#cleanWorkFlowById(this.name);
    }

    promise.then(() => {
      this.status = 'running';
      this.#store().then(async () => {
        if (this.#addedSteps.length > 0) {
          await this.#storeSteps();
        }

        this.#listenPubSubEvents();

        // Run workflow
        return WorkFlow.runNextStep(this.id);
      });
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

        const promises = res
          .map((jsonStep) => JSON.parse(jsonStep))
          .filter((jsonStep) => jsonStep.name.search(/:(after|before)All/i) === -1)
          .map(async (s) => {
            const step = await Step.getByKey(s.key);
            const tasks = await step.getResults();
            return { ...step, tasks };
          });

        Promise.all(promises).then((results) => {
          const steps = results as unknown as (Step & { tasks: Task[] })[]; // TODO: fix type
          return resolve({ ...this, steps });
        });
      });
    });
  }

  /**
   * Stop the current workflow
   * @param e
   */
  public async throwError(e?: Error): Promise<void> {
    let error = e;
    if (!error) {
      error = new Error('WorkFlow unknown error');
    }
    PubSubManager.publish<SignalThrow>({
      action: Action.Throw,
      data: { workflowId: this.id, error: error.message },
    });
    await this.clean();
  }

  /**
   * Remove from redis
   */
  public async clean(): Promise<void> {
    debug('clean');
    return this.#cleanWorkFlowById(this.id);
  }

  /**
   * Get the next step of the workflow
   */
  async #getNextStep(): Promise<string | null> {
    debug('getNextStep');

    const deFlow = DeFlow.getInstance();

    // Get step with the max score
    return new Promise<string | null>((resolve, reject) => {
      deFlow.client.zrevrange(this.#list, 0, 0, async (err, reply) => {
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
    const now = Date.now();
    await this.#addedSteps.reverse().reduce(async (prev: Promise<void | Step>, data, index) => {
      await prev;
      return Step.create({
        ...data,
        module: data.step,
        options: data.options,
        index: now + index,
        workflowId: this.id,
      });
    }, Promise.resolve());
  }

  /**
   * Register some events
   * TODO: better event management
   */
  #listenPubSubEvents(): void {
    const onNextTask = async (data: SignalNextTask['data']) => {
      if (data.workflowId === this.id) {
        this.emit('nextTask', data);
      }
    };

    const onDone = async (data: SignalDone['data']) => {
      if (data.workflowId === this.id) {
        PubSubManager.emitter.removeListener('done', onDone);
        PubSubManager.emitter.removeListener('nextTask', onNextTask);
        PubSubManager.emitter.removeListener('throw', onThrow);

        this.status = 'done';
        await this.#store();

        const result = await this.results();
        this.emit('done', result);

        if (this.options.cleanOnDone) {
          setTimeout(() => {
            this.clean();
          }, 1500);
        }

        this.removeListener('done', onDone);
        this.removeListener('nextTask', onNextTask);
        this.removeListener('error', onThrow);
      }
    };

    const onThrow = async (data: SignalThrow['data']) => {
      // Emit error event only if there is a subscribe on it
      if (data.workflowId === this.id && this.eventNames().includes('error')) {
        const error = new Error(data.error);
        this.emit('error', error);
      }
    };

    PubSubManager.emitter.on('done', onDone);
    PubSubManager.emitter.on('nextTask', onNextTask);
    PubSubManager.emitter.on('throw', onThrow);
  }

  /**
   * Remove from redis
   */
  async #cleanWorkFlowById(id: string): Promise<void> {
    debug('cleanWorkFlowById', id);
    const promises = [this.#cleanByKey(id), this.#cleanProcessQueueByKey(id)];
    await Promise.all(promises);
  }

  /**
   * Remove from redis
   */
  async #cleanByKey(key: string): Promise<void> {
    debug('cleanByKey', key);

    const deFlow = DeFlow.getInstance();
    const pattern = [key, '*'].join(':');

    await deFlow.client.del(key);

    return new Promise<void>((resolve, reject) => {
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
   * cleanProcessQueueByKey
   * @param key
   */
  async #cleanProcessQueueByKey(key: string): Promise<void> {
    debug('cleanProcessQueueByKey', key);

    const deFlow = DeFlow.getInstance();
    const pattern = [key, ':'].join('');

    return new Promise<void>((resolve, reject) => {
      deFlow.client.zrange(DeFlow.processQueue, 0, -1, 'WITHSCORES', (err, res) => {
        if (err) {
          return reject(err);
        }

        const toRm = res
          .reduce((acc: { score: string; data: JSONTask }[], r, i) => {
            if (i % 2 === 0) {
              acc.push({ data: JSON.parse(r), score: res[i + 1] });
            }
            return acc;
          }, [])
          .filter((g) => g.data.stepKey.indexOf(pattern) === 0);

        toRm
          .reduce(async (prev: Promise<boolean>, next) => {
            await prev;
            return deFlow.client.zremrangebyscore(DeFlow.processQueue, next.score, next.score);
          }, Promise.resolve(true))
          .then(() => resolve())
          .catch((e) => {
            console.log(e);
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
      queueId: this.#list,
      options: this.options,
      status: this.status,
    };
  }
}
