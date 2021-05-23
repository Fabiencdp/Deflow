import slugify from 'slugify';
import { generate } from 'short-uuid';

import Step, { DeFlowStep } from './Step';

import DeFlow from './index';

export type JSONWorkflow = {
  id: string;
  name: string;
  stepsQueue: string;
  workflowQueue: string;
};

export default class Workflow {
  public readonly id: string;
  public readonly name: string;

  public readonly stepsQueue: string;
  public readonly workflowQueue: string;

  private readonly flow: DeFlow;

  private flowSteps: DeFlowStep[] = [];

  /**
   * Construct a workflow
   * @param workflow
   */
  constructor(workflow: JSONWorkflow) {
    this.id = workflow.id;
    this.name = workflow.name;
    this.stepsQueue = workflow.stepsQueue;
    this.workflowQueue = workflow.workflowQueue;
    this.flow = DeFlow.getInstance();
  }

  /**
   * create and init a workflow
   * @param name
   * @param steps
   * @constructor
   */
  public static create(name: string, steps: DeFlowStep[]): Workflow {
    const slug = slugify(name);
    const id = ['wfw', slug, generate().slice(0, 5)].join(':');
    const stepsQueue = [id, 'steps'].join(':');
    const workflowQueue = [id, 'workflow'].join(':');
    const data = { id, name: slug, stepsQueue, workflowQueue };
    const workflow = new Workflow(data);
    workflow.flowSteps = steps;
    return workflow;
  }

  /**
   * Get a workflow by id
   * @param id
   */
  public static async get(id: string): Promise<Workflow> {
    return new Promise((resolve) => {
      const flow = DeFlow.getInstance();
      flow.queue.get([id, 'workflow'].join(':'), (err, reply) => {
        if (!reply) {
          throw new Error(`Can't find workflow ${id}`);
        }
        const workflowData = JSON.parse(reply);
        resolve(new Workflow(workflowData));
      });
    });
  }

  /**
   * Run the flow
   */
  public async run(): Promise<void> {
    DeFlow.log('run');
    await this.store();
    await this.initSteps();
    return this.flow.run(this.id);
  }

  /**
   *
   */
  private async initSteps(): Promise<void> {
    this.flowSteps.map((data, index) => {
      return Step.create({
        index,
        workflowId: this.id,
        queue: this.stepsQueue,
        ...data,
      });
    });
  }

  /**
   * save
   */
  private async store(): Promise<void> {
    await this.flow.queue.set([this.id, 'workflow'].join(':'), JSON.stringify(this));
  }

  /**
   * clean workflow
   */
  public async clean(): Promise<number> {
    const pattern = [this.id, '*'].join(':');
    DeFlow.log('deletePattern', pattern);

    return new Promise((resolve, reject) => {
      this.flow.queue.keys(pattern, (err, keys) => {
        if (err) {
          return reject(err);
        }

        if (keys.length) {
          // There is a bit of a delay between get/delete but it is unavoidable
          this.flow.queue.del(keys, (err1, reply) => {
            if (err) {
              return reject(err);
            }
            DeFlow.log('deletePatternCount', reply);
            return resolve(reply);
          });
        } else {
          return resolve(0);
        }
      });
    });
  }

  /**
   * Convert to json
   */
  public toJSON() {
    return {
      id: this.id,
      name: this.name,
      stepsQueue: this.stepsQueue,
      workflowQueue: this.workflowQueue,
    };
  }
}
