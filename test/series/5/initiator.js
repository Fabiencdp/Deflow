const DeFlow = require('../../../dist/src');
const step1 = require('./steps/step1');

const arg = process.argv.find((arg) => arg.startsWith('--id'));
const id = parseInt(arg.replace('--id', '').replace('=', ''), 10);
process.env.NAME = id;

DeFlow.default.register({ connection: { host: 'localhost', port: 6379 } });

// Wait for redis connection ready
setTimeout(async () => {
  try {
    const tasks = [...Array(150).keys()];

    const workflow = await DeFlow.WorkFlow.create('test', {
      cleanOnDone: false,
      taskTimeout: 100,
      taskMaxFailCount: 2,
      taskFailRetryDelay: 100,
    })
      .addStep({
        step: step1,
        tasks,
      })
      .run();

    process.send({ id, workflowId: workflow.id, taskCount: tasks.length });

    workflow.events.on('nextTask', () => {
      throw new Error('crashed');
    });
  } catch (e) {
    process.exit();
  }
}, 1000);
