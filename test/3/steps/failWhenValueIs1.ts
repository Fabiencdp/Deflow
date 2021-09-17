import { StepHandler } from '../../../src';

export default new StepHandler<void, number, number>({
  async handler(task) {
    return new Promise<number>((resolve) => {
      if (task.data !== 1 || task.failedCount > 1) {
        resolve(task.data);
      }
    });
  },
});
