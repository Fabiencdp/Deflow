import Debug from 'debug';
import { uuid } from 'short-uuid';
import Step, { CreateStep, JSONStep } from './Step';
import PubSubManager, { Action } from './PubSubManager';
import DeFlow from './index';

const debug = Debug('WorkFlow');

export type WorkFlowJSON = {
  id: string;
  name: string;
  queueId: string;
};

export default class WorkFlow {
  public id: string;
  public name: string;

  public list: string;

  constructor(json: WorkFlowJSON) {
    this.id = json.id;
    this.name = json.name;
    this.list = json.queueId;
  }

  static async create(name: string, workFlowSteps: Omit<CreateStep, 'workFlowId' | 'index'>[]) {
    const id = uuid();
    const queueId = [id, 'steps'].join(':');

    const workFlowInstance = new WorkFlow({ id, name, queueId });

    await workFlowInstance.store();

    await workFlowSteps.reduce(async (prev, data, index) => {
      await prev;
      await Step.create({ ...data, index, workFlowId: workFlowInstance.id });
    }, Promise.resolve());

    return workFlowInstance;
  }

  private store(): Promise<boolean> {
    const deFlow = DeFlow.getInstance();
    const data = JSON.stringify(this);
    return new Promise((resolve) => {
      deFlow.client.set(this.id, data, (err, status) => {
        return resolve(true);
      });
    });
  }

  public async run() {
    console.log('run');
    await WorkFlow.nextStep(this.id);
    await PubSubManager.publish({ action: Action.NextStep, data: { workFlowId: this.id } });
  }

  public static async nextStep(workFlowId: string) {
    const deFlow = DeFlow.getInstance();

    const workflow = await WorkFlow.getById(workFlowId);

    // Get min
    deFlow.client.zrange(workflow.list, 0, 1, async (err, reply) => {
      const [json] = reply;
      if (!json) {
        console.log('NO MORE STEP TO DO!');
        // this._clean(workflowId);
        return;
      }
      const jsonStep = JSON.parse(json) as JSONStep;
      const step = new Step(jsonStep);

      await step.start();
    });
  }

  public static async getById(workFlowId: string): Promise<WorkFlow> {
    const deFlow = DeFlow.getInstance();

    return new Promise((resolve, reject) => {
      deFlow.client.get(workFlowId, (err, res) => {
        if (err || !res) {
          return reject(err?.message || 'Unknown error');
        }
        const workflowJson: WorkFlowJSON = JSON.parse(res);
        const workflow = new WorkFlow(workflowJson);
        return resolve(workflow);
      });
    });
  }

  toJSON(): WorkFlowJSON {
    return {
      id: this.id,
      name: this.name,
      queueId: this.list,
    };
  }
}
