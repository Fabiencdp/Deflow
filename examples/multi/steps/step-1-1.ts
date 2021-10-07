import StepHandler from '../../../src/lib/StepHandler';

export default new StepHandler<number, string, void>({
  /**
   * A some tasks
   * @param step
   */
  async beforeAll(step) {
    console.log(`${step.data}: BeforeAll`);
    return step.addTasks(['a', 'b', 'c']);
  },

  /**
   * Just log each string
   * @param task
   * @param step
   */
  async handler(task, step) {
    console.log(`${step.data}: handler`, task.data);
    await new Promise((r) => setTimeout(() => r(null), 500));
  },

  async afterAll(step) {
    console.log(`${step.data}: afterAll`);
    await new Promise((r) => setTimeout(() => r(null), 1000));
  },
});
