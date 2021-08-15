import * as path from 'path';

import DeFlow, { WorkFlow } from '../../src';

import { SimpleStep2 } from './steps/step-2';
import { SimpleStep1 } from './steps/step-1';

console.clear();

DeFlow.register({ connection: { host: 'localhost', port: 6379 } });

setTimeout(() => {
  createSimpleWorkflow();
}, 2000);

/**
 * Workflow test file
 */
async function createSimpleWorkflow(): Promise<void> {
  await WorkFlow.create('simple', { ifExist: 'replace' })
    .addStep<SimpleStep1>({
      name: 'step1: Parser',
      module: path.resolve(__dirname, './steps/step-1'),
      tasks: ['1.1', '2.4', '2.89', '10', '5'],
    })
    .addStep<SimpleStep2>({
      name: 'Step2: Transformer',
      module: path.resolve(__dirname, './steps/step-2'),
    })
    .run();
}
