// jest.mock('redis', () => {
//   const mod = jest.requireActual('redis-mock');
//
//   // Monkey patch: Add missing send_command
//   mod.RedisClient.prototype.send_command = (command, args, cb) => {
//     if (!cb) {
//       cb = () => {
//         /* void */
//       };
//     }
//
//     if (command === 'ZPOPMIN') {
//       const client = mod.createClient();
//       return client
//         .multi()
//         .zrange(args[0], 0, 0)
//         .zremrangebyrank(args[0], 0, 0)
//         .exec((err, replies) => {
//           client.end();
//           if (err) {
//             return cb(err, null);
//           }
//           if (!replies || replies.length === 0) {
//             return cb(null, replies);
//           }
//           return cb(null, replies[0]);
//         });
//     } else {
//       return cb('not implemented', null);
//     }
//   };
//
//   return mod;
// });
