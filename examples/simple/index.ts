import DeFlow, { WorkFlow } from '../../src';

DeFlow.register({ connection: { host: 'localhost', port: 6379 } });

setTimeout(() => {
  createSimpleWorkflow();
}, 2000);

/**
 * Workflow test file
 */
async function createSimpleWorkflow(): Promise<void> {
  const workflow = WorkFlow.create('simple', { ifExist: 'replace' })
    .addStep({ step: import('./steps/step-1') })
    .addStep({ step: import('./steps/step-2'), data: { someData: 'something' } })
    .run();

  setTimeout(() => {
    workflow.throwError();
  }, 500);

  workflow.on('error', (e) => {
    console.log(e);
  });

  workflow.on('done', (results) => {
    console.log(results);
  });
}
