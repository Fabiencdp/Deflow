import Task from '../../../src/lib/Task';

/**
 * Useless wait time
 * @param task
 */
export default async (task: Task): Promise<{ name: string; someData: number }> => {
  console.log('Delay', task.data);

  const step = await task.getStep();

  if (step) {
    const prev = await step.getPrevious();
    if (prev) {
      console.log('PREV STEP', prev.name);
    }
  }

  const time = (task.data as number) % 2 === 0 ? 3000 : 5000;
  await new Promise((resolve) => setTimeout(() => resolve(null), time));

  // if (task.data === 4) {
  //   console.log('FAKE FAIL');
  //   throw new Error('FAILED TASK');
  // }

  return { name: task.stepId, someData: Math.random() };
};
