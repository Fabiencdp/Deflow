import * as path from 'path';

import DeFlow, { WorkFlow } from '../../src';

console.clear();

DeFlow.register({ connection: { host: 'localhost', port: 6379 } });

setTimeout(() => {
  if (!process.env.LISTENER) {
    console.log('Create example workflow');
    createSimpleWorkflow();
  }
}, 2000);

/**
 * Workflow test file
 */
async function createSimpleWorkflow(): Promise<void> {
  const steps = [
    {
      name: 'STEP 1',
      tasks: [1, 2, 3, 4, 5],
      handler: path.resolve(__dirname, './task/delay'),
    },
    // {
    //   name: 'STEP 2',
    //   tasks: [10, 20, 30, 40, 50],
    //   handler: path.resolve(__dirname, './task/delay'),
    // },
    // {
    //   name: 'STEP 3',
    //   tasks: [100, 200, 300],
    //   handler: path.resolve(__dirname, './task/delay'),
    // },
    // {
    //   name: 'ADD TASK FROM CLASS 2',
    //   tasks: [1],
    //   handler: path.resolve(__dirname, './task/class'),
    //   handlerFn: 'processTask',
    // },
  ];

  const wfl = await WorkFlow.create('simple', steps);
  await wfl.run();
}
