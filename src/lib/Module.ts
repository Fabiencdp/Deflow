import Debug from 'debug';

import Step, { DeFlowStep, ESD, ETD } from './Step';

const debug = Debug('Module');

export type ModuleDefinition<T extends DeFlowStep> = {
  beforeAll?: (step: Step<ESD<T>>) => any | Promise<any>;
  handler?: (data: ETD<T>, step: Step<ESD<T>>) => any | Promise<any>;
};

export default class Module<T extends DeFlowStep> {
  handler: ModuleDefinition<T>['handler'];
  beforeAll: ModuleDefinition<T>['beforeAll'];

  /**
   * Create a task from json
   */
  constructor(def: ModuleDefinition<T>) {
    this.handler = def.handler;
    this.beforeAll = def.beforeAll;
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
