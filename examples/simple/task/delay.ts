import Task from '../../../src/lib/Task';
import Step from '../../../src/lib/Step';

export default {
  async beforeAll(step: Step) {
    // console.log('before all', await step.getProgress());
    // await new Promise((r) => setTimeout(() => r(null), 5000));
  },

  async handler(task: Task) {
    console.log('HANDLER', task.data);
    await new Promise((r) => setTimeout(() => r(null), task.data === 30 ? 5000 : 1500));
  },

  async afterEach(task: Task, step: Step) {
    console.log('after each', await step.getProgress());
  },

  async afterAll(step: Step) {
    console.log('after all', step, await step.getProgress());
    await new Promise((r) => setTimeout(() => r(null), 5000));
  },
};
