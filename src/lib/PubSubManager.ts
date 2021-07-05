import DeFlow from './index';
import { WorkFlow } from '../index';

export enum Action {
  Run,
}

interface Signal {
  action: Action;
  data: any;
}

export default class PubSubManager {
  private static channel = 'dfw';

  static async subscribe() {
    const deflow = DeFlow.getInstance();

    deflow.subscriber.on('pmessage', (pattern, channel, json) => {
      console.log('message', json);
      const data: Signal = JSON.parse(json);

      switch (data.action) {
        case Action.Run:
          PubSubManager.onRun(data.data);
      }
    });

    deflow.subscriber.psubscribe(PubSubManager.channel);
  }

  static async signal(signal: Signal) {
    const deflow = DeFlow.getInstance();
    const jsonSignal = JSON.stringify(signal);
    deflow.publisher.publish(PubSubManager.channel, jsonSignal);
  }

  static async onRun(data: any) {
    console.log('onRun', data);
    const deflow = DeFlow.getInstance();

    deflow.client.get(data.workFlowId, (err, res) => {
      console.log(err, res);
      if (err || !res) {
        throw new Error(err ? err.message : 'empty');
      }
      const data = JSON.parse(res);
      const workFlowInstance = new WorkFlow(data);

      return workFlowInstance.nextStep();
    });
  }
}
