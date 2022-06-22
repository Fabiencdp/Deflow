import '../test/helpers/redis-mock';
import redis from 'redis';

import { StepHandler, WorkFlow } from '../index';

import PubSubManager from './PubSubManager';
import { ConnectionOptions } from './Client';
import Task from './Task';
import Step from './Step';

import DeFlow from './index';

jest.mock('./PubSubManager');

const pubSubSpy = jest.spyOn(PubSubManager, 'subscribe');

const connection: ConnectionOptions = { host: 'localhost' };

const client = redis.createClient(connection);

beforeAll(async () => {
  await client.flushall();
});

beforeEach(async () => {
  jest.useFakeTimers('legacy');
  pubSubSpy.mockReset();
  await client.flushall();
});

describe('register', () => {
  it('should register and subscribe to redis', async () => {
    const instance = await DeFlow.register({ connection });

    expect(DeFlow.instance).not.toBe(undefined);
    expect(instance.client).not.toBe(undefined);
    expect(instance.subscriber).not.toBe(undefined);
    expect(instance.publisher).not.toBe(undefined);
    expect(pubSubSpy).toHaveBeenCalledTimes(1);
    await DeFlow.unregister();
  });

  it('should not register twice', async () => {
    const logSpy = jest.spyOn(console, 'warn').mockImplementation(() => {
      /* silent */
    });
    const instance = await DeFlow.register({ connection });
    const instance2 = await DeFlow.register({ connection });

    expect(instance.id).toBe(instance2.id);
    expect(logSpy).toHaveBeenCalled();
    expect(pubSubSpy).toHaveBeenCalledTimes(1);
    logSpy.mockClear();
    await DeFlow.unregister();
  });
});

describe('unregister', () => {
  it('should unregister', async () => {
    const instance = await DeFlow.register({ connection });
    await DeFlow.unregister();

    expect(instance.client.connected).toBe(false);
    expect(instance.subscriber.connected).toBe(false);
    expect(instance.publisher.connected).toBe(false);
    expect(DeFlow.instance).toBe(undefined);
  });

  it('should do nothing', async () => {
    await DeFlow.unregister();
    expect(DeFlow.instance).toBe(undefined);
  });
});

describe('getInstance', () => {
  it('should return instance', async () => {
    await DeFlow.register({ connection });
    const instance = await DeFlow.getInstance();
    expect(instance).not.toBe(undefined);
    await DeFlow.unregister();
  });

  it('should throw', async () => {
    await DeFlow.unregister();
    expect(DeFlow.getInstance).toThrow('You must register a DeFlow Instance');
  });
});

describe('#checkProcessQueue', () => {
  it('should not run on register with value 0', async () => {
    await DeFlow.register({ connection, checkProcessQueueInterval: 0 });
    expect(setInterval).not.toHaveBeenCalled();
    await DeFlow.unregister();
  });

  it('should run on register with default options', async () => {
    new DeFlow({ connection, checkProcessQueueInterval: 100 });
    expect(setInterval).toHaveBeenCalledWith(expect.any(Function), 100);
  });

  it('should not restore a task and handle checking expiration', async () => {
    const checkProcessQueueInterval = 100;

    // create instance
    await DeFlow.register({ checkProcessQueueInterval, connection });

    const score = checkProcessQueueInterval;
    const lockTime = score + checkProcessQueueInterval; // interval * 2
    const task = new Task({ failedCount: 0, stepKey: '', data: 1, id: '' });
    await createTaskAndLock(task, score, lockTime);

    jest.advanceTimersByTime(checkProcessQueueInterval);
    expect(setInterval).toHaveBeenCalledWith(expect.any(Function), checkProcessQueueInterval);

    // get task process
    const tasks: string[] = await new Promise((resolve) => {
      client.zrangebyscore(DeFlow.processQueue, '-inf', '+inf', (err, res) => {
        expect(err).toBeNull();
        return resolve(res);
      });
    });

    // should get lock
    const lock = await new Promise((resolve) => {
      client.get(DeFlow.processLockKey, (err, res) => {
        expect(err).toBeNull();
        return resolve(res);
      });
    });

    expect(lock).toBe('lock-exist');
    expect(tasks.length).toBe(1);

    // should not get lock after expiration
    jest.advanceTimersByTime(checkProcessQueueInterval);
    const lockExpired = await new Promise((resolve) => {
      client.get(DeFlow.processLockKey, (err, res) => {
        expect(err).toBeNull();
        return resolve(res);
      });
    });

    expect(lockExpired).toBe(null);
    await DeFlow.unregister();
  });

  it('should restore a task', async () => {
    const checkProcessQueueInterval = 1000;

    // create instance
    await DeFlow.register({ checkProcessQueueInterval, connection });

    const score = checkProcessQueueInterval;

    jest
      .spyOn(WorkFlow, 'getById')
      .mockImplementation(() => Promise.resolve({ id: '', name: 'test-wf' } as WorkFlow));

    jest
      .spyOn(Step, 'getModule')
      .mockImplementation(() =>
        Promise.resolve({ path: '', module: 'test-wf' as unknown as StepHandler, filename: '' })
      );

    const step = await Step.create({
      index: 0,
      name: 'test',
      workflowId: '',
      module: '' as unknown as StepHandler,
    });
    const task = new Task({ failedCount: 0, stepKey: step.key, data: 1, id: '' });
    await createTaskAndLock(task, score, 0);

    jest.advanceTimersByTime(checkProcessQueueInterval);
    expect(setInterval).toHaveBeenCalledWith(expect.any(Function), checkProcessQueueInterval);

    // get task process
    const tasks: string[] = await new Promise((resolve) => {
      client.zrangebyscore(DeFlow.processQueue, '-inf', '+inf', (err, res) => {
        expect(err).toBeNull();
        return resolve(res);
      });
    });

    // get lock
    const lock = await new Promise((resolve) => {
      client.get(DeFlow.processLockKey, (err, res) => {
        expect(err).toBeNull();
        return resolve(res);
      });
    });

    expect(lock).toBe(null);
    expect(tasks.length).toBe(1);

    await DeFlow.unregister();
  });
});

/**
 * Helper
 * @param task
 * @param taskScore
 * @param lockTime
 */
async function createTaskAndLock(task: Task, taskScore: number, lockTime: number): Promise<void> {
  // set a lock
  if (lockTime !== 0) {
    await new Promise((resolve) => {
      client.set(DeFlow.processLockKey, 'lock-exist', 'PX', lockTime, (err) => {
        expect(err).toBeNull();
        resolve(null);
      });
    });
  }

  // Set task process
  await new Promise((resolve) => {
    client.zadd(DeFlow.processQueue, taskScore.toString(), JSON.stringify(task), (err, res) => {
      expect(err).toBeNull();
      resolve(res);
    });
  });
}
