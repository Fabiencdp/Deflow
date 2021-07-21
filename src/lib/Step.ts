import Debug from 'debug';
import { uuid } from 'short-uuid';
import Task, { TaskJSON } from './Task';
import DeFlow from './index';
import PubSubManager, { Action } from './PubSubManager';
import { throws } from 'assert';

const debug = Debug('Step');

type TaskData = any;

type HandlerFn = 'handler' | 'beforeAll' | 'afterAll' | 'afterEach' | 'onHandlerError';

type HandlerModule = Partial<StepOptions> & {
  beforeAll?: (step: Step) => Promise<any>;
  handler: (task: Task, step: Step) => Promise<any>;
  onHandlerError?: (task: Task, error: Error) => Promise<any>;
  afterEach?: (task: Task, step: Step) => Promise<any>;
  afterAll?: (step: Step) => Promise<any>;
};

export type CreateStepPartial = {
  name: string;
  tasks?: TaskData[];
  handler: string;
  options?: Partial<StepOptions>;
};

export type CreateStep = CreateStepPartial & {
  workflowId: string;
  handlerFn?: HandlerFn;
  parentKey?: string;
  index: number;
};

export type JSONStep = {
  id: string;
  name: string;

  handler: string;
  handlerFn?: HandlerFn;

  index: number;
  taskCount: number;

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
    const id = uuid();

    const { options: opts } = data;

    const options: StepOptions = {
      taskConcurrency: opts?.taskConcurrency || 1,
      taskMaxFailCount: opts?.taskMaxFailCount || 1,
      taskTimeout: opts?.taskTimeout || 0,
    };

    const key = [data.workflowId, id].join(':');

    // Create step handler
    const module = await Step.getModule(data.handler);

    if (!data.handlerFn) {
      if (typeof module.beforeAll === 'function') {
        await Step.create({
          ...data,
          name: [this.name, 'beforeAll'].join(':'),
          index: data.index - 0.001,
          handlerFn: 'beforeAll',
          parentKey: key,
          tasks: [null],
        });
      }

      if (typeof module.afterAll === 'function') {
        await Step.create({
          ...data,
          name: [this.name, 'afterAll'].join(':'),
          index: data.index + 0.001,
          handlerFn: 'afterAll',
          parentKey: key,
          tasks: [null],
        });
      }

      data.handlerFn = 'handler';
    }

    if (module.taskTimeout) {
      options.taskTimeout = module.taskTimeout;
    }

    if (module.taskMaxFailCount) {
      options.taskMaxFailCount = module.taskMaxFailCount;
    }

    const stepInstance = new Step({
      id,
      key,
      name: data.name,
      index: data.index,
      handler: data.handler,
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
  static async nextTask(stepKey: string): Promise<any> {
    const step = await Step.getByKey(stepKey);
    return step.runNextTask();
  }

  /**
   * @public
   */
  public addAfter(stepData: CreateStepPartial) {
    return Step.create({
      ...stepData,
      index: this.index + 0.01,
      workflowId: this.workflowId,
      parentKey: this.key,
    });
  }

  /**
   * Add task to the step handler
   */
  public async addTasks(tasks: TaskData[]): Promise<void> {
    let count = this.taskCount;
    await tasks.reduce(async (prev, taskData) => {
      await prev;
      count += 1;
      return Task.create({ queue: this.#taskPendingQueue, data: taskData });
    }, Promise.resolve());

    this.taskCount = count;
    return this.#update();
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
   * Run next task recursively
   */
  public async runNextTask(): Promise<any> {
    const task = await this.#getNextTask();
    if (!task) {
      return this.#onTasksDone();
    }

    // Run the task
    let dest = this.#taskDoneQueue;
    try {
      task.result = await this.#runTaskHandler(task);
    } catch (e) {
      const error = typeof e === 'string' ? new Error(e) : e.message;
      task.error = error;
      task.failedCount = task.failedCount + 1;

      // Retry failed task
      if (task.failedCount < this.options.taskMaxFailCount) {
        dest = this.#taskPendingQueue;
      }

      await this.#runOnHandlerError(task, error);
    }

    // Push task to done/pending list
    const data = JSON.stringify(task);
    await this.#deflow.client.lpush(dest, data);

    // Run after each method
    if (this.handlerFn === 'handler') {
      const module = await Step.getModule(this.handler);
      if (module && typeof module.afterEach === 'function') {
        await module.afterEach(task, this);
      }
    }

    return this.runNextTask();
  }

  /**
   * @private
   */
  static async getModule(path: string): Promise<HandlerModule> {
    const module: HandlerModule = await import(path).then((m) => m.default);
    if (!module || !module.handler) {
      throw new Error('Module is not valid');
    }
    return module;
  }

  /**
   * @private
   */
  async #runTaskHandler(task: Task): Promise<any> {
    return new Promise(async (resolve, reject) => {
      let handler: Promise<any>;

      const module = await Step.getModule(this.handler);
      if (!module) {
        return reject('Invalid module');
      }

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
  async #onTasksDone() {
    const list = this.#list;
    const listDone = this.#doneList;

    this.#deflow.client.zrangebyscore(list, this.index, this.index, (err, reply) => {
      if (err || reply.length === 0) {
        throw new Error(`Step index ${this.index} does not exist in store`);
      }

      const jsons = reply.map((r) => JSON.parse(r));
      const jsonStep: JSONStep = jsons.find((j) => j.id === this.id);

      if (!jsonStep) {
        throw new Error(`Step id ${this.id} does not exist in store`);
      }

      this.#deflow.client.llen(this.#taskDoneQueue, async (err, reply) => {
        if (reply === this.taskCount) {
          await this.#deflow.client.zremrangebyscore(list, this.index, this.index, () => {
            this.#deflow.client.zadd(listDone, this.index, JSON.stringify(jsonStep));
          });

          // Signal next step
          await PubSubManager.publish({
            action: Action.NextStep,
            data: { workflowId: this.workflowId },
          });
        }
      });
    });
  }

  /**
   * @private
   */
  #getNextTask(): Promise<Task | null> {
    return new Promise((resolve, reject) => {
      this.#deflow.client.lpop(this.#taskPendingQueue, (err, res) => {
        if (!res) {
          return resolve(null);
        }

        const taskJSON: TaskJSON = JSON.parse(res);
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

    const list = [this.workflowId, 'steps'].join(':');
    const id = [this.workflowId, this.id].join(':');

    const stepData = new Promise<boolean>((resolve) => {
      const data = JSON.stringify(this);
      deFlow.client.set(id, data, (err, status) => {
        return resolve(true);
      });
    });

    const queueData = new Promise<boolean>((resolve) => {
      const data = JSON.stringify({ id: this.id, key: this.key, parentKey: this.parentKey });
      deFlow.client.zadd(list, this.index, data, (err, status) => {
        return resolve(true);
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

  toJSON(): JSONStep {
    return {
      id: this.id,
      index: this.index,
      name: this.name,
      handler: this.handler,
      handlerFn: this.handlerFn,
      workflowId: this.workflowId,
      options: this.options,
      key: this.key,
      parentKey: this.parentKey,
      taskCount: this.taskCount,
    };
  }
}
