import Debug from 'debug';
import { generate } from 'short-uuid';
import slugify from 'slugify';

import Task, { JSONTask } from './Task';
import WorkFlow from './WorkFlow';
import StepHandler, { StepHandlerFn } from './StepHandler';
import PubSubManager, { Action } from './PubSubManager';

import DeFlow from './index';

const debug = Debug('deflow:Step');

type AddStepWithoutData<T extends StepHandler> = {
  step: T;
  tasks?: T['tasks'];
  options?: Partial<StepOptions>;
};

type AddStepWithData<T extends StepHandler> = AddStepWithoutData<T> & {
  data: T['data'];
};

export type AddStep<T extends StepHandler = any> = T['data'] extends undefined | void
  ? AddStepWithoutData<T>
  : AddStepWithData<T>;

export type CreateStep<SD = any, TD = any> = {
  name?: string;
  data?: SD;
  tasks?: TD[];
  options?: Partial<StepOptions>;
  module: StepHandler;
} & {
  workflowId: string;
  moduleFn?: StepHandlerFn;
  parentKey?: string;
  index: number;
};

export type JSONStepListItem = {
  id: string;
  key: string;
  name: string;
  parentKey: string;
};

export type JSONStep<SD = any> = {
  id: string;
  name: string;

  module: string;
  moduleFn?: StepHandlerFn;

  index: number;
  taskCount: number;

  data: SD;
  options: StepOptions;

  workflowId: string;
  key: string;
  parentKey?: string;
};

export type StepOptions = {
  taskTimeout: number;
  taskMaxFailCount: number;
  taskConcurrency: number;
  taskFailRetryDelay: number | null;
};

const defaultStepOptions: StepOptions = {
  taskTimeout: 0,
  taskConcurrency: 1,
  taskMaxFailCount: 1,
  taskFailRetryDelay: null,
};

/**
 * Step
 */
export default class Step<SD = any, TD = any, TR = any> {
  public id: string;
  public name: string; // TODO: private or remove
  public data: SD;
  public taskCount: number;
  public options = defaultStepOptions;
  public workflowId: string;
  public key: string;

  #index: number;
  #module: string;
  #moduleFn?: StepHandlerFn;
  #parentKey?: string;

  #added: { name: string; index: number }[] = [];

  #deflow = DeFlow.getInstance();

  /**
   * @param json
   */
  constructor(json: JSONStep<SD>) {
    this.id = json.id;
    this.name = json.name;
    this.data = json.data;

    this.#index = json.index;
    this.#module = json.module;
    this.#moduleFn = json.moduleFn;

    this.taskCount = json.taskCount;
    this.options = json.options;

    this.workflowId = json.workflowId;
    this.key = json.key;
    this.#parentKey = json.parentKey;
  }

  /**
   * Create a step
   * @static
   */
  static async create(data: CreateStep): Promise<Step> {
    const id = generate();
    const key = [data.workflowId, id].join(':');

    let options = defaultStepOptions;

    // Get workflow default options
    const workFlow = await WorkFlow.getById(data.workflowId);
    if (!workFlow) {
      throw new Error('Workflow does not exist');
    }

    if (workFlow.options) {
      options = { ...options, ...workFlow.options };
    }

    if (data.module.options) {
      options = { ...options, ...data.module.options };
    }

    if (data.options) {
      options = { ...options, ...data.options };
    }

    // Create step modules
    const { module, path, filename } = await Step.getModule(data.module);
    const name = slugify(data.name || filename);

    if (!data.moduleFn) {
      if (typeof module.beforeAll === 'function') {
        await Step.create({
          ...data,
          module,
          name: [name, 'beforeAll'].join(':'),
          moduleFn: 'beforeAll',
          index: data.index + 0.1,
          parentKey: key,
          tasks: [null],
        });
      }

      if (typeof module.afterAll === 'function') {
        await Step.create({
          ...data,
          module,
          name: [name, 'afterAll'].join(':'),
          moduleFn: 'afterAll',
          index: data.index - 0.1,
          parentKey: key,
          tasks: [null],
        });
      }

      data.moduleFn = 'module';
    }

    const stepInstance = new Step({
      id,
      key,
      name,
      index: data.index,
      data: data.data,
      module: path,
      moduleFn: data.moduleFn,
      workflowId: data.workflowId,
      parentKey: data.parentKey,
      taskCount: 0,
      options,
    });

    await stepInstance.#store();

    if (data.tasks) {
      await stepInstance.addTasks(data.tasks);
    }

    // TODO: implement
    // if (data.steps) {
    //   await stepInstance.addAfter(data.steps);
    // }

    return stepInstance;
  }

