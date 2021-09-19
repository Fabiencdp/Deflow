import Debug from 'debug';
import redis, { RedisClient } from 'redis';

const debug = Debug('deflow:client');

export type ConnectionOptions = {
  host: string;
  port?: number;
  maxAttempts?: number;
  connectTimeout?: number;
  retryMaxDelay?: number;
};

export default class Client extends RedisClient {
  /**
   * Create a redis client
   */
  public static createRedisClient(connection: ConnectionOptions): RedisClient {
    let attempts = 0;
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
        const error = new Error(e);
        throw error;
      }
    });

    return client;
  }
}
