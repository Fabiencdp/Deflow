import Debug from 'debug';
import redis, { RedisClient } from 'redis';

const debug = Debug('deflow:client');

import { DeFlowOptions } from './';

export default class Client extends RedisClient {
  /**
   * Create a redis client
   */
  public static createRedisClient(options: DeFlowOptions): RedisClient {
    const { connection } = options;

    let attempts = 1;
    const maxAttempts = 10;

    const client = redis.createClient({
      host: connection.host,
      port: connection.port,
      max_attempts: connection.maxAttempts,
      connect_timeout: connection.connectTimeout,
      retry_max_delay: connection.retryMaxDelay,
    });

    client.on('ready', () => {
      debug('clientReady');
    });

    client.on('reconnecting', () => {
      debug('clientReconnecting');
    });

    client.on('error', (e) => {
      attempts += 1;
      debug('clientError', attempts, e);
      if (attempts >= maxAttempts) {
        throw new Error(e);
      }
    });

    return client;
  }
}
