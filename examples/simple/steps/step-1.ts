import Task from '../../../src/lib/Task';
import Step from '../../../src/lib/Step';

export default {
  taskTimeout: 5000,
  taskMaxFailCount: 5,

  async handler(task: Task) {
    console.log('Step1: handler', task.data);

    // Simulate a process crash
    if (process.env.LISTENER && task.data >= 3) {
      console.log('crash the process');
      return process.exit(0);
    }

    await new Promise((r) => setTimeout(() => r(null), 1000));
  },

  async afterEach(task: Task, step: Step) {
    console.log('Step1: afterEach', await step.getProgress());
  },
};
