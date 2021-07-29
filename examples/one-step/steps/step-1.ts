import { DeFlowStep } from '../../../src';

type StepModule = DeFlowStep<undefined, string | number, void>;

const stepModule: StepModule = {
  taskTimeout: 8000,
  taskMaxFailCount: 5,

  async handler(task) {
    console.log('Step1: handler', task.data);
    if (task.data === 'a') {
      console.log('Step1: handler', task.data, 'CRASHING TASK');
      process.exit(0);
    } else {
      await new Promise((r) => setTimeout(() => r(null), 1000));
    }
    console.log('Step1: handler', task.data, 'Done');
  },
};

export default stepModule;
