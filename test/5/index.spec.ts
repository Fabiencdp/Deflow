import { fork, ChildProcess } from 'child_process';

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
  listeners.forEach((listener) => {
    listener.kill('SIGTERM');
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

describe('Sharing tasks between 4 nodes', () => {
  it('should share tasks equally on four nodes', async () => {
    const ids = await createListeners(3);

    const workflow = await WorkFlow.create('multi')
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
      workflow.events.on('done', resolve);
    });

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
  });
});
