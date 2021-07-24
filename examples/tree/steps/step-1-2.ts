import Task from '../../../src/lib/Task';
import Step from '../../../src/lib/Step';

export default {
  taskTimeout: 4600,
  taskMaxFailCount: 2,

  async handler(task: Task) {
    console.log('\nStep-1.2: handler', task.data, '\n');
    await new Promise((r) => setTimeout(() => r(null), 4000 + Math.random() * 1000));
  },

  async onHandlerError(task: Task, error: Error) {
    console.log(
      `Step-1-2: onHandlerError`,
      `${task.failedCount}/${this.taskMaxFailCount} fail`,
      error.message
    );
  },
};
