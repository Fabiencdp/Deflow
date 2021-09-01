import Debug from 'debug';
import { generate } from 'short-uuid';

import Task, { JSONTask } from './Task';
import WorkFlow from './WorkFlow';

import DeFlow from './index';

const debug = Debug('deflow:step');

type HandlerFn = 'module' | 'beforeAll' | 'afterAll' | 'afterEach' | 'onHandlerError';

type BeforeAll<SD = any, D = any, R = any> = (step: Step<SD, D, R>) => Promise<void>;
type Handler<SD = any, D = any, R = any> = (
  task: Task<D, R>,
  step: Step<SD, D, R>
) => Promise<void | R>;

type BeforeAllOnly<SD = any, TD = any, TR = any> = {
  beforeAll: BeforeAll<SD, TD, TR>;
  handler?: Handler<SD, TD, TR>;
};

type HandlerOnly<SD = any, TD = any, TR = any> = {
  beforeAll?: BeforeAll<SD, TD, TR>;
  handler: Handler<SD, TD, TR>;
};

export type DeFlowStep<SD = any, TD = any, TR = any> = Partial<StepOptions> &
  (BeforeAllOnly<SD, TD, TR> | HandlerOnly<SD, TD, TR>) & {
    onHandlerError?: (task: Task<TD, TR>, error: Error) => Promise<void>;
    afterEach?: (task: Task<TD, TR>, step: Step<SD>) => Promise<void>;
    afterAll?: (step: Step<SD>) => Promise<void>;
    // Public types access: allow retrieve types by doing DeFlowStep['StepData']
    StepData?: SD;
    TaskData?: TD;
    TaskResult?: TR;
  };

export type ESD<T> = T extends DeFlowStep<infer SD> ? SD : never;
export type ETD<T> = T extends DeFlowStep<any, infer TD> ? TD : never;
export type ETR<T> = T extends DeFlowStep<any, any, infer TR> ? TR : never;

export type AddStep<T = any> = {
  name: string;
  data?: ESD<T>;
  tasks?: ETD<T>[];
  steps?: AddStep[];
  module: string;
  options?: Partial<StepOptions>;
};

export type CreateStep<SD = any, TD = any> = AddStep<DeFlowStep<SD, TD>> & {
  workflowId: string;
  moduleFn?: HandlerFn;
  parentKey?: string;
  index: number;
};

export type JSONStepListItem = {
  id: string;
  key: string;
  name: string;
  parentKey: string;
};

