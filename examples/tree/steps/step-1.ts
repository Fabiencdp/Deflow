import path from 'path';

import { DeFlowStep } from '../../../src';

import { Step1_1 } from './step-1-1';
import { Step1_2 } from './step-1-2';

type Step1 = DeFlowStep<{ toCreate: number }, number, void>;

const step1: Step1 = {
  async beforeAll(step) {
    const arr = Array.from(Array(step.data.toCreate).keys());
    return step.addTasks(arr);
  },

  async handler(task, step) {
    console.log('Step1: handler', task.data);

    await new Promise((r) => setTimeout(() => r(null), 4000));

    await step.addAfter<Step1_1, Step1_2>(
      {
        name: 'step-1.1',
        module: path.resolve(__dirname, './step-1-1'),
      },
      {
        name: 'step-1.2',
        tasks: [task.data],
        module: path.resolve(__dirname, './step-1-2'),
      }
    );
  },

  async afterEach(task, step) {
    console.log('Step1: afterEach', await step.getProgress());
  },

  async afterAll(step) {
    console.log('\nStep1: afterAll\n');
  },
};

export default step1;
