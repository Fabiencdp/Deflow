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
    const nodes = await createNodes<{ id: string; workflowId: string; taskCount: number }>(3, {
      cwd: __dirname,
      file: './initiator.js',
    });

    console.log(nodes);

    const workflow = await WorkFlow.create('ordered', { cleanOnDone: false })
      .addStep({ step: step1, tasks: [{ value: 1 }] })
      .addStep({ step: step2, tasks: [{ value: 2 }] })
      .addStep({ step: step3, tasks: [{ value: 3 }] })
      .addStep({ step: step4, tasks: [{ value: 4 }] })
      .addStep({ step: step5, tasks: [{ value: 5 }] })
      .addStep({ step: step6, tasks: [{ value: 6 }] })
      .addStep({ step: step7, tasks: [{ value: 7 }] })
      .addStep({ step: step8, tasks: [{ value: 8 }] })
      .addStep({ step: step9, tasks: [{ value: 9 }] })
      .addStep({ step: step10, tasks: [{ value: 10 }] })
      .addStep({ step: step11, tasks: [{ value: 11 }] })
      .addStep({ step: step12, tasks: [{ value: 12 }] })
      .run();

    let i = 1;
    workflow.on('nextTask', (next) => {
      expect(next.data.value).toBe(i);
      console.log('next', next, i);
      i += 1;
    });

    const data: WorkFlowResult = await new Promise((resolve) => {
      workflow.on('done', resolve);
    });

    console.log(data);

    expect(i).toBe(13); // +1 at last increment
    expect(data.steps.length).toBe(12);
  }, 15000);
});
