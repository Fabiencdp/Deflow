import { execSync, fork, ChildProcess } from 'child_process';

import '../helpers/redis';

import redis from 'redis';

import { ConnectionOptions } from '../../src/lib/Client';
import DeFlow from '../../src/lib';
import { StepHandler, Task, WorkFlow } from '../../src';
import { WorkFlowResult } from '../../src/lib/WorkFlow';

import step1 from './steps/step1.js';

jest.setTimeout(15000);
process.env.NAME = 'creator';

const checkProcessQueueInterval = 1000;
const connection: ConnectionOptions = { host: 'localhost', port: 6379 };

const client = redis.createClient(connection);

const listeners: ChildProcess[] = [];
function resetListeners() {
  const ps = execSync(`ps -ef | grep '/node ./listener.js' | awk '{print $2}'`);
  const toKill = ps
    .toString()
    .split('\n')
    .filter((v) => v);

  toKill.forEach((pid) => {
    try {
      process.kill(parseInt(pid));
    } catch (e) {
      // Silent
    }
  });

  listeners.length = 0;
}

async function createListeners(nb: number): Promise<string[]> {
  resetListeners();
  const array = [...Array(nb).keys()];
  const promises: Promise<string>[] = array.map(async (x) => {
    return new Promise((resolve) => {
      const listener = fork('./listener.js', [`--id=${x}`], {
        cwd: __dirname,
        silent: true,
      });
      listeners.push(listener);
      listener.on('message', (id: string) => resolve(id));
    });
  });
  return Promise.all(promises);
}

beforeAll(async () => {
  await client.flushall();
});

beforeEach(async () => {
  DeFlow.register({ connection, checkProcessQueueInterval });
});

afterEach(async () => {
  resetListeners();
  await DeFlow.unregister();
});

afterAll(async () => {
  await client.end(true);
  resetListeners();
});

describe('Sharing tasks between 2 nodes', () => {
  it('should share tasks equally on two nodes', async () => {
    const ids = await createListeners(1);

    const workflow = await WorkFlow.create('multi')
      .addStep({
        step: step1 as StepHandler,
        tasks: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
      })
      .run();

    const data: WorkFlowResult = await new Promise((resolve) => {
      workflow.events.on('done', resolve);
    });

    const result = data.steps[0].tasks
      .map((t) => t.result)
      .reduce((acc, res) => {
        if (!acc[res.name]) {
          acc[res.name] = [];
        }
        acc[res.name].push(res.value);
        return acc;
      }, {});

    const includes = result[ids[0]].some((item: number) => result.creator.includes(item));
    expect(includes).toBe(false);
    expect(result[ids[0]].length).toBeGreaterThan(0);
    expect(result.creator.length).toBeGreaterThan(0);
  }, 10000);
});

describe('Sharing tasks between 4 nodes', () => {
  it('should share tasks equally on four nodes', async () => {
    const ids = await createListeners(3);

    const workflow = await WorkFlow.create('multi', { cleanOnDone: true })
      .addStep({
        step: step1 as StepHandler,
        tasks: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
      })
      .addStep({
        step: step1 as StepHandler,
        tasks: [110, 120, 130, 140, 150, 160, 170, 180, 190, 200],
      })
      .run();

    const data: WorkFlowResult = await new Promise((resolve) => {
      workflow.events.on('done', (data) => {
        resolve(data);
      });
    });

    // Should return steps data even with cleanup
    expect(data.steps.length).toBeGreaterThan(0);

    const tasks = data.steps.reduce((acc: Task[], step) => [...acc, ...step.tasks], []);

    const result = tasks
      .map((t) => t.result)
      .reduce((acc, res) => {
        if (!acc[res.name]) {
          acc[res.name] = [];
        }
        acc[res.name].push(res.value);
        return acc;
      }, {});

    resetListeners();

    expect(result.creator.length).toBeGreaterThan(0);

    ids.forEach((id) => {
      const includes = result[id].some((item: number) => result.creator.includes(item));
      expect(includes).toBe(false);
      expect(result[id].length).toBeGreaterThan(0);
    });
  }, 10000);
});

describe('Events between 9 nodes', () => {
  it('should correctly handle nextTask events', async () => {
    await createListeners(9);

    const tasksData = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

    let nextTaskEventCount = 0;
    const expectedNextTaskEventCount = tasksData.length * 2;

    const workflow = WorkFlow.create('events', { cleanOnDone: true })
      .addStep({
        step: step1 as StepHandler,
        tasks: tasksData,
      })
      .addStep({
        step: step1 as StepHandler,
        tasks: tasksData,
      })
      .run();

    workflow.events.on('nextTask', () => {
      nextTaskEventCount += 1;
    });

    const data: WorkFlowResult = await new Promise((resolve) => {
      workflow.events.on('done', (data) => {
        resolve(data);
      });
    });

    // Should return steps data even with cleanup
    expect(data.steps.length).toBe(2);
    expect(nextTaskEventCount).toBe(expectedNextTaskEventCount);
  }, 10000);

  it('should correctly handle done events', async () => {
    await createListeners(3);

    const tasksData = [10, 20, 30];

    let nextTaskEventCount = 0;
    const done: string[] = [];

    const w1 = WorkFlow.create('event-1', { cleanOnDone: true })
      .addStep({ step: step1 as StepHandler, tasks: tasksData })
      .run();

    const w2 = WorkFlow.create('event-2', { cleanOnDone: true })
      .addStep({ step: step1 as StepHandler, tasks: tasksData })
      .run();

    const w3 = WorkFlow.create('event-3', { cleanOnDone: true })
      .addStep({ step: step1 as StepHandler, tasks: tasksData })
      .run();

    w1.events.on('nextTask', () => {
      nextTaskEventCount += 1;
    });

    w2.events.on('nextTask', () => {
      nextTaskEventCount += 1;
    });

    w3.events.on('nextTask', () => {
      nextTaskEventCount += 1;
    });

    await new Promise<void>((resolve) => {
      function onDone(w: WorkFlow) {
        done.push(w.name);
        if (done.length >= 3) {
          resolve();
        }
      }

      w1.events.on('done', onDone);
      w2.events.on('done', onDone);
      w3.events.on('done', onDone);
    });

    done.sort();

    expect(done.length).toBe(3);
    expect(done).toStrictEqual(['event-1', 'event-2', 'event-3']);
    expect(nextTaskEventCount).toBe(9);
  }, 10000);
});
