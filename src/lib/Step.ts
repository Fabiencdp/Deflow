import slugify from 'slugify';

import Task from './Task';

import DeFlow from './index';
import { type } from 'os';

type HandlerFunction<D = unknown, R = unknown> = (
  taskData: Task<D>,
  step: Step<D, R>
) => Promise<R>;

export type Handler = string;

export type StepOptions = {
  taskConcurrency: number;
  taskMaxFailCount: number;
};

export type TaskDone<D = unknown, R = unknown> = Task<D, R> & {
  result: R;
};

export type JSONStep<D = unknown> = {
  id: string;
  name: string;
  index: number;

  handler: string;
  handlerFn?: string;
  taskCount: number;

  taskQueues: {
    pending: string;
    done: string;
  };

  queues: {
    pending: string;
    done: string;
  };

  options: StepOptions;
  workflowId: string;
};

export type AddStep<D = unknown, R = unknown, H = Handler> = {
  name: string;
  tasks: D[];
  options?: Partial<StepOptions>;
  handler: H;
  handlerFn?: string;
};

export interface CreateStep<D = unknown> {
  name: string;
  index: number;
  workflowId: string;
  queue: string;
  tasks: D[];
  handler: string;
  handlerFn?: string;
  options?: Partial<StepOptions>;
}

const defaultStepOptions: StepOptions = {
  taskMaxFailCount: 1,
  taskConcurrency: 1,
};

export default class Step<D = unknown, R = unknown> {
  public id: string;
  public index: number;
  public name: string;

  public workflowId: string;

  public handler: Handler;
  public handlerFn?: string;

  public taskCount: number;

  public queues = {
    pending: '',
    done: '',
  };

  public taskQueues = {
    pending: '',
    done: '',
  };

  public options = defaultStepOptions;

  private readonly flow: DeFlow;

  /**
   * Construct a step
   * @param step
   */
  constructor(step: JSONStep<D>) {
    this.id = step.id;
    this.name = step.name;
    this.index = step.index;

    this.workflowId = step.workflowId;
    this.queues = step.queues;

    this.taskCount = step.taskCount;
    this.taskQueues = step.taskQueues;

    this.handler = step.handler;
    this.handlerFn = step.handlerFn;

    this.options = step.options;

    this.flow = DeFlow.getInstance();
  }

  /**
   * Create task
   * @param stepData
   */
  public static create<D = unknown>(stepData: CreateStep<D>): Step<D> {
    const id = [stepData.workflowId, slugify(stepData.name)].join(':');

    // Create tasks
    const tasks = stepData.tasks.map((data) => Task.create({ stepId: id, data }));
    const taskCount = tasks.length;

    const taskQueues = {
      pending: [id, 'tasks'].join(':'),
      done: [id, 'done'].join(':'),
    };

    const queues = {
      pending: stepData.queue,
      done: [stepData.queue, 'done'].join(':'),
    };

    const { options: opts } = stepData;

    const options = {
      taskConcurrency: opts?.taskConcurrency || 1,
      taskMaxFailCount: opts?.taskMaxFailCount || 1,
    };

    const step = new Step<D>({ id, ...stepData, taskCount, taskQueues, queues, options });

    try {
      step.store(tasks);
    } catch (e) {
      console.log(e);
    }

    return step;
  }

  /**
   * Run the task
   * @param task
   */
  public async runTask(task: Task<D, R>): Promise<R> {
    let handler: HandlerFunction<D, R> | undefined;

    const { handlerFn } = this;

    // Dynamic import
    if (typeof this.handler === 'string') {
      let mod = await import(this.handler);

      if (handlerFn && typeof mod[handlerFn] === 'function') {
        mod = mod[handlerFn];
      } else {
        mod = mod.default;
      }

      if (handlerFn && typeof mod[handlerFn] === 'function') {
        handler = mod[handlerFn];
      } else {
        handler = mod;
      }
    }

    if (!handler || typeof handler !== 'function') {
      throw new Error("Can't resolve task handler function");
    }

    return handler(task, this);
  }

