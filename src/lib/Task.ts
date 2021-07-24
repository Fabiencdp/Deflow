import Debug from 'debug';
import { uuid } from 'short-uuid';
import DeFlow from './index';

const debug = Debug('Task');

export type CreateTask = {
  data: any[];
  queue: string;
};

export type TaskJSON = {
  id: string;
  data: any;
  failedCount: number;
  error?: string;
  result?: any; // TODO: type
};

export default class Task<D = unknown, R = unknown> {
  public id: string;
  public data: any;

  public failedCount: number;

  public error?: string;
  public result?: any; // TODO: type

  constructor(json: TaskJSON) {
    this.id = json.id;
    this.data = json.data;

    this.failedCount = json.failedCount;
    this.error = json.error;
    this.result = json.result;
  }

  static async create(data: CreateTask): Promise<Task> {
    const taskInstance = new Task({
      id: uuid(),
      data: data.data,
      failedCount: 0,
    });

    await taskInstance.#store(data.queue);

    return taskInstance;
  }

  #store(queue: string): Promise<boolean> {
    const deFlow = DeFlow.getInstance();

    const data = JSON.stringify(this);
    return new Promise((resolve) => {
      deFlow.client.rpush(queue, data, (err, status) => {
        return resolve(true);
      });
    });
  }

  toJSON(): TaskJSON {
    return {
      id: this.id,
      data: this.data,
      failedCount: this.failedCount,
      error: this.error,
      result: this.result,
    };
  }
}
