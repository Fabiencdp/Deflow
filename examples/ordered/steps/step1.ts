import { StepHandler } from '../../../src';

export default new StepHandler({
  async handler(task) {
    return task.data.value;
  },
});
