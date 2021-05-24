import * as path from 'path';

import DeFlow, { AddStep } from '../../dist';

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
  const steps: AddStep[] = [
    {
      name: 'ADD TASK',
      tasks: [1],
      handler: path.resolve(__dirname, './task/delay-add-task.ts'),
    },
  ];

  const wfl = await DeFlow.createWorkflow('simple', steps);
  await wfl.run();
}
