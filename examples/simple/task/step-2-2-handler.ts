import Task from '../../../src/lib/Task';
import * as path from 'path';

/**
 * Useless wait time
 * @param task
 */
export default async (task: Task): Promise<void> => {
  const step = await task.getStep();

  console.log(`Doing task of "${step.name}" with data:`, task.data);

  await new Promise((resolve) => setTimeout(() => resolve(null), 2500));
};
