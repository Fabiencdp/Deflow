import { RedisClient } from 'redis';

import Client from './Client';

describe('Client', () => {
  it('should init client', () => {
    const client = Client.createRedisClient({ connection: { host: 'localhost', port: 6379 } });
    expect(client instanceof RedisClient).toBe(true);
  });

  it('should emit ready', async () => {
    const client = Client.createRedisClient({ connection: {} });
    client.emit('ready');
    expect(client instanceof RedisClient).toBe(true);
  });

  it('should reconnect', async () => {
    const client = Client.createRedisClient({ connection: {} });
    client.emit('reconnecting');
    expect(client instanceof RedisClient).toBe(true);
  });

  it('should throw', async () => {
    try {
      const client = Client.createRedisClient({ connection: {} });
      for (let i = 1; i <= 10; i++) {
        client.emit('error', `error ${i}`);
      }
    } catch (e: any) {
      expect(e.message).toBe('error 10');
    }
  });
});
