import Debug from 'debug';
import { generate } from 'short-uuid';

import Task, { JSONTask } from './Task';

import DeFlow from './index';
import WorkFlow from './WorkFlow';

const debug = Debug('deflow:step');

type TaskData = any;

type HandlerFn = 'handler' | 'beforeAll' | 'afterAll' | 'afterEach' | 'onHandlerError';

type HandlerModule = Partial<StepOptions> & {
  beforeAll?: (step: Step) => Promise<any>;
  handler: (task: Task, step: Step) => Promise<any>;
  onHandlerError?: (task: Task, error: Error) => Promise<any>;
  afterEach?: (task: Task, step: Step) => Promise<any>;
  afterAll?: (step: Step) => Promise<any>;
};

export type AddStep = {
  name: string;
  tasks?: TaskData[];
  data?: any;
  steps?: AddStep[];
  handler: string;
  options?: Partial<StepOptions>;
};

export type CreateStep = AddStep & {
  workflowId: string;
  handlerFn?: HandlerFn;
  parentKey?: string;
  index: number;
};

export type JSONStepListItem = {
  id: string;
  key: string;
  name: string;
  parentKey: string;
};

export type JSONStep = {
  id: string;
  name: string;

  handler: string;
  handlerFn?: HandlerFn;

  index: number;
  taskCount: number;

  data?: any;
  options: StepOptions;

  workflowId: string;
  key: string;
  parentKey?: string;
};

export type StepOptions = {
  taskTimeout: number;
  taskMaxFailCount: number;
  taskConcurrency: number;
};

const defaultStepOptions: StepOptions = {
  taskTimeout: 0,
  taskConcurrency: 1,
  taskMaxFailCount: 1,
};

export default class Step {
  public id: string;
  public name: string;
  public index: number;
  public data?: any;

  public handler: string;
  public handlerFn?: HandlerFn;

  public taskCount: number;
  public options = defaultStepOptions;

  public workflowId: string;
  public key: string;
  public parentKey?: string;

  #deflow = DeFlow.getInstance();

