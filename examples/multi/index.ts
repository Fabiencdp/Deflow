import DeFlow, { WorkFlow } from '../../src';

import step1 from './steps/step-1';

DeFlow.register({ connection: { host: 'localhost', port: 6379 } });

setTimeout(() => {
  createWorkflow();
}, 3000);

/**
 * Workflow test file
 */
function createWorkflow(): void {
  const w = WorkFlow.create('multi').addStep({ step: step1, data: { toCreate: 5 } });

  w.run();

  w.on('done', () => {
    console.log('Tree workflow is done');
  });
}
