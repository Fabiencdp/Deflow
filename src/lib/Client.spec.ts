import '../../test/helpers/redis-mock';
import { RedisClient } from 'redis';

import Client, { ConnectionOptions } from './Client';

const connection: ConnectionOptions = { host: 'localhost', port: 6379 };

describe('Client', () => {
  it('should init client', () => {
    const client = Client.createRedisClient(connection);
    expect(client instanceof RedisClient).toBe(true);
  });

  it('should emit ready', async () => {
    const client = Client.createRedisClient(connection);
    client.emit('ready');
    expect(client instanceof RedisClient).toBe(true);
  });

  it('should reconnect', async () => {
    const client = Client.createRedisClient(connection);
    client.emit('reconnecting');
    expect(client instanceof RedisClient).toBe(true);
  });

  it('should throw', async () => {
    try {
      const client = Client.createRedisClient(connection);
      for (let i = 1; i <= 10; i++) {
        client.emit('error', `error ${i}`);
      }
    } catch (e: any) {
      expect(e.message).toBe('error 10');
    }
  });
});
