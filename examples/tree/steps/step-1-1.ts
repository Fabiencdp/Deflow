import StepHandler from '../../../src/lib/StepHandler';

export default new StepHandler<void, string, void>({
  options: {
    taskMaxFailCount: 1,
    taskConcurrency: 2,
  },

  /**
   * A some tasks
   * @param step
   */
  async beforeAll(step) {
    console.log('Step-1.1: BeforeAll');
    return step.addTasks(['a', 'b', 'c']);
  },

  /**
   * Just log each string
   * @param task
   */
  async handler(task) {
    console.log('Step-1.1: handler', task.data);
    await new Promise((r) => setTimeout(() => r(null), 2000));
  },

  async afterAll() {
    console.log('Step-1.1: afterAll');
    await new Promise((r) => setTimeout(() => r(null), 2000));
  },
});
