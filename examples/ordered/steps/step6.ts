import { StepHandler } from '../../../src';

import step6After from './step6-after';

export default new StepHandler({
  async handler(task, step) {
    await step.addAfter({
      step: step6After,
      tasks: [{ value: 'step6After' }],
    });
    return task.data.value;
  },
});
