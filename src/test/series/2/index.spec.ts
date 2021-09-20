import '../../helpers/redis';

import redis from 'redis';

import DeFlow, { Task, WorkFlow } from '../../../index';
import { ConnectionOptions } from '../../../lib/Client';
import { WorkFlowResult } from '../../../lib/WorkFlow';

import step1 from './steps/step1';

jest.useFakeTimers('legacy');

const checkProcessQueueInterval = 1000;
const connection: ConnectionOptions = { host: 'localhost', port: 6379 };

const client = redis.createClient(connection);

beforeAll(async () => {
  await client.flushall();
});

beforeEach(async () => {
  DeFlow.register({ connection, checkProcessQueueInterval });
});

afterAll(async () => {
  await DeFlow.unregister();
  await client.end(true);
});

describe('Series 2', () => {
  it('should timeout and retry 2 times', async () => {
    const timeout = 500;
    const retry = 3;
    const workflow = await WorkFlow.create('error-handling')
      .addStep({
        step: step1,
        tasks: [timeout - 500, timeout - 200, timeout + 200, timeout + 500],
        options: {
          taskTimeout: timeout,
          taskMaxFailCount: retry,
        },
      })
      .run();

    workflow.events.on('nextTask', () => {
      jest.advanceTimersByTime(checkProcessQueueInterval);
    });

    const result: WorkFlowResult = await new Promise((resolve) => {
      workflow.events.on('done', resolve);
    });

    const tasks = result.steps.reduce((acc: Task[], r) => [...acc, ...r.tasks], []);

    const shouldSucceed = tasks.filter((t) => t.data < timeout);
    const shouldFail = tasks.filter((t) => t.data > timeout);

    expect(shouldSucceed.length).toBe(2);
    expect(shouldFail.length).toBe(2);

    expect(shouldFail[0].failedCount).toBe(retry);
    expect(shouldFail[1].failedCount).toBe(retry);

    expect(shouldFail[0].error).toBe('Task module timeout');
  });
});
