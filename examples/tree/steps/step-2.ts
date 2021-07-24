import Task from '../../../src/lib/Task';
import Step from '../../../src/lib/Step';
import path from 'path';

export default {
  taskTimeout: 4000,
  taskMaxFailCount: 2,

  async beforeAll(step: Step) {
    console.log('\nStep2: BeforeAll\n');
    await step.addTasks([null]);
  },

  async handler(task: Task) {
    console.log('\nStep2: handler', task.data);
    await new Promise((r) => setTimeout(() => r(null), 6000));
  },

  async afterAll(step: Step) {
    const res = await step.getResults();
    console.log(`\nStep2: afterAll\n${res.length} success`);
  },
};
