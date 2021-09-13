import redis from 'redis';

import DeFlow, { WorkFlow } from '../../src';

import step1 from './steps/step1';

const client = redis.createClient();

beforeAll(async () => {
  DeFlow.register({ connection: {} });
  await client.flushall();
});

beforeEach(async () => {
  await client.flushall();
});

describe('simple workflow', () => {
  it('should create a new workflow', async () => {
    await client.flushall();

    const workflow = WorkFlow.create('test-simple').addStep({
      step: step1,
      tasks: [1, 2, 3, 4, 5, 6],
    });
    await workflow.run();

    const expectedResult = {
      id: workflow.id,
      name: 'test-simple',
      queueId: `${workflow.id}:steps`,
      options: { ifExist: 'create', cleanOnDone: true },
    };

    const res = await new Promise((resolve) => {
      client.get(workflow.id, (err, res) => {
        if (!res || err) {
          return resolve(null);
        }
        return resolve(JSON.parse(res));
      });
    });

    expect(res).toStrictEqual(expectedResult);
  });

  it('should create two workflow', async () => {
    const w1 = WorkFlow.create('test-simple', { ifExist: 'create', cleanOnDone: false }).addStep({
      step: step1,
    });
    await w1.run();

    const w2 = WorkFlow.create('test-simple', { ifExist: 'create', cleanOnDone: false }).addStep({
      step: step1,
    });
    await w2.run();

    const res: string[] | null = await new Promise((resolve) => {
      client.keys('test-simple:*', (err, res) => {
        if (!res || err) {
          return resolve(null);
        }
        return resolve(res.filter((k) => k.endsWith(w1.id) || k.endsWith(w2.id)));
      });
    });

    expect(res?.length).toBe(2);
  });

  it('should replace a workflow', async () => {
    const w1 = WorkFlow.create('test-replace', {
      ifExist: 'replace',
      cleanOnDone: false,
    }).addStep({
      step: step1,
      tasks: [1],
    });

    // Wait the end before creating new workflow
    await new Promise<void>((resolve) => {
      w1.run();
      w1.on('done', resolve);
    });

    const w2 = WorkFlow.create('test-replace', {
      ifExist: 'replace',
      cleanOnDone: false,
    }).addStep({
      step: step1,
    });
    await w2.run();

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
