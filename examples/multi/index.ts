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
  const tasks = Array.from(Array(100).keys());

  const steps = [
    {
      name: 'STEP 1',
      handler: path.resolve(__dirname, './steps/step-1'),
      tasks,
    },
    {
      name: 'STEP 2',
      handler: path.resolve(__dirname, './steps/step-2'),
      tasks,
    },
  ];

  const wfl = await WorkFlow.create('simple', steps);
  await wfl.run();
}
