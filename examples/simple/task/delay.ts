import Task from '../../../src/lib/Task';
import * as path from 'path';

/**
 * Useless wait time
 * @param task
 */
export default async (task: Task): Promise<{ name: string; someData: number }> => {
  console.log('Doing long task with data:', task.data);

  const step = await task.getStep();

  await new Promise((resolve) => setTimeout(() => resolve(null), 2000));

  // Failing a task
  // if (task.data === 4) {
  //   console.log('FAKE FAIL');
  //   throw new Error('FAILED TASK');
  // }

  if (task.data === 'b') {
    console.log('test');
    await step.addAfter({
      name: 'test-after',
      handler: path.join(__dirname, 'delay.ts'),
      tasks: [1,2,3,4,5,6],
    });
  }

  return { name: task.stepId, someData: Math.random() };
};
