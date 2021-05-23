import * as path from 'path';

import Step from '../../../src/lib/Step';

/**
 * Useless wait time
 * @param data
 * @param step
 */
export default async (data: unknown, step: Step): Promise<void> => {
  console.log('GET PREV RES');

  const prev = await step.getPrevious();
  const res = await prev.getTasks();

  await new Promise((resolve) => setTimeout(() => resolve(null), 2500));
};
