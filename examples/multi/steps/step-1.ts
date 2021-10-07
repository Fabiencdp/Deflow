import StepHandler from '../../../src/lib/StepHandler';

import step1_1 from './step-1-1';

export default new StepHandler<{ toCreate: number }, number, void>({
  async beforeAll(step) {
    const arr = Array.from(Array(step.data.toCreate).keys());

    const promises = arr.map((a) => {
      return step.addAfter({ step: step1_1, data: a });
    });

    await Promise.all(promises);
  },
});
