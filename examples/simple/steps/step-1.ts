import StepHandler from '../../../src/lib/StepHandler';

/**
 * Declare the step handler and types
 * In this one, we convert string to float
 * NOTE: IT MUST BE EXPORTED AS DEFAULT
 */
export default new StepHandler({
  /**
   * Init method allow you to prepare tasks based on anything
   * @param step
   */
  async beforeAll(step) {
    const tasks = ['12', '10', '7', '45']; // You can fetch data from external source or db
    console.log('Step1: beforeAll', 'will convert following data:', tasks);
    await step.addTasks(tasks);
  },

  /**
   * This function will run for each task of the step
   * @param task
   */
  async handler(task) {
    console.log('Step1: handler', task.data);
    await new Promise((r) => setTimeout(() => r(null), 1000));
    return parseFloat(task.data);
  },

  /**
   * This method is executed after each tasks done
   * Useful to log progress and stuff
   * @param task
   * @param step
   */
  async afterEach(task, step) {
    console.log('Step1: afterEach', await step.getProgress());
    console.log('Step1: Result', task.result); // Should be a floating number
  },

  /**
   * This method is executed after all tasks done
   * Useful to save results in a db or whatever you want
   * @param step
   */
  async afterAll(step) {
    console.log('Step1: afterAll', await step.getProgress());
    console.log('Step1: Result', await step.getResults());
  },
});
