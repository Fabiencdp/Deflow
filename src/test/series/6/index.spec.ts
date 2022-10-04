import '../../helpers/redis';

import redis from 'redis';

import { ConnectionOptions } from '../../../lib/Client';
import DeFlow from '../../../lib';
import { Task, WorkFlow } from '../../../index';
import { WorkFlowResult } from '../../../lib/WorkFlow';
import { createNodes, killNodes } from '../../helpers/listener';

import step from './steps/step';

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

describe('Series 6', () => {
  it('should do all steps in good order', async () => {
    const workflow = await WorkFlow.create('ordered')
      .addStep({
        step: step,
        tasks: [{ name: process.env.NAME, value: 1 }],
      })
      .run();

    const data: WorkFlowResult = await new Promise((resolve) => {
      workflow.on('done', resolve);
    });

    const expectedOrder = Array.from({ length: 100 }, (_, i) => i + 1);
    const tasks = data.steps.reduce((acc: Task[], step) => [...acc, ...step.tasks], []);
    const values = tasks.map((t) => t.data.value);

    expect(data.steps.length).toBe(100);
    expect(values).toStrictEqual(expectedOrder);
  }, 10000);
});
