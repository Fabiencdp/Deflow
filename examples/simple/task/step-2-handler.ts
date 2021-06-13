import Task from '../../../src/lib/Task';
import * as path from 'path';

/**
 * Useless wait time
 * @param task
 */
export default async (task: Task): Promise<{ someData: number }> => {
  const step = await task.getStep();

  console.log(`Doing task of "${step.name}" with data:`, task.data);

  await new Promise((resolve) => setTimeout(() => resolve(null), 1000));

  if (task.data === 'b') {
    // Add a new step after the current one if data === 'b'
    console.log('Add a step after this one');

    await step.addAfter({
      name: `Step added when data === 'b'`,
      handler: path.join(__dirname, 'step-2-2-handler'),
      tasks: [1, 2, 3, 4, 5, 6, 7, 8, 9],
      options: {
        taskConcurrency: 3, // Do task 3 by 3
      },
    });
  }

  return { someData: Math.random() };
};
