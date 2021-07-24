import Task from '../../../src/lib/Task';

export default {
  taskConcurrency: 6,

  async handler(task: Task) {
    console.log('Step1: handler', task.data);
    await new Promise((r) => setTimeout(() => r(null), 1000 * Math.random()));
  },
};
