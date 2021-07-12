import Debug from 'debug';
import { uuid } from 'short-uuid';
import Task, { TaskJSON } from './Task';
import DeFlow from './index';
import PubSubManager, { Action } from './PubSubManager';

const debug = Debug('Step');

type TaskData = any;

type HandlerFn = 'beforeAll' | 'afterAll' | 'afterEach';

type HandlerModule = {
  beforeAll?: (step: Step) => Promise<any>;
  handler: (task: Task, step: Step) => Promise<any>;
  afterEach?: (task: Task, step: Step) => Promise<any>;
  afterAll?: (step: Step) => Promise<any>;
};

export type CreateStepPartial = {
  name: string;
  tasks: TaskData[];
  handler: string;
  options?: {
    taskConcurrency?: number;
    taskMaxFailCount?: number;
  };
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
  public handlerFn?: HandlerFn;
  public taskCount: number;

  public options = defaultStepOptions;

  public workflowId: string;
  public key: string;
  public parentKey?: string;

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

    const options = {
      taskConcurrency: opts?.taskConcurrency || 1,
      taskMaxFailCount: opts?.taskMaxFailCount || 1,
    };

    const stepInstance = new Step({
      id,
      name: data.name,
      index: data.index,
      handler: data.handler,
      handlerFn: data.handlerFn,
      workflowId: data.workflowId,
      key: [data.workflowId, id].join(':'),
      parentKey: data.parentKey,
      taskCount: data.tasks.length,
      options,
    });

    await stepInstance._store();

    // Create step handler
    if (!data.handlerFn) {
      // await stepInstance._createStepHandlers();
    }

    // Create tasks
    data.tasks.reduce(async (prev, taskData) => {
      await prev;
      await Task.create({
        stepId: stepInstance.id,
        workflowId: stepInstance.workflowId,
        data: taskData,
      });
    }, Promise.resolve());

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
   * Get current progress value
   */
  public async getProgress(): Promise<{ percent: string; total: number; done: number }> {
    const deFlow = DeFlow.getInstance();

    return new Promise((resolve) => {
      deFlow.client.llen(this.doneKey, (err, reply) => {
        if (err) {
          return resolve({ done: 0, total: 0, percent: '' });
        }

        const percent = ((reply / this.taskCount) * 100).toFixed(2);

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
    const deFlow = DeFlow.getInstance();
    const task = await this._getNextTask();

    if (!task) {
      return this._onTasksDone();
    }

    // Run the task
    let dest = 'done';
    try {
      task.result = await this._runTaskHandler(task);
    } catch (e) {
      task.error = e.message;
      task.failedCount = task.failedCount + 1;

      // Retry failed task
      if (task.failedCount < this.options.taskMaxFailCount) {
        dest = 'pending';
      }
    }

    // Push task to done/pending list
    const data = JSON.stringify(task);
    await deFlow.client.lpush([this.key, dest].join(':'), data);

    // Run after each method
    const module = await this._getModule();
    if (module && typeof module.afterEach === 'function') {
      await module.afterEach(task, this);
    }

    return this.runNextTask();
  }

  /**
   * @private
   */
  private async _getModule(): Promise<HandlerModule> {
    const module: HandlerModule = await import(this.handler).then((m) => m.default);
    if (!module || !module.handler) {
      throw new Error('Module is not valid');
    }
    return module;
  }

  /**
   * @private
   */
  private async _runTaskHandler(task: Task) {
    const module = await this._getModule();
    if (!module) {
      throw new Error('Invalid module');
    }

    if (this.handlerFn === 'afterAll' && typeof module.afterAll === 'function') {
      return module.afterAll(this);
    } else if (this.handlerFn === 'beforeAll' && typeof module.beforeAll === 'function') {
      return module.beforeAll(this);
    } else {
      return module.handler(task, this);
    }
  }

  /**
   * @private
   */
  private async _createStepHandlers() {
    const module = await this._getModule();

    if (typeof module.beforeAll === 'function' && !this.handlerFn) {
      console.log('add before');
      await this._addBefore({
        ...this,
        tasks: [null],
        handlerFn: 'beforeAll',
        name: [this.name, 'beforeAll'].join(':'),
      });
    }

    if (typeof module.afterAll === 'function' && !this.handlerFn) {
      await this.addAfter({
        ...this,
        tasks: [null],
        handlerFn: 'afterAll',
        name: [this.name, 'afterAll'].join(':'),
      });
    }
  }

  /**
   * @private
   */
  private async _addBefore(stepData: CreateStepPartial) {
    return Step.create({
      ...stepData,
      index: this.index - 0.01,
      workflowId: this.workflowId,
      parentKey: this.key,
    });
  }

  /**
   * @private
   */
  private async _store(): Promise<boolean[]> {
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
   * @private
   */
  private async _onTasksDone() {
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

          // Pop current step from the list
          await deFlow.client.sendCommand('ZPOPMIN', [list]);
          await deFlow.client.zadd(listDone, this.index, JSON.stringify(this));

          // Signal next step
          await PubSubManager.publish({
            action: Action.NextStep,
            data: { workflowId: this.workflowId },
          });
        });
      }
    });
  }

  /**
   * @private
   */
  private _getNextTask(): Promise<Task | null> {
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

  private get pendingKey() {
    return [this.key, 'pending'].join(':');
  }

  private get doneKey() {
    return [this.key, 'done'].join(':');
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
