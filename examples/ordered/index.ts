import DeFlow, { WorkFlow } from '../../src';
import { WorkFlowResult } from '../../src/lib/WorkFlow';

import step1 from './steps/step1';
import step2 from './steps/step2';
import step3 from './steps/step3';
import step4 from './steps/step4';
import step5 from './steps/step5';
import step6 from './steps/step6';

DeFlow.register({ connection: { host: 'localhost', port: 6379 } });

setTimeout(async () => {
  await checkForOrderedResults();
}, 1000);

/**
 * Check if results are correctly ordered
 * You can try this script with multiple listener:
 *  - create multiple listener nodes using "npm run listener"
 *  - then run the test: npm run example:ordered
 *  You should not get any failed in the result
 */
async function checkForOrderedResults() {
  const orderPart = [
    'step1',
    'step2',
    'step3Before',
    'step3',
    'step3After',
    'step3AfterAfter',
    'step4',
    'step5',
    'step6',
    'step6After',
  ];
  // We will try 3 times the same sequence
  const order = [...orderPart, ...orderPart, ...orderPart];

  const workflow = await WorkFlow.create('ordered', { cleanOnDone: true })
    .addStep({ step: step1, tasks: [{ value: 'step1' }] })
    .addStep({ step: step2, tasks: [{ value: 'step2' }] })
    .addStep({ step: step3, tasks: [{ value: 'step3' }] })
    .addStep({ step: step4, tasks: [{ value: 'step4' }] })
    .addStep({ step: step5, tasks: [{ value: 'step5' }] })
    .addStep({ step: step6, tasks: [{ value: 'step6' }] })
    // Second try
    .addStep({ step: step1, tasks: [{ value: 'step1' }] })
    .addStep({ step: step2, tasks: [{ value: 'step2' }] })
    .addStep({ step: step3, tasks: [{ value: 'step3' }] })
    .addStep({ step: step4, tasks: [{ value: 'step4' }] })
    .addStep({ step: step5, tasks: [{ value: 'step5' }] })
    .addStep({ step: step6, tasks: [{ value: 'step6' }] })
    // Third try
    .addStep({ step: step1, tasks: [{ value: 'step1' }] })
    .addStep({ step: step2, tasks: [{ value: 'step2' }] })
    .addStep({ step: step3, tasks: [{ value: 'step3' }] })
    .addStep({ step: step4, tasks: [{ value: 'step4' }] })
    .addStep({ step: step5, tasks: [{ value: 'step5' }] })
    .addStep({ step: step6, tasks: [{ value: 'step6' }] })
    .run();

  const failed: any = [];
  workflow.on('nextTask', (next) => {
    console.log('Doing task:', next.data.value);
    const expectedStep = order.shift();
    if (next.data.value !== expectedStep) {
      failed.push({ value: next.data.value, expected: expectedStep, next: next });
    }
  });

  const data: WorkFlowResult = await new Promise((resolve) => {
    workflow.on('done', resolve);
  });

  console.log('Workflow is done', data);

  if (failed.length > 0) {
    console.log('There is some errors', failed);
  } else {
    console.log('order is correct');
  }
}
