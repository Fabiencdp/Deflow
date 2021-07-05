import Debug from 'debug';
import uuid from 'short-uuid';

import WorkFlow from '../lib/WorkFlow';
import DeFlow from './index';

const debug = Debug('WorkFlowManager');

export default class WorkFlowManager {
  static store(workFlow: WorkFlow): Promise<boolean> {
    const deFlow = DeFlow.getInstance();
    const data = JSON.stringify(workFlow);
    return new Promise((resolve) => {
      deFlow.client.set(workFlow.id, data, (err, status) => {
        return resolve(true);
      });
    });
  }

  static getNextStep(workFlow: WorkFlow): Promise<any> {
    const deFlow = DeFlow.getInstance();

    return new Promise((resolve) => {
      deFlow.client.command('ZPOP', [workFlow.id], (err, status) => {
        console.log(err, status);
      });
    });
  }
}
