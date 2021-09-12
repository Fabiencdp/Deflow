import DeFlow, { WorkFlow } from '../../src';

import step1 from './steps/step-1';

DeFlow.register({ connection: { host: 'localhost', port: 6379 } });

setTimeout(() => {
  createTreeWorkflow();
}, 3000);

/**
 * Workflow test file
 */
function createTreeWorkflow(): void {
  WorkFlow.create('w')
    .addStep(step1, { data: { toCreate: 3 } })
    .run();
}
