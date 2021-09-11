import Debug from 'debug';

import Step, { StepOptions } from './Step';
import Task from './Task';

const debug = Debug('Module');

export type StepHandlerDefinition<SD, TD, TR> = {
  name?: string;
  beforeAll?: (step: Step<SD, TD, TR>) => any | Promise<any>;
  handler?: (task: Task<TD, TR>, step: Step<SD, TD, TR>) => any | Promise<any>;
  afterEach?: (task: Task<TD, TR>, step: Step<SD, TD, TR>) => any | Promise<any>;
  afterAll?: (step: Step<SD, TD, TR>) => any | Promise<any>;
  onHandlerError?: (task: Task<TD, TR>, error: Error) => any | Promise<any>;
  options?: Partial<StepOptions>;
  options1: Partial<StepOptions>;
  data?: any;
  tasks?: any[];
};

export type StepHandlerDefinitionT<SD, TD, TR> = {
  name?: string;
  beforeAll?: (step: Step<SD, TD, TR>) => any | Promise<any>;
  handler?: (task: Task<TD, TR>, step: Step<SD, TD, TR>) => any | Promise<any>;
  afterEach?: (task: Task<TD, TR>, step: Step<SD, TD, TR>) => any | Promise<any>;
  afterAll?: (step: Step<SD, TD, TR>) => any | Promise<any>;
  onHandlerError?: (task: Task<TD, TR>, error: Error) => any | Promise<any>;
  options: Partial<StepOptions>;
  options1: Partial<StepOptions>;
  data?: any;
  tasks?: any[];
};

const defaultStepOptions: StepOptions = {
  taskTimeout: 0,
  taskConcurrency: 1,
  taskMaxFailCount: 1,
  taskFailRetryDelay: null,
};

class Test {
  public options1 = {
    cool: 1,
  };

  constructor(props: any) {
    // super(props);
  }
}

export default class StepHandler<SD = any, TD = any, TR = any> extends Test {
  public beforeAll?: StepHandlerDefinition<SD, TD, TR>['beforeAll'];
  public handler: StepHandlerDefinition<SD, TD, TR>['handler'];
  public afterEach?: StepHandlerDefinition<SD, TD, TR>['afterEach'];
  public afterAll?: StepHandlerDefinition<SD, TD, TR>['afterAll'];

  public options!: StepOptions;
  public tasks?: any[];
  public data?: any;

  public a: any;

  static b = 1;

  /**
   * Create a task from json
   */
  constructor(def: StepHandlerDefinition<SD, TD, TR>) {
    super(def);
    // this.name = def.name;

    // this.options1;
    this.a = 1;
    this.beforeAll = def.beforeAll;
    this.handler = def.handler;
    this.afterEach = def.afterEach;
    this.afterAll = def.afterAll;

    this.data = def.data;
    this.tasks = def.tasks;

    this.options = { ...defaultStepOptions, ...def.options };
  }

  /**
   * Helper to get the module path
   */
  public getPath(): string {
    const path = require.main?.children.pop()?.filename;
    if (!path) {
      throw new Error(`Can't resolve module`);
    }
    return path.replace(/.(js|ts)$/, '');
  }
}
