import * as path from 'path';

import { Step, Task } from '../../../src';

/**
 * Useless wait time
 * @param data
 * @param step
 */
export default async (data: Task, step: Step): Promise<void> => {
  await new Promise((resolve) => setTimeout(() => resolve(null), 1500));

  console.log('ADDING SOME STEPS - ');
  const next = await step.addAfter({
    name: 'DELAY ADDED 1' + data.data,
    tasks: [1],
    handler: path.resolve(__dirname, './delay'),
    handlerFn: 'delay2',
  });

  const nextNext = await next.addAfter({
    name: 'DELAY ADDED 2' + data.data,
    tasks: ['a', 'b', 'c', 'd', 'e'],
    handler: path.resolve(__dirname, './delay'),
    handlerFn: 'delay2',
    options: {
      taskConcurrency: 2,
    },
  });

  nextNext.addAfter({
    name: 'DELAY ADDED 3' + data.data,
    tasks: ['x', 'y', 'z', 'zz'],
    handler: path.resolve(__dirname, './delay'),
    handlerFn: 'delay2',
  });

  return Promise.resolve();
};
