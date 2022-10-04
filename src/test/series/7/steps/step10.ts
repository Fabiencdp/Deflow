import { StepHandler } from '../../../../index';

export default new StepHandler({
  async handler(task, step) {
    return task.data.value;
  },
});
