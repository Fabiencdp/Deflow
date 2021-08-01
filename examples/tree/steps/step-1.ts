import Task from '../../../src/lib/Task';
import Step from '../../../src/lib/Step';
import path from 'path';
import { Step1_1 } from './step-1-1';
import { Step1_2 } from './step-1-2';

export default {
  async beforeAll(step: Step) {
    const arr = Array.from(Array(step.data.toCreate).keys());
    return step.addTasks(arr);
  },

  async handler(task: Task, step: Step) {
    console.log('Step1: handler', task.data);

    await new Promise((r) => setTimeout(() => r(null), 4000));

    await step.addAfter<[Step1_1, Step1_2]>([
      {
        name: 'step-1.1',
        handler: path.resolve(__dirname, './step-1-1'),
      },
      {
        name: 'step-1.2',
        tasks: [task.data], // TODO: fix type
        handler: path.resolve(__dirname, './step-1-2'),
      },
    ]);
  },

  async afterEach(task: Task, step: Step) {
    console.log('Step1: afterEach', await step.getProgress());
  },

  async afterAll(step: Step) {
    console.log('\nStep1: afterAll\n');
  },
};
