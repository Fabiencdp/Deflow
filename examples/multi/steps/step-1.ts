import StepHandler from '../../../src/lib/StepHandler';

export default new StepHandler<{ toCreate: number }, number, void>({
  async beforeAll(step) {
    const arr = Array.from(Array(step.data.toCreate).keys());

    const promises = arr.map((a) => {
      return step.addAfter({ step: import('./step-1-1'), data: a });
    });

    await Promise.all(promises);
  },
});
