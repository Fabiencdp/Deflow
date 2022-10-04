import { StepHandler } from '../../../../index';

export default new StepHandler({
  async handler(task) {
    return task.data.value;
  },
});
