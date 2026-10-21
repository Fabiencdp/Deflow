const DeFlow = require('../../../../src/index');

const arg = process.argv.find((arg) => arg.startsWith('--id'));
const id = parseInt(arg.replace('--id', '').replace('=', ''), 10);
process.env.NAME = id;

DeFlow.default.register({ connection: { url: 'redis://localhost:6379' } });

setTimeout(() => {
  // Wait for redis connection ready
  process.send(id);
}, 1000);
