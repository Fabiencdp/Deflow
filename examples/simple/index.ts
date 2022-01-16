import DeFlow, { WorkFlow } from '../../src';

DeFlow.register({ connection: { host: 'localhost', port: 6379 } });

setTimeout(() => {
  createSimpleWorkflow();
}, 2000);

/**
 * Workflow test file
 */
async function createSimpleWorkflow(): Promise<void> {
  const workflow = WorkFlow.create('simple', { ifExist: 'replace', cleanOnDone: false })
    .addStep({ step: import('./steps/step-1') })
    .addStep({ step: import('./steps/step-2'), data: { someData: 'something' } })
    .run();

  workflow.on('done', (results) => {
    // console.log(results);
  });
}
