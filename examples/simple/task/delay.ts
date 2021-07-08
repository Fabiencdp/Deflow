import Task from '../../../src/lib/Task';

export default {
  async beforeAll() {
    console.log('before all');
    await new Promise((r) => setTimeout(() => r(null), 5000));
  },

  async handler(task: Task) {
    console.log('HANDLER', task.data);
    await new Promise((r) => setTimeout(() => r(null), task.data === 30 ? 5000 : 1500));
  },

  async afterAll() {
    console.log('after all');
    await new Promise((r) => setTimeout(() => r(null), 5000));
  },
};
