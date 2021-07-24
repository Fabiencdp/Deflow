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
      tasks: [1, 2, 3, 4, 5],
    },
    {
      name: 'STEP 2',
      handler: path.resolve(__dirname, './steps/step-1'),
      tasks: [1, 2, 3],
    },
  ];

  const wfl = await WorkFlow.create('simple', steps);
  await wfl.run();
}