  /**
   * Get a step by key
   * @param key
   */
  public static async getByKey(key: string): Promise<Step> {
    const deFlow = DeFlow.getInstance();
    return new Promise((resolve, reject) => {
      deFlow.client.get(key, (err, res) => {
        if (err || !res) {
          return reject(err?.message || `Unknown step ${key}`);
        }
        const stepJSON: JSONStep = JSON.parse(res);
        const step = new Step(stepJSON);
        return resolve(step);
      });
    });
  }

  /**
   * run next task
   * @param stepKey
   */
  static async nextTask(stepKey: string): Promise<void> {
    debug('nextTask', stepKey);
    const step = await Step.getByKey(stepKey);
    return step.runNextTask();
  }

  /**
   * @public
   * Add a step after the current one
   */
  public async addAfter<T extends StepHandler>(params: AddStep<T>): Promise<Step> {
    const { options, tasks, step } = params;
    let data = undefined;
    if (params && 'data' in params) {
      data = params.data;
    }

    let index = new Date().getTime();

    // Re-define steps score when adding one by one
    if (this.#added.length > 0) {
      index = this.#added[this.#added.length - 1].index - 1;
    }

    const name = slugify([step.filename, index, this.#added.length].join('-'));
    this.#added.push({ name, index });

    return Step.create({
      index,
      options,
      data,
      tasks,
      name,
      module: step,
      workflowId: this.workflowId,
      parentKey: this.key,
    });
  }

  /**
   * Add task to the step module
   */
  public async addTasks(tasks: TD[]): Promise<void> {
    let count = this.taskCount;
    await tasks.reduce(async (prev: Promise<void | Task<TD>>, taskData) => {
      await prev;
      count += 1;
      return Task.create({ stepKey: this.key, queue: this.#taskPendingQueue, data: taskData });
    }, Promise.resolve());

    this.taskCount = count;
    return this.#update();
  }

  /**
   * Manually fail a task
   * @param task
   * @param error
   */
  async failTask(task: Task, error: Error): Promise<boolean> {
    task.error = error.message;
    task.failedCount = task.failedCount + 1;

    let dest = this.#taskPendingQueue;
    if (task.failedCount >= this.options.taskMaxFailCount) {
      dest = this.#taskDoneQueue;
    }

    return task.store(dest);
  }

  /**
   * On success
   * @param task
   */
  async #succeedTask(task: Task): Promise<void> {
    const data = JSON.stringify(task);
    await this.#deflow.client.lpush(this.#taskDoneQueue, data);
  }

  /**
   *
   */
  public async getResults(): Promise<(Task<TD, TR> & { result: TR })[]> {
    return this.#getTaskRange(0, 100) as Promise<(Task<TD, TR> & { result: TR })[]>;
  }

  /**
   * Get current progress value
   */
  public async getPrevious(): Promise<Step | undefined> {
    debug('getPrevious');

    return new Promise((resolve) => {
      const max = `(${this.#index}`;

      this.#deflow.client.send_command(
        'ZRANGE',
        [this.#doneList, max, '+inf', 'BYSCORE', 'LIMIT', 0, 3],
        (err, reply: string[]) => {
          if (err) {
            return resolve(undefined);
          }

          const json = reply
            .reverse()
            .map((str) => JSON.parse(str))
            .find((j: JSONStep) => !j.parentKey);

          if (!json) {
            return resolve(undefined);
          }

          return resolve(new Step(json));
        }
      );
    });
  }

  /**
   * Get current progress value
   */
  public async getProgress(): Promise<{ percent: string; total: number; done: number }> {
    return new Promise((resolve) => {
      this.#deflow.client.llen(this.#taskDoneQueue, (err, reply) => {
        if (err) {
          return resolve({ done: 0, total: 0, percent: '' });
        }

        let percent = '0';
        if (this.taskCount) {
          percent = ((reply / this.taskCount) * 100).toFixed(2);
        }

        return resolve({
          done: reply,
          total: this.taskCount,
          percent: percent.toString().concat('%').concat(` - ${reply}/${this.taskCount}`),
        });
      });
    });
  }

  /**
   * Run the task
   * @private
   */
  public async runNextTask(): Promise<void> {
    debug('runNextTask', this.name);

    let running = 0;
    const promises = [];
    while (running < this.options.taskConcurrency) {
      running = running + 1;
      promises.push(this.#getNextTaskAndRun());
    }

    await Promise.all(promises);

    // Update step when all task are done
    return this.#onDone();
  }

  /**
   * Run next task recursively
   */
  async #getNextTaskAndRun(): Promise<void> {
    const { taskTimeout } = this.options;

    const task = await this.#getNextTask();
    if (!task) {
      return Promise.resolve();
    }

    // Pub event
    if (this.#moduleFn === 'module') {
      PubSubManager.publish({
        action: Action.NextTask,
        data: { id: task.id, workflowId: this.workflowId, data: task.data, stepKey: task.stepKey },
      });
    }

    // Store in process queue, set a lock allow task requeue on node crash
    const score = new Date().getTime();
    const lockArgs: [string, string, string?, number?] = [DeFlow.processLockKey, this.id];
    if (taskTimeout) {
      // Add a lock with +1000 ms to let the timeout script handle error first
      lockArgs.push('PX', taskTimeout + 1000);
    }

    await this.#deflow.client.send_command('SET', lockArgs);
    await this.#deflow.client.zadd(DeFlow.processQueue, score, JSON.stringify(task));

    // Run the task
    try {
      task.error = undefined;
      task.result = await this.#runTaskHandler(task);
      await this.#succeedTask(task);
    } catch (e: any) {
      const error = typeof e === 'string' ? new Error(e) : e;
      await this.failTask(task, error);
      await this.#runOnHandlerError(task, error);
      await this.#taskFailRetryDelay();
    }

    await this.#deflow.client.zremrangebyscore(DeFlow.processQueue, score, score);

    // Run after each method
    if (this.#moduleFn === 'module') {
      const { module } = await this.#getModule();
      if (module && typeof module.afterEach === 'function') {
        await module.afterEach(task, this);
      }
    }

    return this.#getNextTaskAndRun();
  }

  /**
   * @private
   */
  static async getModule(
    path: string | StepHandler
  ): Promise<{ path: string; module: StepHandler; filename: string }> {
    try {
      // Fix js import by checking constructor name
      if (path instanceof StepHandler || path.constructor.name === 'StepHandler') {
        path = (path as StepHandler).path;
      }
      const filename = path.split('/').pop() || '';
      const module: StepHandler = await import(path).then((m) => m.default);
      if (!module || (!module.handler && !module.beforeAll)) {
        throw new Error(
          `Module does not exist at path: ${path}, did you forgot to export the step as default?`
        );
      }

      return { path, module, filename };
    } catch (e: any) {
      console.error(e.message);
      throw e;
    }
  }

  /**
   * Get the module from module
   */
  async #getModule(): Promise<{ module: StepHandler; path: string }> {
    return Step.getModule(this.#module);
  }

  /**
   * @private
   */
  async #runTaskHandler(task: Task): Promise<any> {
    const { module } = await this.#getModule();
    if (!module) {
      return Promise.reject('Invalid module');
    }

    let method: any | Promise<any>;
    const promises: Promise<Error | any>[] = [];

    // Set a timeout
    if (this.options.taskTimeout > 0) {
      promises.push(this.#runTaskHandlerTimeout());
    }

    // Get module fn
    if (this.#moduleFn === 'afterAll' && typeof module.afterAll === 'function') {
      const step = await this.#getHandlerStep();
      method = module.afterAll(step);
    } else if (this.#moduleFn === 'beforeAll' && typeof module.beforeAll === 'function') {
      const step = await this.#getHandlerStep();
      method = module.beforeAll(step);
    } else if (typeof module.handler === 'function') {
      method = module.handler(task, this);
    } else {
      return Promise.reject('Invalid module, missing method "module"');
    }

    promises.push(method);

    // Return the first resolved promise, timeout or result
    return new Promise((resolve, reject) => {
      Promise.race(promises)
        .then((res) => resolve(res))
        .catch((err) => reject(err));
    });
  }

  /**
   * return step when using before/after module
   */
  async #getHandlerStep(): Promise<Step> {
    if (this.#parentKey) {
      return Step.getByKey(this.#parentKey);
    } else {
      return this;
    }
  }

  /**
   * On module error
   * @param task
   * @param error
   */
  async #runOnHandlerError(task: Task, error: Error): Promise<any> {
    const { module } = await Step.getModule(this.#module);
    if (typeof module.onHandlerError === 'function') {
      module.onHandlerError(task, this, error);
    }
  }

  /**
   * Set a task timeout
   */
  async #runTaskHandlerTimeout(): Promise<Error> {
    const { taskTimeout } = this.options;
    return new Promise((resolve, reject) => {
      setTimeout(() => reject(new Error('Task module timeout')), taskTimeout);
    });
  }

