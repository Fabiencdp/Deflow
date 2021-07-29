import Debug from 'debug';
import { generate } from 'short-uuid';

import DeFlow from './index';

const debug = Debug('Task');

export type CreateTask<D = any> = {
  data: D;
  stepKey: string;
  queue: string;
};

export type JSONTask<D = any, R = any> = {
  id: string;
  data: D;
  failedCount: number;
  error?: string;
  result?: R;
  stepKey: string;
};

export default class Task<D = any, R = any> {
  public id: string;

  public data: D;
  public result?: R;

  public failedCount: number;
  public error?: string;
  public stepKey: string;

  /**
   * Create a task from json
   * @param json
   */
  constructor(json: JSONTask<D, R>) {
    this.id = json.id;
    this.data = json.data;

    this.failedCount = json.failedCount;
    this.error = json.error;
    this.result = json.result;

    this.stepKey = json.stepKey;
  }

  /**
   * Create a task
   * @param data
   */
  static async create<D = unknown, R = unknown>(data: CreateTask<D>): Promise<Task<D, R>> {
    const taskInstance = new Task<D, R>({
      id: generate(),
      data: data.data,
      failedCount: 0,
      stepKey: data.stepKey,
    });

    await taskInstance.store(data.queue);

    return taskInstance;
  }

  /**
   * @param queue
   */
  async store(queue: string): Promise<boolean> {
    const deFlow = DeFlow.getInstance();

    const data = JSON.stringify(this);
    return new Promise((resolve, reject) => {
      deFlow.client.rpush(queue, data, (err, added) => {
        if (err) {
          return reject(err);
        }
        return resolve(added > 0);
      });
    });
  }

  /**
   * Stringify method
   */
  toJSON(): JSONTask<D, R> {
    return {
      id: this.id,
      data: this.data,
      failedCount: this.failedCount,
      error: this.error,
      result: this.result,
      stepKey: this.stepKey,
    };
  }
}
