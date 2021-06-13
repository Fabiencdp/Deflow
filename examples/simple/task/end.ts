import Task from '../../../src/lib/Task';
import * as path from 'path';

/**
 * Useless wait time
 * @param task
 */
export default async (task: Task) => {
  console.log('Process is done', task.data);
};
