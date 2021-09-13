import StepHandler from '../../../src/lib/StepHandler';

import step1_1 from './step-1-1';
import step1_2 from './step-1-2';

/**
 *
 */
export default new StepHandler<{ toCreate: number }, number, void>({
  options: {
    taskTimeout: 88888,
    taskMaxFailCount: 3,
  },

  async beforeAll(step) {
    const arr = Array.from(Array(step.data.toCreate).keys());

    console.log(step.options);

    return step.addTasks(arr);
  },

  async handler(task, step) {
    console.log('handler 1', task.data);
    await new Promise((resolve) => setTimeout(() => resolve(0), Math.random() * 1000 + 400));
  },

  async afterEach(task, step) {
    console.log('Step1: afterEach', await step.getProgress());
  },

  async afterAll(step) {
    console.log('Step1: afterAll');
    await step.addAfter({ step: step1_1 });
    await step.addAfter({ step: step1_2 });
  },
});
