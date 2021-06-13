import slugify from 'slugify';
import { generate } from 'short-uuid';

import Step, { AddStep } from './Step';

import DeFlow from './index';
import Debug from 'debug';

export type JSONWorkflow = {
  id: string;
  name: string;
  stepsQueue: string;
  workflowQueue: string;
};

const debug = Debug('deflow:workflow');

export default class Workflow {
  public readonly id: string;
  public readonly name: string;

  public readonly stepsQueue: string;
  public readonly workflowQueue: string;

  private readonly _flow: DeFlow;

  /**
   * Temp in memory steps manager
   */
  private _steps: AddStep[] = [];

  /**
   * Construct a workflow
   * @param workflow
   */
  constructor(workflow: JSONWorkflow, steps: AddStep[] = []) {
    this.id = workflow.id;
    this.name = workflow.name;
    this.stepsQueue = workflow.stepsQueue;
    this.workflowQueue = workflow.workflowQueue;
    this._steps = steps;

    this._flow = DeFlow.getInstance();
  }

  /**
   * create and init a workflow
   * @param name
   * @param steps
   * @constructor
   */
  public static create(name: string, steps: AddStep[]): Workflow {
    const slug = slugify(name);
    const id = [DeFlow.prefix, slug, generate().slice(0, 5)].join(':');
    const stepsQueue = [id, 'steps'].join(':');
    const workflowQueue = [id, 'workflow'].join(':');
    const data: JSONWorkflow = { id, name: slug, stepsQueue, workflowQueue };

    return new Workflow(data, steps);
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
    debug('run');
    await this.store();
    await this.createSteps();
    return this._flow.run(this.id);
  }

  /**
   *
   */
  private async createSteps(): Promise<void> {
    await this._steps.reduce(async (prev: Promise<any>, data, index) => {
      await prev;
      return Step.create({
        index,
        workflowId: this.id,
        queue: this.stepsQueue,
        ...data,
      });
    }, Promise.resolve());
  }

  /**
   * save
   */
  private async store(): Promise<boolean> {
    return this._flow.queue.set(this.workflowQueue, JSON.stringify(this));
  }

  /**
   * clean workflow
   */
  public async clean(): Promise<number> {
    const pattern = [this.id, '*'].join(':');

    debug('deletePattern', pattern);

    return new Promise((resolve, reject) => {
      this._flow.queue.keys(pattern, (err, keys) => {
        if (err) {
          return reject(err);
        }

        if (keys.length) {
          // There is a bit of a delay between get/delete but it is unavoidable
          this._flow.queue.del(keys, (err1, reply) => {
            if (err) {
              return reject(err);
            }
            debug('deletePatternCount', reply);
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
