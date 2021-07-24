import * as path from 'path';

import DeFlow, { WorkFlow } from '../../src';

console.clear();

DeFlow.register({ connection: { host: 'localhost', port: 6379 } });

setTimeout(() => {
  createSimpleWorkflow();
}, 2000);

/**
 * Workflow test file
 */
async function createSimpleWorkflow(): Promise<void> {
  const steps = [
    {
      name: 'STEP 1',
      handler: path.resolve(__dirname, './steps/step-1'),
      data: { toCreate: 4 },
    },
    {
      name: 'STEP 2',
      handler: path.resolve(__dirname, './steps/step-2'),
    },
  ];

  const wfl = await WorkFlow.create('simple', steps);
  await wfl.run();
}
