import { DeFlowStep } from '../../../src';

export type Step1_2 = DeFlowStep<void, number, void>;

const step1_2: Step1_2 = {
  taskTimeout: 4600,
  taskMaxFailCount: 2,

  async handler(task) {
    console.log('Step-1.2: handler', task.data);
    await new Promise((r) => setTimeout(() => r(null), 4000 + Math.random() * 1000));
  },

  async onHandlerError(task, error) {
    console.log(error);
    console.log(
      `Step-1-2: onHandlerError`,
      `${task.failedCount}/${this.taskMaxFailCount} fail`,
      error.message
    );
  },
};

export default step1_2;
