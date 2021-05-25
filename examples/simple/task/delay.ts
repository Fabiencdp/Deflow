import { Task } from '../../../src';

/**
 * Useless wait time
 * @param task
 */
export default async (task: Task): Promise<{ name: string; someData: number }> => {
  console.log('Delay Task', task.data);

  const step = await task.getStep();

  if (step) {
    const prev = await step.getPrevious();
    if (prev) {
      console.log('PREV STEP WAS', prev.name);
    }
  }

  const time = (task.data as number) % 2 === 0 ? 1000 : 2000;
  await new Promise((resolve) => setTimeout(() => resolve(null), time));

  // if (task.data === 4) {
  //   console.log('FAKE FAIL');
  //   throw new Error('FAILED TASK');
  // }

  return { name: task.stepId, someData: Math.random() };
};
