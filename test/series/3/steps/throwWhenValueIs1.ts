import { StepHandler } from '../../../../src';

export default new StepHandler<void, number, number>({
  async handler(task) {
    if (task.data !== 1 || task.failedCount > 1) {
      return task.data;
    } else {
      throw new Error('failed');
    }
  },
});
