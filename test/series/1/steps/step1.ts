import { StepHandler } from '../../../../src';

export default new StepHandler<void, number, number>({
  async handler(task) {
    return task.data;
  },
});
