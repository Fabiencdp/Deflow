import { StepHandler } from '../../../../index';

import step3After from './step3-after';
import step3Before from './step3-before';

export default new StepHandler({
  async beforeAll(step) {
    await step.addAfter({
      step: step3Before,
      tasks: [{ value: 'step3Before' }],
    });
  },

  async handler(task) {
    return task.data.value;
  },

  async afterAll(step) {
    await step.addAfter({
      step: step3After,
      tasks: [{ value: 'step3After' }],
    });
  },
});
