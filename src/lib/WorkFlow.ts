import Debug from 'debug';
import WorkFlowManager from './WorkFlowManager';
import { uuid } from 'short-uuid';
import Step, { CreateStep } from './Step';
import PubSubManager, { Action } from './PubSubManager';

const debug = Debug('WorkFlow');

export type JSONWorkFlow = {
  id: string;
  name: string;
};

export default class WorkFlow {
  public id: string;
  public name: string;

  constructor(json: JSONWorkFlow) {
    this.id = json.id;
    this.name = json.name;
  }

  static async create(name: string, workFlowSteps: Omit<CreateStep, 'workFlowId' | 'index'>[]) {
    const workFlowInstance = new WorkFlow({ id: uuid(), name });

    await WorkFlowManager.store(workFlowInstance);

    await workFlowSteps.reduce(async (prev, data, index) => {
      await prev;
      await Step.create({ ...data, index, workFlowId: workFlowInstance.id });
    }, Promise.resolve());

    return workFlowInstance;
  }

  public async run() {
    console.log('run');
    await PubSubManager.signal({ action: Action.Run, data: { workFlowId: this.id } });
  }

  public async nextStep() {
    await WorkFlowManager.getNextStep();
  }

  toJSON(): JSONWorkFlow {
    return {
      id: this.id,
      name: this.name,
    };
  }
}
