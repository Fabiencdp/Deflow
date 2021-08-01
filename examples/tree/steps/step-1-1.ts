import { DeFlowStep } from '../../../src';

export type Step1_1 = DeFlowStep<void, string, void>;

const step1_1: Step1_1 = {
  taskTimeout: 4500,
  taskMaxFailCount: 1,
  taskConcurrency: 2,

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

  async afterAll(step) {
    console.log('Step-1.1: afterAll');
    await new Promise((r) => setTimeout(() => r(null), 8000));
  },
};

export default step1_1;
