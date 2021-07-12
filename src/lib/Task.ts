import Debug from 'debug';
import { uuid } from 'short-uuid';
import DeFlow from './index';

const debug = Debug('Task');

export type CreateTask = {
  data: any[];
  workflowId: string;
  stepId: string;
};

export type TaskJSON = {
  id: string;
  data: any;

  workflowId: string;
  stepId: string;
};

export default class Task {
  public id: string;
  public data: any;

  public workflowId: string;
  public stepId: string;

  public result: any; // TODO
  public failedCount = 0;
  public error?: string;

  constructor(json: TaskJSON) {
    this.id = json.id;
    this.data = json.data;

    this.stepId = json.stepId;
    this.workflowId = json.workflowId;
  }

  static async create(data: CreateTask) {
    const taskInstance = new Task({
      id: uuid(),
      data: data.data,
      stepId: data.stepId,
      workflowId: data.workflowId,
    });

    await taskInstance.store();

    return taskInstance;
  }

  private store(): Promise<boolean> {
    const deFlow = DeFlow.getInstance();

    const id = [this.workflowId, this.stepId, 'pending'].join(':');
    const data = JSON.stringify(this);

    return new Promise((resolve) => {
      deFlow.client.rpush(id, data, (err, status) => {
        return resolve(true);
      });
    });
  }

  toJSON(): TaskJSON {
    return {
      id: this.id,
      data: this.data,
      stepId: this.stepId,
      workflowId: this.workflowId,
    };
  }
}
