import Task from '../../../src/lib/Task';
import Step from '../../../src/lib/Step';
import * as path from 'path';

export default {
  async handler(task: Task) {
    console.log('Step1: handler', task.data);
    await new Promise((r) => setTimeout(() => r(null), 1000));
  },

  async afterEach(task: Task, step: Step) {
    console.log('Step1: afterEach', await step.getProgress());
  },
};
