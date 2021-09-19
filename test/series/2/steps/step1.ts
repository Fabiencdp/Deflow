import { StepHandler } from '../../../../src';

export default new StepHandler<void, number, number>({
  async handler(task) {
    return new Promise((resolve) => setTimeout(() => resolve(task.data), task.data));
  },

  onHandlerError() {
    return;
  },
});
