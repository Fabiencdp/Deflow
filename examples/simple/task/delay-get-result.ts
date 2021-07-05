import { Step } from '../../../old';

/**
 * Useless wait time
 * @param data
 * @param step
 */
export default async (data: unknown, step: Step): Promise<void> => {
  console.log('GET PREV RES');

  const prev = await step.getPrevious();
  if (prev) {
    const res = await prev.getTasks();
    console.log(res);
  }

  await new Promise((resolve) => setTimeout(() => resolve(null), 2500));
};
