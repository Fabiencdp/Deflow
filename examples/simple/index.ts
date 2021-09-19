import * as path from 'path';

import DeFlow from '../../src';
import { AddStep } from '../../src';

console.clear();

DeFlow.register({ connection: { host: 'localhost', port: 6379 } });

// We wait for redis client to be ready
setTimeout(() => {
  console.log('Create example workflow');
  createSimpleWorkflow();
}, 2000);

/**
 * Workflow test file
 */
async function createSimpleWorkflow(): Promise<void> {
  // Each step have one or more tasks
  const steps: AddStep[] = [
    {
      name: 'Step 1 - Process numeric',
      tasks: [1, 2, 3],
      handler: path.resolve(__dirname, './task/step-1-handler'),
      options: {
        taskMaxFailCount: 4, // Handler will retry 4 time in case of fail
      }
    },
    {
      name: 'Step 2 - Process alpha',
      tasks: ['a', 'b', 'c', 'd', 'e'],
      handler: path.resolve(__dirname, './task/step-2-handler'),
    },
    {
      name: 'Step 3 - End',
      tasks: [null], // This step does not need any data
      handler: path.resolve(__dirname, './task/step-3-handler'),
    },
  ];

  const wfl = await DeFlow.createWorkflow('simple', steps);
  await wfl.run();
}
