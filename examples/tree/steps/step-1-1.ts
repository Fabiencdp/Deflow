import Task from '../../../src/lib/Task';
import Step from '../../../src/lib/Step';

export default {
  taskTimeout: 4500,
  taskMaxFailCount: 1,
  taskConcurrency: 2,

  async beforeAll(step: Step) {
    console.log('\nStep-1.1: BeforeAll\n');
    return step.addTasks(['a', 'b', 'c']);
  },

  async handler(task: Task) {
    console.log('\nStep-1.1: handler', task.data);
    await new Promise((r) => setTimeout(() => r(null), 2000));
  },

  async afterAll(step: Step) {
    console.log('\nStep-1.1: afterAll\n');
    await new Promise((r) => setTimeout(() => r(null), 8000));
  },
};
