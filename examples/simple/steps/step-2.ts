import Step from '../../../src/lib/Step';

/**
 * This step will show timeout error can be handled
 * StepHandler<
 *    StepData: global step data type, useful to fetch data from a external source or DB
 *    TaskData: task data type
 *    TaskResult: task result type
 * >
 */
export default new Step<{ someData: string }, number, number>({
  /**
   * Get previous results
   */
  async beforeAll(step) {
    console.log('Step2: beforeAll');
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
  async onHandlerError(task, step, error) {
    console.log(
      `Step2: onHandlerError`,
      `${task.failedCount}/${step.options.taskMaxFailCount} fail`,
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

    console.log(`Step2: afterAll: ${success.length} success, ${errors.length} errors:`);
    console.log(errors);
  },
});
