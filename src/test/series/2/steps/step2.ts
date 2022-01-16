import { Step } from '../../../../index';

export default new Step<void, number, number>({
  async handler(task) {
    return task.data;
  },
});
