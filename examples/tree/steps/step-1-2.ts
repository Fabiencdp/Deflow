import StepHandler from '../../../src/lib/StepHandler';

export default new StepHandler<void, number, void>({
  options: {
    taskTimeout: 2500,
    taskMaxFailCount: 2,
  },

  async beforeAll(step) {
    console.log('Step-1.2: beforeAll');
    await step.addTasks([1, 2, 3, 4, 5, 6]);
  },

  async handler(task) {
    console.log('Step-1.2: handler', task.data);
    await new Promise((r) => setTimeout(() => r(null), Math.random() * (4000 - 1000) + 1000));
  },

  async onHandlerError(task, step, error) {
    console.log(
      `Step-1-2: onHandlerError`,
      `${task.failedCount}/${step.options.taskMaxFailCount} fail`,
      error.message
    );
  },

  async afterAll(step) {
    console.log('Step-1.2: afterAll');
    console.log(await step.getResults());
  },
});