  /**
   * Retry delay
   */
  async #taskFailRetryDelay(): Promise<void> {
    const { taskFailRetryDelay } = this.options;
    if (!taskFailRetryDelay) {
      return Promise.resolve();
    }
    return new Promise<void>((r) => setTimeout(() => r(), taskFailRetryDelay));
  }

  /**
   * @private
   */
  async #onDone(): Promise<void> {
    debug('onDone');

    this.#deflow.client.zrangebyscore(this.#list, this.#index, this.#index, async (err, reply) => {
      if (err) {
        throw new Error(`Step ${this.name} with score ${this.#index} does not exist in store`);
      }

      if (reply.length > 0) {
        // Make sure to delete the good one
        const jsons = reply.map((r) => JSON.parse(r));
        const jsonStep: JSONStep = jsons.find((j) => j.id === this.id);

        if (!jsonStep) {
          throw new Error(`Step id ${this.id} does not exist in store`);
        }

        const removed = await this.#removeIfDone();
        if (removed) {
          // Signal next step
          await WorkFlow.runNextStep(this.workflowId);
        }
      }
    });
  }

  /**
   * Check if items are all resolved
   */
  async #removeIfDone(): Promise<boolean> {
    debug('removeIfDone');

    return new Promise((resolve) => {
      this.#deflow.client.llen(this.#taskDoneQueue, (err, reply) => {
        if (reply !== this.taskCount) {
          debug(`${reply}/${this.taskCount} tasks not done`);
          return resolve(false);
        }

        debug(`step done: ${this.name}`);
        this.#deflow.client.zremrangebyscore(this.#list, this.#index, this.#index, () => {
          this.#deflow.client.zadd(this.#doneList, this.#index, this.#toJSONListItem);
          return resolve(true);
        });
      });
    });
  }

  /**
   * @private
   */
  async #getNextTask(): Promise<Task | null> {
    return new Promise((resolve, reject) => {
      this.#deflow.client.lpop(this.#taskPendingQueue, (err, res) => {
        if (err) {
          return reject(err);
        }
        if (!res) {
          return resolve(null);
        }

        const taskJSON: JSONTask = JSON.parse(res);
        const task = new Task(taskJSON);
        return resolve(task);
      });
    });
  }

  /**
   * Get paginated results from done queue
   * @param start
   * @param stop
   * @param acc
   */
  async #getTaskRange(
    start: number,
    stop: number,
    acc: Task<TD, TR>[] = []
  ): Promise<Task<TD, TR>[]> {
    return new Promise((resolve, reject) => {
      this.#deflow.client.lrange(this.#taskDoneQueue, start, stop, (err, reply) => {
        if (err) {
          return reject(err);
        }

        if (reply && reply.length > 0) {
          const items: Task[] = reply.reduce((a: Task[], str) => {
            a.push(JSON.parse(str) as Task);
            return a;
          }, []);

          acc = acc.concat(items);
          return resolve(this.#getTaskRange(stop + 1, stop * 2, acc));
        } else {
          return resolve(acc);
        }
      });
    });
  }

  /**
   * @private
   */
  async #store(): Promise<boolean[]> {
    const deFlow = DeFlow.getInstance();

    const id = [this.workflowId, this.id].join(':');

    const stepData = new Promise<boolean>((resolve, reject) => {
      const data = JSON.stringify(this);
      deFlow.client.set(id, data, (err, status) => {
        if (err) {
          return reject(err);
        }
        return resolve(status === 'OK');
      });
    });

    const queueData = new Promise<boolean>((resolve, reject) => {
      deFlow.client.zadd(this.#list, this.#index, this.#toJSONListItem, (err, status) => {
        if (err) {
          return reject(err);
        }
        return resolve(!!status);
      });
    });

    return Promise.all([queueData, stepData]);
  }

  /**
   * Update current step in the redis store
   */
  async #update(): Promise<void> {
    const id = [this.workflowId, this.id].join(':');
    const data = JSON.stringify(this);
    await this.#deflow.client.set(id, data);
  }

  /**
   *
   */
  get #taskPendingQueue(): string {
    return [this.key, 'pending'].join(':');
  }

  /**
   *
   */
  get #taskDoneQueue(): string {
    return [this.key, 'done'].join(':');
  }

  /**
   *
   */
  get #list(): string {
    return [this.workflowId, 'steps'].join(':');
  }

  /**
   *
   */
  get #doneList(): string {
    return [this.workflowId, 'steps-done'].join(':');
  }

  /**
   * Minimal step item for list store
   */
  get #toJSONListItem(): string {
    return JSON.stringify({
      id: this.id,
      key: this.key,
      name: this.name,
      parentKey: this.#parentKey,
    } as JSONStepListItem);
  }

  /**
   * Stringify method
   */
  toJSON(): JSONStep {
    return {
      id: this.id,
      key: this.key,
      name: this.name,
      workflowId: this.workflowId,
      data: this.data,
      options: this.options,
      taskCount: this.taskCount,

      index: this.#index,
      module: this.#module,
      moduleFn: this.#moduleFn,
      parentKey: this.#parentKey,
    };
  }
}
