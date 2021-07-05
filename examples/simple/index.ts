import * as path from 'path';

import DeFlow, { WorkFlow } from '../../src';

console.clear();

DeFlow.register({ connection: { host: 'localhost', port: 6379 } });

setTimeout(() => {
  console.log('Create example workflow');
  createSimpleWorkflow();
}, 2000);

/**
 * Workflow test file
 */
async function createSimpleWorkflow(): Promise<void> {
  const steps = [
    {
      name: 'ADD TASK',
      tasks: [1, 2, 3, 4, 5],
      handler: path.resolve(__dirname, './task/delay'),
    },
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
