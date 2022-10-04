import { StepHandler } from '../../../../index';

import step3AfterAfter from './step3-after-after';

export default new StepHandler({
  async handler(task, step) {
    await step.addAfter({
      step: step3AfterAfter,
      tasks: [{ value: 'step3AfterAfter' }],
    });
    return task.data.value;
  },
});
