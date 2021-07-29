import Debug from 'debug';
import Client from './Client';
import { RedisClient } from 'redis';
import PubSubManager from './PubSubManager';
import { generate } from 'short-uuid';
import WorkFlow from './WorkFlow';
import Step from './Step';
import Task, { JSONTask } from './Task';

const debug = Debug('deflow');

export interface DeFlowOptions {
  connection: {
    host?: string;
    port?: number;
    maxAttempts?: number;
    connectTimeout?: number;
    retryMaxDelay?: number;
  };
}

export default class DeFlow {
  static instance: DeFlow;

  public client: RedisClient;
  public subscriber: RedisClient;
  public publisher: RedisClient;

  public id = generate();

  static WorkFlow = WorkFlow;

  static processLockKey = 'process-lock';
  static processQueue = 'process-queue';

  constructor(options: DeFlowOptions) {
    this.client = Client.createRedisClient(options);
    this.subscriber = Client.createRedisClient(options);
    this.publisher = Client.createRedisClient(options);

    setInterval(() => this.#checkProcessQueue(), 5000);
  }

  public static register(options: DeFlowOptions) {
    if (DeFlow.instance) {
      console.warn('You tried to register DeFlow more than once');
      return DeFlow.instance;
    }
    DeFlow.instance = new DeFlow(options);

    PubSubManager.subscribe();

    return DeFlow.instance;
  }

  public static getInstance() {
    if (!DeFlow.instance) {
      throw new Error('You must register a DeFlow Instance');
    }
    return DeFlow.instance;
  }

  async #checkProcessQueue(): Promise<void> {
    this.client.get(DeFlow.processLockKey, (err, res) => {
      if (res) {
        // Process is lock
        return;
      }

      this.client.sendCommand('ZPOPMIN', [DeFlow.processQueue], (err, res) => {
        if (err) {
          console.error(err);
        }

        if (res.length === 0) {
          return;
        }

        const [json] = res;
        const jsonTask: JSONTask = JSON.parse(json);
        if (jsonTask) {
          this.#restoreTask(jsonTask);
        }
      });
    });
  }

  /**
   * Restore a timeout task
   */
  async #restoreTask(jsonTask: JSONTask) {
    const task = new Task(jsonTask);
    Step.getByKey(task.stepKey).then((step) => {
      console.log('restore');
      const err = new Error('Unexpected Timeout');
      step.failTask(task, err).then(() => {
        step.runNextTask();
      });
    });
  }
}
