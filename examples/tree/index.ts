import * as path from 'path';

import DeFlow, { WorkFlow } from '../../src';
import { step1Module } from './steps/step-1';
import Module from '../../src/lib/Module';
import StepHandler from '../../src/lib/StepHandler';
import step2 from '../simple/steps/step-2';

console.clear();

DeFlow.register({ connection: { host: 'localhost', port: 6379 } });

setTimeout(() => {
  createTreeWorkflow();
}, 2000);

/**
 * Workflow test file
 */
function createTreeWorkflow(): void {
  WorkFlow.create('w', [
    {
      name: 'step 1',
      module: step1Module,
      data: { toCreate: 1000 },
    },
    {
      name: 'step 2',
      module: step2,
    },
  ]).run();
}
