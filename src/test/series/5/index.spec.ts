import '../../helpers/redis';

import redis from 'redis';

import { ConnectionOptions } from '../../../lib/Client';
import DeFlow from '../../../lib';
import { WorkFlow } from '../../../index';
import { createNodes, killNodes } from '../../helpers/listener';
import PubSubManager from '../../../lib/PubSubManager';

process.env.NAME = 'listener';

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

// TODO: fix test
describe.skip('Series 5', () => {
  it('should work when the workflow initiator node crash', async () => {
    const [node] = await createNodes<{ id: string; workflowId: string; taskCount: number }>(1, {
      cwd: __dirname,
      file: './initiator.js',
    });
    const { workflowId, taskCount } = node;

    let workflow = await WorkFlow.getById(workflowId);
    expect(workflow).not.toBe(undefined);

    const doneWorkflowData = await new Promise<any>((resolve) => {
      PubSubManager.emitter.on('done', (data) => {
        resolve(data);
      });
    });

    expect(doneWorkflowData?.workflowId).toBe(workflow?.id);

    workflow = await WorkFlow.getById(workflowId);
    const result = await workflow?.results();

    expect(result?.steps[0].taskCount).toBe(taskCount);
    expect(result?.steps[0].tasks.length).toBe(taskCount);
  });
});
