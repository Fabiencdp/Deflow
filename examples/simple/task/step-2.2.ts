import Task from '../../../src/lib/Task';
import Step from '../../../src/lib/Step';
import path from 'path';

export default {
  taskTimeout: 4000,
  taskMaxFailCount: 1,

  async beforeAll(step: Step) {
    console.log('Step2.2: BeforeAll');
    await step.addTasks(['a', 'b', 'c']);
  },

  async handler(task: Task) {
    console.log('Step2.2: handler', task.data);
    await new Promise((r) => setTimeout(() => r(null), 1500));
    return `ok ${task.data}`;
  },

  async afterAll(step: Step) {
    console.log('Step2.2: afterAll');
  },
};
