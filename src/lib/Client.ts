import redis, { RedisClient } from 'redis';

import { DeFlowOptions } from './index';

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

    client.on('error', (e) => {
      attempts += 1;
      if (attempts >= maxAttempts) {
        throw new Error(e);
      }
    });

    return client;
  }
}
