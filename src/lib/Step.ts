import Debug from 'debug';

import StepHandler, { StepOptions } from './StepHandler';
import Task from './Task';

const debug = Debug('deflow:Step');

export type HandlerFn = 'module' | 'beforeAll' | 'afterAll' | 'afterEach' | 'onHandlerError';

export type StepProps<SD, TD, TR> = {
  beforeAll?: (step: StepHandler<SD, TD, TR>) => void | Promise<void>;
  handler?: (task: Task<TD, TR>, step: StepHandler<SD, TD, TR>) => TR | Promise<TR>;
  afterEach?: (
    task: Task<TD, TR | undefined>,
    step: StepHandler<SD, TD, TR>
  ) => void | Promise<void>;
  afterAll?: (step: StepHandler<SD, TD, TR>) => void | Promise<void>;
  onHandlerError?: (
    task: Task<TD, TR>,
    step: StepHandler<SD, TD, TR>,
    error: Error
  ) => void | Promise<void>;
  options?: Partial<StepOptions>;
  data?: SD;
  tasks?: TD[];
};

/**
 * Step Class
 * Public class to create a step
 */
export default class Step<SD = any, TD = any, TR = any> {
  public beforeAll?: StepProps<SD, TD, TR>['beforeAll'];

  public handler: StepProps<SD, TD, TR>['handler'];
  public afterEach?: StepProps<SD, TD, TR>['afterEach'];
  public afterAll?: StepProps<SD, TD, TR>['afterAll'];
  public onHandlerError?: StepProps<SD, TD, TR>['onHandlerError'];

  public options: StepProps<SD, TD, TR>['options'];
  public tasks?: StepProps<SD, TD, TR>['tasks'];
  public data?: StepProps<SD, TD, TR>['data'];

  public path: string;
  public filename: string;

  /**
   * Step file definition
   */
  constructor(def: StepProps<SD, TD, TR>) {
    debug('new Step instance');

    this.beforeAll = def.beforeAll;
    this.handler = def.handler;
    this.afterEach = def.afterEach;
    this.afterAll = def.afterAll;
    this.onHandlerError = def.onHandlerError;

    this.data = def.data;
    this.tasks = def.tasks;

    this.options = def.options;

    const { filename, path } = this.getModuleInfo();
    this.path = path;
    this.filename = filename;
  }

  /**
   * Helper to get the module path
   */
  public getModuleInfo(): { path: string; filename: string } {
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

    return { path: cleanPath, filename };
  }
}
