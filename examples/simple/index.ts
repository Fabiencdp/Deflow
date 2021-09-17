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
  const workflow = await WorkFlow.create('simple', { ifExist: 'replace' })
    .addStep({ step: step1 })
    .addStep({ step: step2, data: { someData: 'something' } })
    .run();

  workflow.events.on('done', (data) => {
    console.log('done 1');
    const workflow2 = WorkFlow.create('2', { ifExist: 'replace' })
      .addStep({ step: step1 })
      .addStep({ step: step2, data: { someData: 'something' } })
      .run();

    workflow2.events.on('done', (data) => {
      console.log('done 2');
    });
  });
}
