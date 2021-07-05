import Debug from 'debug';
import StepManager from './StepManager';
import { uuid } from 'short-uuid';
import Task from './Task';

const debug = Debug('Step');

export type CreateStep = {
  name: string;
  tasks: any[];
  handler: string;
  index: number;

  workFlowId: string;
};

export type StepJSON = {
  id: string;
  name: string;
  handler: string;
  index: number;

  workflowId: string;
};

export default class Step {
  public id: string;
  public name: string;
  public index: number;
  public handler: string;

  public workflowId: string;

  constructor(json: StepJSON) {
    this.id = json.id;
    this.name = json.name;
    this.index = json.index;
    this.handler = json.handler;

    this.workflowId = json.workflowId;
  }

  static async create(data: CreateStep) {
    const stepInstance = new Step({
      id: uuid(),
      name: data.name,
      index: data.index,
      handler: data.handler,
      workflowId: data.workFlowId,
    });

    await StepManager.store(stepInstance);

    // Create tasks
    data.tasks.reduce(async (prev, taskData) => {
      await prev;
      await Task.create({
        stepId: stepInstance.id,
        workFlowId: stepInstance.workflowId,
        data: taskData,
      });
    }, Promise.resolve());

    return stepInstance;
  }

  toJSON(): StepJSON {
    return {
      id: this.id,
      index: this.index,
      name: this.name,
      handler: this.handler,
      workflowId: this.workflowId,
    };
  }
}
