import Debug from 'debug';
import { uuid } from 'short-uuid';
import Step, { CreateStepPartial, JSONStep } from './Step';
import PubSubManager, { Action } from './PubSubManager';
import DeFlow from './index';

const debug = Debug('deflow:workflow');

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

  static async create(name: string, steps: CreateStepPartial[]) {
    const id = uuid();
    const queueId = [id, 'steps'].join(':');

    const workFlowInstance = new WorkFlow({ id, name, queueId });

    await workFlowInstance.#store();

    await steps.reduce(async (prev, data, index) => {
      await prev;
      await Step.create({ ...data, index, workflowId: workFlowInstance.id });
    }, Promise.resolve());

    return workFlowInstance;
  }

  public static async nextStep(workflowId: string) {
    debug('nextStep');

    const deFlow = DeFlow.getInstance();
    const workflow = await WorkFlow.getById(workflowId);
    if (!workflow) {
      debug('workflow does not exist');
      return;
    }

    // Get min
    deFlow.client.zrange(workflow.list, 0, 0, (err, reply) => {
      const [json] = reply;
      if (!json) {
        debug('empty workflow list');
        return workflow.#clean();
        return;
      }

      const jsonStep = JSON.parse(json) as JSONStep;

      return PubSubManager.publish({
        action: Action.NextTask,
        data: { workflowId: jsonStep.workflowId, stepKey: jsonStep.key },
      });
    });
  }

  public static async getById(workflowId: string): Promise<WorkFlow | null> {
    const deFlow = DeFlow.getInstance();

    return new Promise((resolve, reject) => {
      deFlow.client.get(workflowId, (err, res) => {
        if (err) {
          return reject(err?.message || 'Workflow Unknown error');
        }

        if (!res) {
          return resolve(null);
        }

        const workflowJson: WorkFlowJSON = JSON.parse(res);
        const workflow = new WorkFlow(workflowJson);
        return resolve(workflow);
      });
    });
  }

  public async run() {
    await PubSubManager.publish({ action: Action.NextStep, data: { workflowId: this.id } });
  }

  async #store(): Promise<boolean> {
    const deFlow = DeFlow.getInstance();
    const data = JSON.stringify(this);
    return new Promise((resolve) => {
      deFlow.client.set(this.id, data, (err, status) => {
        return resolve(true);
      });
    });
  }

  async #clean() {
    debug('clean');

    const deFlow = DeFlow.getInstance();
    const pattern = [this.id, '*'].join(':');

    await deFlow.client.del(this.id);

    return new Promise((resolve, reject) => {
      deFlow.client.keys(pattern, (err, keys) => {
        if (err) {
          return reject(err);
        }

        if (keys.length) {
          // There is a bit of a delay between get/delete but it is unavoidable
          deFlow.client.del(keys, (err1, reply) => {
            if (err) {
              return reject(err);
            }
            return resolve(reply);
          });
        } else {
          return resolve(0);
        }
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
