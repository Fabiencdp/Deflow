import * as path from 'path';

import DeFlow, { WorkFlow } from '../../src';

console.clear();

DeFlow.register({ connection: { host: 'localhost', port: 6379 } });

setTimeout(() => {
  if (!process.env.LISTENER) {
    console.log('Create example workflow');
    createSimpleWorkflow();
  } else {
    console.log('Listen');
  }
}, 2000);

/**
 * Workflow test file
 */
async function createSimpleWorkflow(): Promise<void> {
  const steps = [
    {
      name: 'STEP 1',
      handler: path.resolve(__dirname, './task/step-1'),
      tasks: [1, 2, 3, 4, 5],
    },
    {
      name: 'STEP 2',
      handler: path.resolve(__dirname, './task/step-2'),
    },
  ];

  const wfl = await WorkFlow.create('simple', steps);
  await wfl.run();
}
