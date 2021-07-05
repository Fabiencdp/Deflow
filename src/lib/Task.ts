import Debug from 'debug';
import StepManager from './StepManager';
import { uuid } from 'short-uuid';
import TaskManager from './TaskManager';

const debug = Debug('Task');

export type CreateTask = {
  data: any[];
  workFlowId: string;
  stepId: string;
};

export type TaskJSON = {
  id: string;
  data: any;

  workFlowId: string;
  stepId: string;
};

export default class Step {
  public id: string;
  public data: any;

  public workFlowId: string;
  public stepId: string;

  constructor(json: TaskJSON) {
    this.id = json.id;
    this.data = json.data;

    this.stepId = json.stepId;
    this.workFlowId = json.workFlowId;
  }

  static async create(data: CreateTask) {
    const taskInstance = new Step({
      id: uuid(),
      data: data.data,
      stepId: data.stepId,
      workFlowId: data.workFlowId,
    });

    await TaskManager.store(taskInstance);

    return taskInstance;
  }

  toJSON(): TaskJSON {
    return {
      id: this.id,
      data: this.data,
      stepId: this.stepId,
      workFlowId: this.workFlowId,
    };
  }
}