  /**
   * @param json
   */
  constructor(json: JSONStep) {
    this.id = json.id;
    this.name = json.name;
    this.index = json.index;
    this.data = json.data;

    this.handler = json.handler;
    this.handlerFn = json.handlerFn;

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
  static async create(data: CreateStep) {
    const id = generate();
    const key = [data.workflowId, id].join(':');

    let options = defaultStepOptions;

    // Get workflow default options
    const workFlow = await WorkFlow.getById(data.workflowId);
    if (!workFlow) {
      throw new Error('unknown workflow');
    }

    if (workFlow.options) {
      options = { ...options, ...workFlow.options };
    }

    if (data.options) {
      options = { ...options, ...data.options };
    }

    // Create step handlers
    const module = await Step.getModule(data.handler);
    if (!data.handlerFn) {
      if (typeof module.beforeAll === 'function') {
        await Step.create({
          ...data,
          name: [data.name, 'beforeAll'].join(':'),
          handlerFn: 'beforeAll',
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
          handlerFn: 'afterAll',
          index: data.index - 0.1,
          parentKey: key,
          steps: undefined,
          tasks: [null],
        });
      }

      data.handlerFn = 'handler';
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
      handler: data.handler,
      data: data.data,
      handlerFn: data.handlerFn,
      workflowId: data.workflowId,
      parentKey: data.parentKey,
      taskCount: 0,
      options,
    });

    await stepInstance.#store();

    if (data.tasks) {
      await stepInstance.addTasks(data.tasks);
    }

    if (data.steps) {
      await stepInstance.addAfter(data.steps);
    }

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

  public addAfter(stepData: AddStep[]): Promise<Step[]>;
  public addAfter(stepData: AddStep): Promise<Step>;

  /**
   * @public
   */
  public async addAfter(stepData: AddStep | AddStep[]): Promise<Step | Step[]> {
    let data: AddStep[] = [];
    if (!Array.isArray(stepData)) {
      data = [stepData];
    } else {
      data = stepData;
    }

    const results: Step[] = [];

    let created = this as Step;
    for await (let d of data.reverse()) {
      created = await created.#addAfter(d);
      results.push(created);
    }

    if (results.length === 1) {
      return results[0];
    }
    return results;
  }

  /**
   * Add task to the step handler
   */
  public async addTasks(tasks: TaskData[]): Promise<void> {
    let count = this.taskCount;
    await tasks.reduce(async (prev, taskData) => {
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
  async failTask(task: Task, error: Error) {
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
          percent: percent.toString().concat('%'),
        });
      });
    });
  }

  /**
   * Run the task
   * @private
   */
  public async runNextTask() {
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
    let lockArgs: [string, string, string?, number?] = [DeFlow.processLockKey, this.id];
    if (taskTimeout) {
      // Add a lock with +1000 ms to let the timeout script handle error first
      lockArgs.push('PX', taskTimeout + 1000);
    }

    await this.#deflow.client.sendCommand('SET', lockArgs);
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
    }

    // Push task to done/pending list
    const data = JSON.stringify(task);
    await this.#deflow.client.lpush(dest, data);
    await this.#deflow.client.zremrangebyscore('process-queue', score, score);

    // Run after each method
    if (this.handlerFn === 'handler') {
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
  static async getModule(path: string): Promise<HandlerModule> {
    try {
      const module: HandlerModule = await import(path).then((m) => m.default);
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
  async #addAfter(stepData: AddStep) {
    const index = new Date().getTime();
    return Step.create({ ...stepData, index, workflowId: this.workflowId, parentKey: this.key });
  }

  async #getModule() {
    return Step.getModule(this.handler);
  }

  /**
   * @private
   */
  async #runTaskHandler(task: Task): Promise<any> {
    return new Promise(async (resolve, reject) => {
      let handler: Promise<any>;
      const promises = [];

      // Set a timeout
      let timeout: NodeJS.Timeout;
      if (this.options.taskTimeout > 0) {
        promises.push(this.#runTaskHandlerTimeout());
      }

      // Get the parent step for specific handler
      let step;
      if (this.parentKey) {
        step = await Step.getByKey(this.parentKey);
      } else {
        step = this;
      }

      const module = await this.#getModule();
      if (!module) {
        return reject('Invalid module');
      }

      // Get handler fn
      if (this.handlerFn === 'afterAll' && typeof module.afterAll === 'function') {
        handler = module.afterAll(step);
      } else if (this.handlerFn === 'beforeAll' && typeof module.beforeAll === 'function') {
        handler = module.beforeAll(step);
      } else {
        handler = module.handler(task, step);
      }

      promises.push(handler);

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

  async #runOnHandlerError(task: Task, error: Error) {
    const module = await Step.getModule(this.handler);
    if (typeof module.onHandlerError === 'function') {
      module.onHandlerError(task, error);
    }
  }

  async #runTaskHandlerTimeout() {
    const { taskTimeout } = this.options;
    return new Promise((resolve, reject) => {
      setTimeout(() => reject(new Error('Task handler timeout')), taskTimeout);
    });
  }

  /**
   * @private
   */
  async #onDone() {
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

  get #taskPendingQueue() {
    return [this.key, 'pending'].join(':');
  }

  get #taskDoneQueue() {
    return [this.key, 'done'].join(':');
  }

  get #list() {
    return [this.workflowId, 'steps'].join(':');
  }

  get #doneList() {
    return [this.workflowId, 'steps-done'].join(':');
  }

  get #toJSONListItem(): string {
    return JSON.stringify({
      id: this.id,
      key: this.key,
      name: this.name,
      parentKey: this.parentKey,
    } as JSONStepListItem);
  }

  toJSON(): JSONStep {
    return {
      id: this.id,
      key: this.key,
      name: this.name,
      index: this.index,
      handler: this.handler,
      handlerFn: this.handlerFn,
      workflowId: this.workflowId,
      data: this.data,
      options: this.options,
      parentKey: this.parentKey,
      taskCount: this.taskCount,
    };
  }
}
