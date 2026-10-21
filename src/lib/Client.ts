import Debug from 'debug';
import redis, { ClientOpts, RedisClient } from 'redis';

const debug = Debug('deflow:Client');

export default class Client extends RedisClient {
  /**
   * Create a redis client
   */
  public static createRedisClient(redisClientOptions: ClientOpts): RedisClient {
    let attempts = 0;
    const maxAttempts = 10;

    const client = redis.createClient(redisClientOptions);

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
