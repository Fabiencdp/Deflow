import EventEmitter from 'events';

import WorkFlow from './WorkFlow';

import DeFlow from './index';

export enum Action {
  NextStep,
  NextTask,
  Done,
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
    id: string;
    workflowId: string;
    stepKey: string;
    data: any;
  };
};

type SignalDone = Signal & {
  action: Action.Done;
  data: {
    workflowId: string;
  };
};

type Signals = SignalNextStep | SignalNextTask | SignalDone;

export default class PubSubManager {
  private static channel = 'dfw';

  static emitter = new EventEmitter();

  /**
   * Subscribe to any event
   */
  static async subscribe(): Promise<void> {
    const deFlow = DeFlow.getInstance();

    deFlow.subscriber.on('pmessage', (pattern, channel, json) => {
      const signal: Signals = JSON.parse(json);

      const deFlow = DeFlow.getInstance();

      if (signal.publisherId === deFlow.id) {
        PubSubManager.selfEvent(signal);
      } else {
        PubSubManager.registerEvent(signal);
      }
    });

    deFlow.subscriber.psubscribe(PubSubManager.channel);
  }

  /**
   * Leave out the channel
   */
  static async unsubscribe(): Promise<void> {
    const deFlow = DeFlow.getInstance();
    if (!deFlow) {
      return;
    }
    deFlow.subscriber.punsubscribe(PubSubManager.channel);
  }

  /**
   * @param signal
   */
  static registerEvent(signal: Signals): void {
    switch (signal.action) {
      case Action.NextStep:
        PubSubManager.nextStep(signal);
        break;
    }
  }

  /**
   * @param signal
   */
  static selfEvent(signal: Signals): void {
    switch (signal.action) {
      case Action.Done:
        PubSubManager.done(signal);
        break;
      case Action.NextTask:
        PubSubManager.nextTask(signal);
        break;
    }
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

  /**
   * Run next step
   * @param signal
   */
  static async nextTask(signal: SignalNextTask): Promise<void> {
    this.emitter.emit('nextTask', signal.data);
  }

  /**
   * On done
   * @param signal
   */
  static async done(signal: SignalDone): Promise<void> {
    const workflow = await WorkFlow.getById(signal.data.workflowId);
    if (!workflow) {
      console.error(`Unknown workflow ${signal.data.workflowId}`);
      return;
    }
    const results = await workflow.results();
    this.emitter.emit('done', results);
    this.emitter.removeAllListeners();
  }
}
