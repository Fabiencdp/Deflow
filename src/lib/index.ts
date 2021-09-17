import Debug from 'debug';
import { RedisClient } from 'redis';
import { generate } from 'short-uuid';

import Client, { ConnectionOptions } from './Client';
import PubSubManager from './PubSubManager';
import WorkFlow from './WorkFlow';
import Step from './Step';
import Task, { JSONTask } from './Task';

const debug = Debug('deflow');

export interface DeFlowOptions {
  connection: ConnectionOptions;
  checkProcessQueueInterval?: number;
}

const defaultOptions: Partial<DeFlowOptions> = {
  checkProcessQueueInterval: 2000,
};

export default class DeFlow {
  static instance: DeFlow | undefined;

  public client: RedisClient;
  public subscriber: RedisClient;
  public publisher: RedisClient;

  public id = generate();

  static WorkFlow = WorkFlow;

  static processLockKey = 'process-lock';
  static processQueue = 'process-queue';

  #checkInterval?: NodeJS.Timer;

  /**
   * Create deflow instance
   * @param opts
   */
  constructor(opts: DeFlowOptions) {
    const options: DeFlowOptions = { ...defaultOptions, ...opts };
    this.client = Client.createRedisClient(options.connection);
    this.subscriber = Client.createRedisClient(options.connection);
    this.publisher = Client.createRedisClient(options.connection);

    if (options.checkProcessQueueInterval && options.checkProcessQueueInterval > 0) {
      this.#checkInterval = setInterval(
        () => this.#checkProcessQueue(),
        options.checkProcessQueueInterval
      );
    }
  }

  /**
   * Register the instance
   * Subscribe to messages
   * @param options
   */
  public static register(options: DeFlowOptions): DeFlow {
    if (DeFlow.instance) {
      console.warn('You tried to register DeFlow more than once');
      return DeFlow.instance;
    }
    DeFlow.instance = new DeFlow(options);

    PubSubManager.subscribe();

    return DeFlow.instance;
  }

  /**
   * leave instance connection
   */
  public static async unregister(): Promise<void> {
    const { instance } = DeFlow;
    if (!instance) {
      return;
    }

    await PubSubManager.unsubscribe();

    await instance.client.end(false);
    await instance.publisher.end(false);
    await instance.subscriber.end(false);

    if (instance.#checkInterval) {
      clearInterval(instance.#checkInterval);
    }

    DeFlow.instance = undefined;
  }

  /**
   * Singleton get instance method
   */
  public static getInstance(): DeFlow {
    if (!DeFlow.instance) {
      throw new Error('You must register a DeFlow Instance');
    }
    return DeFlow.instance;
  }

  /**
   * Check the lock expiration and run task cleanup
   */
  async #checkProcessQueue(): Promise<void> {
    if (!this.client.connected) {
      return;
    }

    this.client.get(DeFlow.processLockKey, (err, res) => {
      if (res) {
        // Process is lock
        return;
      }

      this.client.send_command('ZPOPMIN', [DeFlow.processQueue], (err, res) => {
        if (err) {
          console.error(err);
          return;
        }

        if (!res || res.length === 0) {
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
  async #restoreTask(jsonTask: JSONTask): Promise<void> {
    const task = new Task(jsonTask);
    Step.getByKey(task.stepKey).then((step) => {
      debug('Restore Task of', step.name);
      const err = new Error('Unexpected Timeout');
      step.failTask(task, err).then(() => {
        step.runNextTask();
      });
    });
  }
}
