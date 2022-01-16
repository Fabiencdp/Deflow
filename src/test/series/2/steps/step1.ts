import { Step } from '../../../../index';

export default new Step<void, number, number>({
  async handler(task) {
    return new Promise((resolve) => setTimeout(() => resolve(task.data), task.data));
  },

  onHandlerError() {
    return;
  },
});
