import { DeFlowStep } from '../../../src';
import StepHandler from '../../../src/lib/StepHandler';

type Step1 = DeFlowStep<{ toCreate: number }, number, void>;

/**
 *
 */
export const step1Module = new StepHandler<{ toCreate: number }, number, void>({
  async beforeAll(step) {
    const arr = Array.from(Array(step.data.toCreate).keys());
    return step.addTasks(arr);
  },

  async handler(data) {
    console.log('handler 1', data);
    await new Promise((resolve) => setTimeout(() => resolve(0), 1000));
  },

  async afterEach(task, step) {
    console.log('Step1: afterEach', await step.getProgress());
  },

  async afterAll() {
    console.log('Step1: afterAll');
  },
});

export default step1Module;
