import Debug from 'debug';

import Step, { StepOptions } from './Step';
import Task from './Task';

const debug = Debug('deflow:StepHandler');

export type StepHandlerFn = 'module' | 'beforeAll' | 'afterAll' | 'afterEach' | 'onHandlerError';

export type StepHandlerDefinition<SD, TD, TR> = {
  beforeAll?: (step: Step<SD, TD, TR>) => void | Promise<void>;
  handler?: (task: Task<TD, TR>, step: Step<SD, TD, TR>) => TR | Promise<TR>;
  afterEach?: (task: Task<TD, TR | undefined>, step: Step<SD, TD, TR>) => void | Promise<void>;
  afterAll?: (step: Step<SD, TD, TR>) => void | Promise<void>;
  onHandlerError?: (
    task: Task<TD, TR>,
    step: Step<SD, TD, TR>,
    error: Error
  ) => void | Promise<void>;
  options?: Partial<StepOptions>;
  data?: SD;
  tasks?: TD[];
};

/**
 * StepHandler
 */
export default class StepHandler<SD = any, TD = any, TR = any> {
  public beforeAll?: StepHandlerDefinition<SD, TD, TR>['beforeAll'];
  public handler: StepHandlerDefinition<SD, TD, TR>['handler'];
  public afterEach?: StepHandlerDefinition<SD, TD, TR>['afterEach'];
  public afterAll?: StepHandlerDefinition<SD, TD, TR>['afterAll'];
  public onHandlerError?: StepHandlerDefinition<SD, TD, TR>['onHandlerError'];

  public options: StepHandlerDefinition<SD, TD, TR>['options'];
  public tasks?: StepHandlerDefinition<SD, TD, TR>['tasks'];
  public data?: StepHandlerDefinition<SD, TD, TR>['data'];

  public path: string;
  public cwdPath: string;
  public filename: string;

  /**
   * Create a task from json
   */
  constructor(def: StepHandlerDefinition<SD, TD, TR>) {
    this.beforeAll = def.beforeAll;
    this.handler = def.handler;
    this.afterEach = def.afterEach;
    this.afterAll = def.afterAll;
    this.onHandlerError = def.onHandlerError;

    this.data = def.data;
    this.tasks = def.tasks;

    this.options = def.options;

    const { cwdPath, filename, path } = this.getModuleInfo();
    this.path = path;
    this.filename = filename;
    this.cwdPath = cwdPath;
  }

  /**
   * Helper to get the module path
   */
  public getModuleInfo(): { path: string; filename: string; cwdPath: string } {
    const _prepareStackTrace = Error.prepareStackTrace;
    Error.prepareStackTrace = (_, stack) => stack;
    const stack = new Error().stack as unknown as NodeJS.CallSite[];
    Error.prepareStackTrace = _prepareStackTrace;

    const paths = stack
      .map((c) => c.getFileName())
      .filter(
        (s) =>
          s &&
          s.indexOf('internal/') === -1 &&
          s.indexOf('/node_modules/') === -1 &&
          s !== __filename
      ) as string[];

    if (paths.length === 0) {
      throw new Error(`Can't resolve module`);
    }

    const path = paths[0];
    const cleanPath = path.replace(/.(js|ts)$/, '');
    const filename = path.split('/').pop() || '';
    const cwdPath = cleanPath.replace(process.cwd(), '');
    return { path: cleanPath, cwdPath, filename };
  }
}
