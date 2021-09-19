const StepHandler = require('../../../../dist/src/lib/StepHandler');

const stepHandler = new StepHandler.default({
  handler(task) {
    return { name: process.env.NAME, value: task.data };
  },
});

module.exports = stepHandler;
