import StepHandler from '../../../src/lib/StepHandler';

export default new StepHandler<undefined, string, number>({
  /**
   * Task handler
   * @param task
   */
  async handler(task) {
    console.log('Step1: handler', task.data);
    await new Promise((r) => setTimeout(() => r(null), 1000));
    return parseFloat(task.data);
  },

  /**
   * Log result
   * @param task
   * @param step
   */
  async afterEach(task, step) {
    console.log('Step1: afterEach', await step.getProgress());
    console.log('Step1: Result', task.result);
  },

  /**
   * Log result
   * @param step
   */
  async afterAll(step) {
    console.log('Step1: AF ALL', await step.getProgress());
    // console.log('Step1: Result', task.result);
  },
});
