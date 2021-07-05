import { Task } from '../../../old';

/**
 * Useless wait time
 * @param task
 */
export default class testClass {
  static processTask(task: Task) {
    console.log('resolve class');
    return Promise.resolve({ name: '', someData: 1 });
  }
}
