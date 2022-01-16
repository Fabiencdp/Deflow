import { Step } from '../../../src';

export default new Step<void, number, void>({
  async beforeAll(step) {
    console.log('Step2: BeforeAll');
    await step.addTasks([2]);
  },

  async handler(task) {
    console.log('Step2: handler', task.data);
  },

  async afterAll(step) {
    const res = await step.getResults();
    console.log(`Step2: afterAll: ${res.length} success`);
  },
});
