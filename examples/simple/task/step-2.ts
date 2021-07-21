import Task from '../../../src/lib/Task';
import Step from '../../../src/lib/Step';
import path from 'path';

export default {
  taskTimeout: 4000,
  taskMaxFailCount: 2,

  async beforeAll(step: Step) {
    console.log('Step2: BeforeAll');
    await step.addTasks([{ value: 10 }, { value: 20 }, { value: 30 }, { value: 40 }]);
  },

  async handler(task: Task) {
    console.log('Step2: handler', task.data);

    await new Promise((r) => setTimeout(() => r(null), 1500));

    // Will throw an error
    if (task.data.value === 30) {
      return Promise.reject('Random step 2 error');
    }

    // Will throw a timeout error
    if (task.data.value === 40) {
      await new Promise((r) => setTimeout(() => r(null), 5000));
    }

    return `Success ${task.data}`;
  },

  async onHandlerError(task: Task, error: Error) {
    console.log(
      `Step2: onHandlerError`,
      `${task.failedCount}/${this.taskMaxFailCount} fail`,
      error.message
    );
  },

  async afterAll(step: Step) {
    const res = await step.getResults();
    const success = res.filter((task) => !task.error);
    const errors = res.filter((task) => task.error);

    console.log(`Step2: afterAll\n${success.length} success\n${errors.length} errors:`);
    console.log(errors);

    await step.addAfter({
      name: 'cool',
      handler: path.join(__dirname, './step-2.2'),
    });
  },
};
