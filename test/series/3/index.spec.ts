import '../../helpers/redis';

import redis from 'redis';

import DeFlow, { Task, WorkFlow } from '../../../src';
import { ConnectionOptions } from '../../../src/lib/Client';

import failWhenValueIs1 from './steps/failWhenValueIs1';
import throwWhenValueIs1 from './steps/throwWhenValueIs1';

jest.useFakeTimers('legacy');

const checkProcessQueueInterval = 1000;
const connection: ConnectionOptions = { host: 'localhost' };

const client = redis.createClient(connection);

beforeEach(async () => {
  await client.flushall();
  await DeFlow.register({ connection, checkProcessQueueInterval });
});

afterEach(async () => {
  await DeFlow.unregister();
});

afterAll(async () => {
  await client.end(true);
});

describe('Series 3', () => {
  it('should succeed', async () => {
    let nextTaskEventCount = 0;
    const taskMaxFailCount = 3;
    const tasks = [10, 1, 20, 30, 40];

    // Task with data === 1 will fail 3 times
    const expectedNextTaskEventCount = tasks.length - 1 + taskMaxFailCount;

    const workflow = WorkFlow.create('long-process')
      .addStep({
        step: failWhenValueIs1,
        tasks: [10, 1, 20, 30, 40], // value "1" will fail
        options: {
          taskTimeout: 40,
          taskConcurrency: 2,
          taskMaxFailCount: 3,
        },
      })
      .run();

    // Simulate the #checkProcessQueue call each
    workflow.events.on('nextTask', (d) => {
      nextTaskEventCount += 1;
      jest.advanceTimersByTime(checkProcessQueueInterval);
    });

    const results: Task[] = await new Promise((resolve) => {
      workflow.events.on('done', (data) => {
        resolve(data.steps[0].tasks);
      });
    });

    const failed = results.filter((r) => r.failedCount > 0);
    const success = results.filter((r) => r.failedCount === 0);
    const values = success.map((s) => s.result).sort();

    expect(failed?.length).toBe(1);
    expect(failed[0]?.failedCount).toBe(2);
    expect(failed[0]?.data).toBe(1);
    expect(failed[0]?.result).toBe(1);

    expect(success.length).toBe(4);
    expect(values).toEqual([10, 20, 30, 40]);

    expect(nextTaskEventCount).toBe(expectedNextTaskEventCount);
  });

  it('should save failed task', async () => {
    await DeFlow.unregister();
    await DeFlow.register({ connection, checkProcessQueueInterval: 0 });

    const workflow = await WorkFlow.create('long-process-2')
      .addStep({
        step: throwWhenValueIs1,
        tasks: [10, 1], // value "1" will fail
        options: {
          taskMaxFailCount: 1,
        },
      })
      .run();

    const results: Task[] = await new Promise((resolve) => {
      workflow.events.on('done', (data) => {
        resolve(data.steps[0].tasks);
      });
    });

    const failed = results.filter((r) => r.failedCount > 0);
    const success = results.filter((r) => r.failedCount === 0);

    expect(failed?.length).toBe(1);
    expect(failed[0]?.failedCount).toBe(1);
    expect(failed[0]?.error).toBe('failed');
    expect(failed[0]?.data).toBe(1);
    expect(failed[0]?.result).toBe(undefined);

    expect(success.length).toBe(1);
    expect(success[0]?.data).toBe(10);
    expect(success[0]?.result).toBe(10);
  });
});
