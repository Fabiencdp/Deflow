import DeFlow from './index';
import Step, { JSONStep } from './Step';
import Debug from 'debug';

export type JSONTask<D = unknown, R = unknown> = {
  data: D;
  stepId: string;

  failedCount: number;
  error: string | undefined;

  result: R | undefined;
};

type CreateTask<D = unknown> = {
  data: D;
  stepId: string;
};

const debug = Debug('deflow:task');

export default class Task<D = unknown, R = unknown> {
  public data: D;
  public stepId: string;

  public failedCount: number;
  public error: string | undefined;

  public result: R | undefined;

  /**
   * Construct a task
   * @param data
   */
  constructor(data: JSONTask<D, R>) {
    this.data = data.data;
    this.stepId = data.stepId;
    this.result = data.result;

    this.error = data.error;
    this.failedCount = data.failedCount;
  }

  /**
   * @param data
   */
  public static create<D = unknown, R = unknown>(data: CreateTask<D>): Task<D, R> {
    debug('create', data.stepId);

    const taskData: JSONTask<D, R> = {
      failedCount: 0,
      error: undefined,
      data: data.data,
      stepId: data.stepId,
      result: undefined,
    };

    return new Task(taskData);
  }

  /**
   * get task step
   */
  public getStep(): Promise<Step> {
    return new Promise((resolve, reject) => {
      const flow = DeFlow.getInstance();
      flow.queue.get(this.stepId, (err, reply) => {
        if (!reply) {
          return reject(new Error('Step does not exists'));
        }
        const jsonStep = JSON.parse(reply) as JSONStep;
        return resolve(new Step(jsonStep));
      });
    });
  }

  /**
   * Convert to json
   */
  public toJSON(): JSONTask<D, R> {
    return {
      data: this.data,
      stepId: this.stepId,
      result: this.result,

      error: this.error,
      failedCount: this.failedCount,
    };
  }
}
