import Debug from 'debug';

import Step from '../lib/Step';
import DeFlow from './index';

const debug = Debug('StepManager');

export default class StepManager {
  static store(step: Step): Promise<boolean[]> {
    const deFlow = DeFlow.getInstance();

    const list = [step.workflowId, 'steps'].join(':');
    const id = [step.workflowId, step.id].join(':');
    const data = JSON.stringify(step);

    const stepData = new Promise<boolean>((resolve) => {
      deFlow.client.set(id, data, (err, status) => {
        return resolve(true);
      });
    });

    const queueData = new Promise<boolean>((resolve) => {
      deFlow.client.zadd(list, step.index, data, (err, status) => {
        return resolve(true);
      });
    });

    return Promise.all([stepData, queueData]);
  }
}
