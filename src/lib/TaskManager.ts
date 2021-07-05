import Debug from 'debug';

import Task from '../lib/Task';
import DeFlow from './index';

const debug = Debug('TaskManager');

export default class TaskManager {
  static store(task: Task): Promise<boolean> {
    const deFlow = DeFlow.getInstance();

    const id = [task.workFlowId, task.stepId, task.id].join(':');
    const data = JSON.stringify(task.data);

    return new Promise((resolve) => {
      deFlow.client.lpush(id, data, (err, status) => {
        return resolve(true);
      });
    });
  }
}
