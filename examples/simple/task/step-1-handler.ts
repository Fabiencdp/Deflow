import Task from '../../../src/lib/Task';
import * as path from 'path';

/**
 * Useless wait time
 * @param task
 */
export default async (task: Task): Promise<{ someData: number }> => {
  const step = await task.getStep();

  console.log(`Doing task of "${step.name}" with data:`, task.data);

  await new Promise((resolve) => setTimeout(() => resolve(null), 2000));

  // Randomly fail a task
  if (Math.random() > 0.5) {
    console.log('failed (demo)');
    throw new Error('Some demo error');
  }

  return { someData: Math.random() };
};