  /**
   * Get all done tasks
   */
  public async getTasks(): Promise<Task<D, R>[]> {
    DeFlow.log('getPrevious');

    return this.getTaskRange(0, 30);
  }

  /**
   * get previous step
   */
  public async getPrevious(): Promise<Step | undefined> {
    DeFlow.log('getPrevious');

    return new Promise((resolve) => {
      const max = `(${this.index}`;
      let min = this.index - 1;
      if (min < 0) {
        min = 0;
      }

      this.flow.queue.zrevrangebyscore(this.queues.done, max, min, (err, reply) => {
        if (err) {
          return resolve(undefined);
        }
        const [json] = reply;
        if (!json) {
          return resolve(undefined);
        }
        const jsonStep = JSON.parse(json) as JSONStep;
        return resolve(new Step(jsonStep));
      });
    });
  }

  /**
   * Get paginated results from done queue
   * @param start
   * @param stop
   * @param acc
   */
  private getTaskRange(
    start: number,
    stop: number,
    acc: TaskDone<D, R>[] = []
  ): Promise<TaskDone<D, R>[]> {
    return new Promise((resolve) => {
      this.flow.queue.lrange(this.taskQueues.done, start, stop, (err, reply) => {
        if (err) {
          // TODO:
          console.log(err);
          return resolve([]);
        }

        if (reply && reply.length > 0) {
          const items: TaskDone<D, R>[] = reply.reduce((a: TaskDone<D, R>[], str) => {
            a.push(JSON.parse(str) as TaskDone<D, R>);
            return a;
          }, []);

          acc = acc.concat(items);
          return resolve(this.getTaskRange(stop, stop + stop, acc));
        } else {
          return resolve(acc);
        }
      });
    });
  }

  public addAfter<D = unknown>(data: AddStep<D>): Step<D>;
  public addAfter<D = unknown>(data: AddStep<D>[]): Step<D>[];

  /**
   * add a new step after current one
   */
  public addAfter<D = unknown>(data: AddStep<D> | AddStep<D>[]): Step<D> | Step<D>[] {
    if (!Array.isArray(data)) {
      return this._addAfter(data);
    }

    const steps: Step<D>[] = [];
    data.forEach((d, index) => {
      if (index === 0) {
        steps.push(this._addAfter(d));
      } else {
        steps.push(steps[index - 1].addAfter(d));
      }
    });

    return steps;
  }

  /**
   * Add step after the current one
   * @param data
   * @private
   */
  private _addAfter<D = unknown>(data: AddStep<D>): Step<D> {
    const index = parseFloat((this.index + 0.1).toFixed(2));
    DeFlow.log('_addAfter', this.index, index);

    return Step.create({
      index,
      workflowId: this.workflowId,
      queue: this.queues.pending,
      ...data,
    });
  }

  /**
   * Store step and task
   * @param tasks
   */
  public async store(tasks: Task[]): Promise<void> {
    const promises = [];

    const jsonStep = JSON.stringify(this);
    promises.push(this.flow.queue.set(this.id, jsonStep));
    promises.push(this.flow.queue.zadd(this.queues.pending, this.index, jsonStep));

    tasks.forEach((task) => promises.push(this._lpush(task)));

    await Promise.all(promises);
  }

  private _lpush(task: Task): Promise<number> {
    DeFlow.log('_lpush', task.stepId);
    return new Promise((resolve) => {
      const jsonTask = JSON.stringify(task);
      this.flow.queue.lpush(this.taskQueues.pending, jsonTask, (err, reply) => {
        if (err) {
          console.log(err);
        }
        resolve(reply);
      });
    });
  }

  /**
   * Convert to json
   */
  public toJSON(): JSONStep {
    return {
      id: this.id,
      index: this.index,
      name: this.name,

      taskCount: this.taskCount,
      taskQueues: this.taskQueues,

      handler: this.handler,
      handlerFn: this.handlerFn,

      workflowId: this.workflowId,
      queues: this.queues,

      options: this.options,
    };
  }
}
