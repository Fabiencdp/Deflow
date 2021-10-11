import { StepHandler } from '../../../../index';

export default new StepHandler({
  async handler(task, step) {
    if (task.data.value < 100) {
      await import('./step').then(async (m) => {
        await step.addAfter({
          step: m.default,
          tasks: [{ name: 'step1', value: task.data.value + 1 }],
        });
      });
    }
    return task.data.value;
  },
});
