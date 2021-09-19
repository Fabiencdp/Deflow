import '../../helpers/redis';

import redis from 'redis';

import DeFlow, { WorkFlow } from '../../../src';
import { ConnectionOptions } from '../../../src/lib/Client';

import step1 from './steps/step1';

const connection: ConnectionOptions = { host: 'localhost' };
const client = redis.createClient(connection);

beforeEach(async () => {
  await client.flushall();
  DeFlow.register({ connection });
});

afterEach(async () => {
  await DeFlow.unregister();
});

afterAll(async () => {
  await DeFlow.unregister();
  await client.end(true);
});

describe('Series 1', () => {
  it('should create a new workflow', async () => {
    const workflow = await WorkFlow.create('test-simple')
      .addStep({
        step: step1,
        tasks: [1, 2, 3, 4, 5, 6],
      })
      .run();

    const expectedResult = {
      id: workflow.id,
      name: 'test-simple',
      queueId: `${workflow.id}:steps`,
      options: { ifExist: 'create', cleanOnDone: true },
    };

    const res = await new Promise((resolve) => {
      workflow.events.on('done', () => {
        client.get(workflow.id, (err, res) => {
          if (!res || err) {
            return resolve(null);
          }
          return resolve(JSON.parse(res));
        });
      });
    });

    expect(res).toStrictEqual(expectedResult);
  });

  it('should create two workflow', async () => {
    const w1 = WorkFlow.create('test-simple', { ifExist: 'create', cleanOnDone: false })
      .addStep({
        step: step1,
      })
      .run();

    const w2 = WorkFlow.create('test-simple', { ifExist: 'create', cleanOnDone: false })
      .addStep({
        step: step1,
      })
      .run();

    const res: string[] | null = await new Promise((resolve) => {
      w2.events.on('done', () => {
        client.keys('test-simple:*', (err, res) => {
          if (!res || err) {
            return resolve(null);
          }
          return resolve(res.filter((k) => k.endsWith(w1.id) || k.endsWith(w2.id)));
        });
      });
    });

    expect(res?.length).toBe(2);
  });

  it('should replace a workflow', async () => {
    const w1 = WorkFlow.create('test-replace', {
      ifExist: 'replace',
      cleanOnDone: false,
    })
      .addStep({
        step: step1,
        tasks: [1],
      })
      .run();

    // Wait the end of first workflow before creating a new one
    await new Promise<void>((resolve) => {
      w1.events.on('done', (res) => {
        expect(res.id).toBe(w1.id);
        resolve();
      });
    });

    const w2 = WorkFlow.create('test-replace', {
      ifExist: 'replace',
      cleanOnDone: false,
    })
      .addStep({
        step: step1,
        tasks: [2],
      })
      .run();

    // Wait the end
    await new Promise<void>((resolve) => {
      w2.events.on('done', (res) => {
        expect(res.id).toBe(w2.id);
        resolve();
      });
    });

    const res: string[] | null = await new Promise((resolve) => {
      client.keys('test-replace:*', (err, res) => {
        if (!res || err) {
          return resolve(null);
        }
        const regex = new RegExp(w2.id);
        return resolve(res.filter((r) => !r.match(regex)));
      });
    });

    expect(res?.length).toBe(0);
  });
});