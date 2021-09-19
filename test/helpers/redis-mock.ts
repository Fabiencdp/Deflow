jest.mock('redis', () => {
  const mod = jest.requireActual('redis-mock');

  // Monkey patch: Add missing send_command
  mod.RedisClient.prototype.send_command = (
    command: string,
    args: string[],
    cb?: (err: any, res: any) => any
  ) => {
    if (!cb) {
      cb = () => {
        /* void */
      };
    }

    if (command === 'ZPOPMIN') {
      const client = mod.createClient();
      return client
        .multi()
        .zrange(args[0], 0, 0)
        .zremrangebyrank(args[0], 0, 0)
        .exec((err: any, replies: any) => {
          client.end();
          if (err) {
            return cb && cb(err, null);
          }
          if (!replies || replies.length === 0) {
            return cb && cb(null, replies);
          }
          return cb && cb(null, replies[0]);
        });
    } else {
      return cb('not implemented', null);
    }
  };

  return mod;
});
