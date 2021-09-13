import * as path from 'path';

import DeFlow, { WorkFlow } from '../../src';

import step1 from './steps/step-1';
import step2 from './steps/step-2';

console.clear();

DeFlow.register({ connection: { host: 'localhost', port: 6379 } });

setTimeout(() => {
  createSimpleWorkflow();
}, 2000);

/**
 * Workflow test file
 */
async function createSimpleWorkflow(): Promise<void> {
  await WorkFlow.create('simple', { ifExist: 'replace' })
    .addStep(step1, {
      tasks: ['1.1', '2.4', '2.89', '10', '5'],
    })
    .addStep(step2, { data: { something: '' } })
    .run();
}
