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
  const workflow = WorkFlow.create('simple', { ifExist: 'replace' })
    .addStep({ step: step1 })
    .addStep({ step: step2, data: { someData: 'something' } })
    .run();

  workflow.on('done', (results) => {
    console.log(results);
  });
}
