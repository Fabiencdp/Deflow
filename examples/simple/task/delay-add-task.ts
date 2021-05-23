import * as path from 'path';

import Step from '../../../src/lib/Step';
import Task from '../../../src/lib/Task';

/**
 * Useless wait time
 * @param data
 * @param step
 */
export default async (data: Task, step: Step): Promise<void> => {
  await new Promise((resolve) => setTimeout(() => resolve(null), 1500));

  console.log('ADDING SOME STEPS - ');
  step.addAfter([
    {
      name: 'DELAY ADDED 1' + data.data,
      tasks: [1],
      handler: path.resolve(__dirname, './delay.ts'),
    },
    {
      name: 'DELAY ADDED 2' + data.data,
      tasks: [1, 2, 3],
      handler: path.resolve(__dirname, './delay.ts'),
    },
  ]);

  return Promise.resolve();
};
