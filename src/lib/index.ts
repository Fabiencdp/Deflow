import Debug from 'debug';
import Client from './Client';
import { RedisClient } from 'redis';
import PubSubManager from './PubSubManager';
import { uuid } from 'short-uuid';

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

  public id = uuid();

  constructor(options: DeFlowOptions) {
    this.client = Client.createRedisClient(options);
    this.subscriber = Client.createRedisClient(options);
    this.publisher = Client.createRedisClient(options);
    // TODO: remove
    this.client.flushall();
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
}
