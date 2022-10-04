import '../../helpers/redis';

import redis from 'redis';

import { ConnectionOptions } from '../../../lib/Client';
import DeFlow from '../../../lib';
import { WorkFlow } from '../../../index';
import { WorkFlowResult } from '../../../lib/WorkFlow';
import { createNodes, killNodes } from '../../helpers/listener';

import step1 from './steps/step1';
import step2 from './steps/step2';
import step3 from './steps/step3';
import step4 from './steps/step4';
import step5 from './steps/step5';
import step6 from './steps/step6';
import step7 from './steps/step7';
import step8 from './steps/step8';
import step9 from './steps/step9';
import step10 from './steps/step10';
import step11 from './steps/step11';
import step12 from './steps/step12';

process.env.NAME = 'creator';

const checkProcessQueueInterval = 1000;
const connection: ConnectionOptions = { host: 'localhost', port: 6379 };

const client = redis.createClient(connection);

beforeAll(async () => {
  await client.flushall();
});

beforeEach(async () => {
  DeFlow.register({ connection, checkProcessQueueInterval });
});

afterEach(async () => {
  killNodes();
  await DeFlow.unregister();
});

afterAll(async () => {
  await client.flushall();
  await client.end(true);
  killNodes();
});

describe('Series 7', () => {
  it('should do all steps in good order', async () => {
    await createNodes(2);

    const expectedOrder = [
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
      'step7',
      'step8',
      'step9',
      'step10',
      'step11',
      'step12',
    ];

    const workflow = await WorkFlow.create('ordered', { cleanOnDone: true })
      .addStep({ step: step1, tasks: [{ value: 'step1' }] })
      .addStep({ step: step2, tasks: [{ value: 'step2' }] })
      .addStep({ step: step3, tasks: [{ value: 'step3' }] })
      .addStep({ step: step4, tasks: [{ value: 'step4' }] })
      .addStep({ step: step5, tasks: [{ value: 'step5' }] })
      .addStep({ step: step6, tasks: [{ value: 'step6' }] })
      .addStep({ step: step7, tasks: [{ value: 'step7' }] })
      .addStep({ step: step8, tasks: [{ value: 'step8' }] })
      .addStep({ step: step9, tasks: [{ value: 'step9' }] })
      .addStep({ step: step10, tasks: [{ value: 'step10' }] })
      .addStep({ step: step11, tasks: [{ value: 'step11' }] })
      .addStep({ step: step12, tasks: [{ value: 'step12' }] })
      .run();

    const resultOrder: string[] = [];
    workflow.on('nextTask', (next) => {
      resultOrder.push(next.data.value);
    });

    // Wait for done
    await new Promise((resolve) => {
      workflow.on('done', resolve);
    });

    expect(resultOrder).toStrictEqual(expectedOrder);
  }, 15000);
});
