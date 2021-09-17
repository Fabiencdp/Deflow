const DeFlow = require('../../dist/src/index');

const arg = process.argv.find((arg) => arg.startsWith('--id'));
const id = parseInt(arg.replace('--id', '').replace('=', ''), 10);
process.env.NAME = id;

DeFlow.default.register({ connection: { host: 'localhost', port: 6379 } });

setTimeout(() => {
  // Wait for connection ready
  process.send(id);
}, 1000);
