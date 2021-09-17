import DeFlow, { WorkFlow } from '../../src';

import step1 from './steps/step-1';
import step2 from './steps/step-2';

DeFlow.register({ connection: { host: 'localhost', port: 6379 } });

setTimeout(() => {
  createTreeWorkflow();
}, 3000);

/**
 * Workflow test file
 */
function createTreeWorkflow(): void {
  const w = WorkFlow.create('w')
    .addStep({ step: step1, data: { toCreate: 5 } })
    .addStep({ step: step2 });

  w.run();

  w.events.on('done', () => {
    console.log('Tree workflow is done');
  });
}