export type JSONStep<T = any> = {
  id: string;
  name: string;

  module: string;
  moduleFn?: HandlerFn;

  index: number;
  taskCount: number;

  data: ESD<T>;
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

export default class Step<SD = any, TD = any, TR = any> {
  public id: string;
  public name: string;
  public index: number;
  public data: SD;

  public module: string;
  public moduleFn?: HandlerFn;

  public taskCount: number;
  public options = defaultStepOptions;

  public workflowId: string;
  public key: string;
  public parentKey?: string;

  #deflow = DeFlow.getInstance();

  /**
   * @param json
   */
  constructor(json: JSONStep<DeFlowStep<SD, TD>>) {
    this.id = json.id;
    this.name = json.name;
    this.index = json.index;
    this.data = json.data;

    this.module = json.module;
    this.moduleFn = json.moduleFn;

    this.taskCount = json.taskCount;
    this.options = json.options;

    this.workflowId = json.workflowId;
    this.key = json.key;
    this.parentKey = json.parentKey;
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
      throw new Error('any workflow');
    }

    if (workFlow.options) {
      options = { ...options, ...workFlow.options };
    }

    if (data.options) {
      options = { ...options, ...data.options };
    }

    // Create step modules
    const module = await Step.getModule(data.module);
    if (!data.moduleFn) {
      if (typeof module.beforeAll === 'function') {
        await Step.create({
          ...data,
          name: [data.name, 'beforeAll'].join(':'),
          moduleFn: 'beforeAll',
          index: data.index + 0.1,
          parentKey: key,
          steps: undefined,
          tasks: [null],
        });
      }

      if (typeof module.afterAll === 'function') {
        await Step.create({
          ...data,
          name: [data.name, 'afterAll'].join(':'),
          moduleFn: 'afterAll',
          index: data.index - 0.1,
          parentKey: key,
          steps: undefined,
          tasks: [null],
        });
      }

      data.moduleFn = 'module';
    }

    if (module.taskTimeout) {
      options.taskTimeout = module.taskTimeout;
    }
    if (module.taskConcurrency) {
      options.taskConcurrency = module.taskConcurrency;
    }
    if (module.taskMaxFailCount) {
      options.taskMaxFailCount = module.taskMaxFailCount;
    }

    const stepInstance = new Step({
      id,
      key,
      index: data.index,
      name: data.name,
      module: data.module,
      data: data.data,
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
          return reject(err?.message || 'Unknown error');
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
   * TODO: temp implementation of method signature, refact it to make it work
   * Add Multiple steps after the current one
   */
  public async addAfter<T = any>(data: AddStep<T>[]): Promise<void>;
  public async addAfter<T = any>(...data: AddStep<T>[]): Promise<void>;
  public async addAfter<T = any, T2 = any>(...data: [AddStep<T>, AddStep<T2>]): Promise<void>;
  public async addAfter<T = any, T2 = any, T3 = any>(
    ...data: [AddStep<T>, AddStep<T2>, AddStep<T3>]
  ): Promise<void>;
  public async addAfter<T = any, T2 = any, T3 = any, T4 = any>(
    ...data: [AddStep<T>, AddStep<T2>, AddStep<T3>, AddStep<T4>]
  ): Promise<void>;
  public async addAfter<T = any, T2 = any, T3 = any, T4 = any, T5 = any>(
    ...data: [AddStep<T>, AddStep<T2>, AddStep<T3>, AddStep<T4>, AddStep<T5>]
  ): Promise<void>;
  public async addAfter<T = any, T2 = any, T3 = any, T4 = any, T5 = any, T6 = any>(
    ...data: [AddStep<T>, AddStep<T2>, AddStep<T3>, AddStep<T4>, AddStep<T5>, AddStep<T6>]
  ): Promise<void>;

  /**
   * @public
   * Add a step after the current one
   */
  public async addAfter<T = any>(data: AddStep<T>[] | AddStep<T>): Promise<void> {
    let steps = data;
    if (!Array.isArray(steps)) {
      steps = [steps];
    }
    return steps.reverse().reduce(async (prev, step) => {
      await prev;
      await this.#addAfter<T>(step);
    }, Promise.resolve());
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
   *
   */
  public async getResults(): Promise<Task[]> {
    return this.#getTaskRange(0, 100);
  }

  /**
   * Get current progress value
   */
  public async getPrevious(): Promise<Step | undefined> {
    debug('getPrevious');

    return new Promise((resolve) => {
      const max = `(${this.index}`;

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
    const { taskTimeout, taskMaxFailCount } = this.options;

    const task = await this.#getNextTask();
    if (!task) {
      return Promise.resolve();
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
    let dest = this.#taskDoneQueue;
    try {
      task.result = await this.#runTaskHandler(task);
    } catch (e) {
      const error = typeof e === 'string' ? new Error(e) : e.message;
      task.error = error;
      task.failedCount = task.failedCount + 1;

      // Retry failed task
      if (task.failedCount < taskMaxFailCount) {
        dest = this.#taskPendingQueue;
      }

      await this.#runOnHandlerError(task, error);
      await this.#taskFailRetryDelay();
    }

    // Push task to done/pending list
    const data = JSON.stringify(task);
    await this.#deflow.client.lpush(dest, data);
    await this.#deflow.client.zremrangebyscore('process-queue', score, score);

    // Run after each method
    if (this.moduleFn === 'module') {
      const module = await this.#getModule();
      if (module && typeof module.afterEach === 'function') {
        await module.afterEach(task, this);
      }
    }

    return this.#getNextTaskAndRun();
  }

  /**
   * @private
   */
  static async getModule(path: string): Promise<DeFlowStep> {
    try {
      const module: DeFlowStep = await import(path).then((m) => m.default);
      if (!module || (!module.handler && !module.beforeAll)) {
        throw new Error(`Module is not valid: ${path}`);
      }
      return module;
    } catch (e) {
      console.error(e.message);
      throw e;
    }
  }

  /**
   * @param stepData
   */
  async #addAfter<T = any>(stepData: AddStep<T>): Promise<Step<ESD<T>, ETD<T>>> {
    const index = new Date().getTime();
    return Step.create({
      ...stepData,
      index,
      workflowId: this.workflowId,
      parentKey: this.key,
    });
  }

  /**
   * Get the module from module
   */
  async #getModule(): Promise<DeFlowStep> {
    return Step.getModule(this.module);
  }

  /**
   * @private
   */
  async #runTaskHandler(task: Task): Promise<any> {
    const module = await this.#getModule();
    if (!module) {
      return Promise.reject('Invalid module');
    }

    let m: Promise<any>;
    const promises: Promise<Error | any>[] = [];

    // Set a timeout
    let timeout: NodeJS.Timeout;
    if (this.options.taskTimeout > 0) {
      promises.push(this.#runTaskHandlerTimeout());
    }

    // Get module fn
    if (this.moduleFn === 'afterAll' && typeof module.afterAll === 'function') {
      const step = await this.#getHandlerStep();
      m = module.afterAll(step);
    } else if (this.moduleFn === 'beforeAll' && typeof module.beforeAll === 'function') {
      const step = await this.#getHandlerStep();
      m = module.beforeAll(step);
    } else if (typeof module.handler === 'function') {
      m = module.handler(task, this);
    } else {
      return Promise.reject('Invalid module, missing method "module"');
    }

    promises.push(m);

    // Return the first resolved promise, timeout or result
    return new Promise((resolve, reject) => {
      Promise.race(promises)
        .then((res) => resolve(res))
        .catch((err) => reject(err))
        .finally(() => {
          if (timeout) {
            clearTimeout(timeout);
          }
        });
    });
  }

  /**
   * return step when using before/after module
   */
  async #getHandlerStep(): Promise<Step> {
    if (this.parentKey) {
      return Step.getByKey(this.parentKey);
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
    const module = await Step.getModule(this.module);
    if (typeof module.onHandlerError === 'function') {
      module.onHandlerError(task, error);
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

    this.#deflow.client.zrangebyscore(this.#list, this.index, this.index, async (err, reply) => {
      if (err) {
        throw new Error(`Step ${this.name} with score ${this.index} does not exist in store`);
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

    return new Promise((resolve, reject) => {
      this.#deflow.client.llen(this.#taskDoneQueue, (err, reply) => {
        if (reply !== this.taskCount) {
          debug(`${reply}/${this.taskCount} tasks not done`);
          return resolve(false);
        }

        debug(`step done: ${this.name}`);
        this.#deflow.client.zremrangebyscore(this.#list, this.index, this.index, () => {
          this.#deflow.client.zadd(this.#doneList, this.index, this.#toJSONListItem);
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
  async #getTaskRange(start: number, stop: number, acc: Task[] = []): Promise<Task[]> {
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
          return resolve(this.#getTaskRange(stop, stop + stop, acc));
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
      deFlow.client.zadd(this.#list, this.index, this.#toJSONListItem, (err, status) => {
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
      parentKey: this.parentKey,
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
      index: this.index,
      module: this.module,
      moduleFn: this.moduleFn,
      workflowId: this.workflowId,
      data: this.data,
      options: this.options,
      parentKey: this.parentKey,
      taskCount: this.taskCount,
    };
  }
}
