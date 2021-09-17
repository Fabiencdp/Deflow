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

describe.skip('Sharing tasks between 2 nodes', () => {
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
