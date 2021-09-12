import StepHandler from '../../../src/lib/StepHandler';

/**
 * This step will show timeout error can be handled
 */
const step2 = new StepHandler<void, number, number>({
  /**
   * Get previous results
   */
  async beforeAll(step) {
    console.log('Step2: beforeAll');
    // options1;
    // const a = this.options1;
    // console.log(step);

    const prev = await step.getPrevious();
    if (prev) {
      const results = await prev.getResults();
      const nextTasks = results.map((r) => r.result);
      await step.addTasks(nextTasks);
    }
  },

  /**
   * For each task, return the data as a string
   * @param task
   */
  async handler(task) {
    console.log('Step2: handler', task.data);

    // Will throw a timeout error
    if (task.data === 40) {
      await new Promise((r) => setTimeout(() => r(null), 5000));
    }

    return task.data;
  },

  /**
   * On error, show a log
   * @param task
   * @param error
   */
  async onHandlerError(task, error) {
    // const a = this.a;
    const a = this.options.taskMaxFailCount;
    console.log(
      `Step2: onHandlerError`,
      `${task.failedCount}/${this.options.taskMaxFailCount} fail`,
      error.message
    );
  },

  /**
   * After all task, log some stats
   * @param step
   */
  async afterAll(step) {
    const res = await step.getResults();
    const success = res.filter((task) => !task.error);
    const errors = res.filter((task) => task.error);

    console.log(`Step2: afterAll\n${success.length} success\n${errors.length} errors:`);
    console.log(errors);
  },
});

// Export as default
export default step2;
