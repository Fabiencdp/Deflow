import WorkFlow from './WorkFlow';

import DeFlow from './index';

export enum Action {
  NextStep,
  NextTask,
}
type Signal = {
  publisherId: string;
};

type SignalNextStep = Signal & {
  action: Action.NextStep;
  data: {
    stepKey: string;
    workflowId: string;
  };
};

type SignalNextTask = Signal & {
  action: Action.NextTask;
  data: {
    workflowId: string;
    stepKey: string;
  };
};

type Signals = SignalNextStep | SignalNextTask;

export default class PubSubManager {
  private static channel = 'dfw';

  /**
   * Subscribe to any event
   */
  static async subscribe(): Promise<void> {
    const deFlow = DeFlow.getInstance();

    deFlow.subscriber.on('pmessage', (pattern, channel, json) => {
      const signal: Signals = JSON.parse(json);

      const deFlow = DeFlow.getInstance();
      if (signal.publisherId === deFlow.id) {
        return;
      }

      switch (signal.action) {
        case Action.NextStep:
          PubSubManager.nextStep(signal);
          break;
      }
    });

    deFlow.subscriber.psubscribe(PubSubManager.channel);
  }

  /**
   * Publish an event
   * @param signal
   */
  static async publish(signal: Omit<Signals, 'publisherId'>): Promise<void> {
    const deFlow = DeFlow.getInstance();
    const publisherId = deFlow.id;
    const data = { ...signal, action: signal.action, publisherId };
    const jsonSignal = JSON.stringify(data);
    deFlow.publisher.publish(PubSubManager.channel, jsonSignal);
  }

  /**
   * Run next step
   * @param signal
   */
  static async nextStep(signal: SignalNextStep): Promise<void> {
    return WorkFlow.runStep(signal.data.stepKey);
  }
}
