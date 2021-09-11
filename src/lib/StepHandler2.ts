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
  data?: any;
  tasks?: any[];
};

const defaultStepOptions: StepOptions = {
  taskTimeout: 0,
  taskConcurrency: 1,
  taskMaxFailCount: 1,
  taskFailRetryDelay: null,
};

// export function Shop(this: { options: { test: string }; construct(b: any): any }) {
//   this.options = { test: 'cool' };
//   this.construct = function (builder: any) {
//     return 'ok';
//   };
// }
//
// const shop = new Shop({});
// const carBuilder = new CarBuilder();
// const truckBuilder = new TruckBuilder();
// const car = shop.construct(carBuilder);
// const truck = shop.construct(truckBuilder);
//
// car.car.say();
// truck.say();

class T {
  t = 1;

  constructor(t = 1) {
    this.t = t;
  }
}

class C extends T {
  // options: Partial<StepOptions>;

  /**
   * @param t
   */
  constructor({ t = 1 }: { t: number }) {
    super(t);
    // this.options = t;
  }
}

const a = new C({
  t: this,
});

/**
 *
 * @param options
 * @param def
 * @constructor
 */
// export default function StepHandler2({
//   options = defaultStepOptions,
//   ...def
// }: Partial<StepOptions> & StepHandlerDefinition<any, any, any>) {
//   console.log('d', def);
// }

// export default class StepHandler2<SD = any, TD = any, TR = any> extends C {
//   public beforeAll?: StepHandlerDefinition<SD, TD, TR>['beforeAll'];
//   public handler: StepHandlerDefinition<SD, TD, TR>['handler'];
//   public afterEach?: StepHandlerDefinition<SD, TD, TR>['afterEach'];
//   public afterAll?: StepHandlerDefinition<SD, TD, TR>['afterAll'];
//
//   public options!: StepOptions;
//   public tasks?: any[];
//   public data?: any;
//
//   /**
//    * Create a task from json
//    */
//   constructor({ options = defaultStepOptions, ...def }) {
//     super(options);
//
//     this.beforeAll = def.beforeAll;
//     this.handler = def.handler;
//     this.afterEach = def.afterEach;
//     this.afterAll = def.afterAll;
//
//     this.data = def.data;
//     this.tasks = def.tasks;
//
//     this.options = { ...defaultStepOptions, ...options };
//   }
//
//   // static create(def: StepHandlerDefinition<any, any, any>) {
//   //   const i = new StepHandler2(def);
//   //   return i;
//   // }
//
//   /**
//    * Helper to get the module path
//    */
//   public getPath(): string {
//     const path = require.main?.children.pop()?.filename;
//     if (!path) {
//       throw new Error(`Can't resolve module`);
//     }
//     return path.replace(/.(js|ts)$/, '');
//   }
// }
