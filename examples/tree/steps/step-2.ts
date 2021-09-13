import { StepHandler } from '../../../src';

export default new StepHandler<void, null, void>({
  options: {
    taskTimeout: 4000,
    taskMaxFailCount: 2,
  },

  async beforeAll(step) {
    console.log('\nStep2: BeforeAll\n');
    await step.addTasks([null]);
  },

  async handler(task) {
    console.log('\nStep2: handler', task.data);
    await new Promise((r) => setTimeout(() => r(null), 6000));
  },

  async afterAll(step) {
    const res = await step.getResults();
    console.log(`\nStep2: afterAll\n${res.length} success`);
  },
});
