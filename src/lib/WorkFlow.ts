import Debug from 'debug';
import { generate } from 'short-uuid';
import Step, { AddStep, JSONStepListItem, StepOptions } from './Step';
import PubSubManager, { Action } from './PubSubManager';
import DeFlow from './index';

const debug = Debug('deflow:workflow');

export type WorkFlowJSON = {
  id: string;
  name: string;
  queueId: string;
  options: WorkFlowOption;
};

export type WorkFlowOption = Partial<StepOptions> & {
  ifExist: 'replace' | 'create';
};

const defaultOptions: WorkFlowOption = {
  ifExist: 'create',
};

export default class WorkFlow {
  public id: string;
  public name: string;
  public list: string;
  public options: WorkFlowOption;

  constructor(json: WorkFlowJSON) {
    this.id = json.id;
    this.name = json.name;
    this.list = json.queueId;
    this.options = json.options;
  }

  /**
   * Create and save new workflow
   * @param name
   * @param steps
   * @param opts
   */
  static async create(
    name: string,
    steps: AddStep[],
    opts: Partial<WorkFlowOption> = {}
  ): Promise<WorkFlow> {
    const id = [name, generate()].join(':');
    const queueId = [id, 'steps'].join(':');

    const options = { ...defaultOptions, ...opts };
    const workFlowInstance = new WorkFlow({ id, name, queueId, options });

    await workFlowInstance.#store();

    await steps.reverse().reduce(async (prev, data) => {
      await prev;
      await Step.create({ ...data, index: new Date().getTime(), workflowId: workFlowInstance.id });
    }, Promise.resolve());

    return workFlowInstance;
  }

  /**
   * Run a step by key
   * @param key
   */
  public static async runStep(key: string): Promise<void> {
    debug(`runStep ${key}`);

    const step = await Step.getByKey(key);
    if (!step) {
      throw new Error('Does not exist');
    }
    await step.runNextTask();
  }

  /**
   * Get workflow by id
   * @param workflowId
   */
  public static async getById(workflowId: string): Promise<WorkFlow | null> {
    debug(`getById ${workflowId}`);

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
        return resolve(new WorkFlow(workflowJson));
      });
    });
  }

  /**
   * get next step and run
   * Publish event
   * @param workflowId
   */
  public static async runNextStep(workflowId: string): Promise<void> {
    debug(`runNextStep ${workflowId}`);

    const workflow = await WorkFlow.getById(workflowId);
    if (!workflow) {
      debug('workflow does not exist');
      throw new Error('workflow does not exist');
    }

    const stepKey = await workflow.#getNextStep();
    if (stepKey) {
      await PubSubManager.publish({
        action: Action.NextStep,
        data: { workflowId, stepKey },
      });
      return WorkFlow.runStep(stepKey);
    } else {
      return workflow.#clean();
    }
  }

  /**
   * Run the workflow
   */
  public async run(): Promise<void> {
    return WorkFlow.runNextStep(this.id);
  }

  /**
   * Get the next step of the workflow
   */
  async #getNextStep(): Promise<string | null> {
    debug('getNextStep');

    const deFlow = DeFlow.getInstance();

    // Get step with the max score
    return new Promise<string | null>((resolve, reject) => {
      deFlow.client.zrevrange(this.list, 0, 0, async (err, reply) => {
        if (err) {
          return reject(err);
        }

        const [json] = reply;
        if (!json) {
          debug('empty workflow list');
          return resolve(null);
        }

        const jsonStep = JSON.parse(json) as JSONStepListItem;
        return resolve(jsonStep.key);
      });
    });
  }

  /**
   * Store in redis
   */
  async #store(): Promise<boolean> {
    debug('store');

    const deFlow = DeFlow.getInstance();

    if (this.options.ifExist === 'replace') {
      await this.#cleanByKey(this.name);
    }

    const data = JSON.stringify(this);
    return new Promise((resolve, reject) => {
      deFlow.client.set(this.id, data, (err, status) => {
        if (err) {
          return reject(err);
        }
        return resolve(true);
      });
    });
  }

  /**
   * Remove from redis
   */
  async #clean(): Promise<void> {
    debug('clean');
    return this.#cleanByKey(this.id);
  }

  /**
   * Remove from redis
   */
  async #cleanByKey(key: string): Promise<void> {
    debug('cleanByKey', key);

    const deFlow = DeFlow.getInstance();
    const pattern = [key, '*'].join(':');

    await deFlow.client.del(key);

    return new Promise((resolve, reject) => {
      deFlow.client.keys(pattern, (err, keys) => {
        if (err) {
          return reject(err);
        }

        if (keys.length === 0) {
          return resolve();
        }

        // There is a bit of a delay between get/delete but it is unavoidable
        deFlow.client.del(keys, (delErr) => {
          if (delErr) {
            return reject(delErr);
          }
          return resolve();
        });
      });
    });
  }

  toJSON(): WorkFlowJSON {
    return {
      id: this.id,
      name: this.name,
      queueId: this.list,
      options: this.options,
    };
  }
}
