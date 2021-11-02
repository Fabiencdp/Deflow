import EventEmitter from 'events';

import WorkFlow from './WorkFlow';

import DeFlow from './index';

export enum Action {
  NextStep,
  NextTask,
  Done,
  Throw,
}

type Signal = {
  publisherId: string;
};

export type SignalNextStep = Signal & {
  action: Action.NextStep;
  data: {
    stepKey: string;
    workflowId: string;
  };
};

export type SignalNextTask = Signal & {
  action: Action.NextTask;
  data: {
    id: string;
    workflowId: string;
    stepKey: string;
    data: any;
  };
};

export type SignalDone = Signal & {
  action: Action.Done;
  data: {
    workflowId: string;
  };
};

export type SignalThrow = Signal & {
  action: Action.Throw;
  data: {
    workflowId: string;
    error: string;
  };
};

type Signals = SignalNextStep | SignalNextTask | SignalDone | SignalThrow;

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
      case Action.Done:
        PubSubManager.done(signal);
        break;
      case Action.NextStep:
        PubSubManager.nextStep(signal);
        break;
      case Action.NextTask:
        PubSubManager.nextTask(signal);
        break;
      case Action.Throw:
        PubSubManager.throw(signal);
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
      case Action.Throw:
        PubSubManager.throw(signal);
        break;
    }
  }

  /**
   * Publish an event
   * @param signal
   */
  static async publish<S extends Signals>(signal: Omit<S, 'publisherId'>): Promise<void> {
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
    PubSubManager.emitter.emit('nextTask', signal.data);
  }

  /**
   * On done
   * @param signal
   */
  static async done(signal: SignalDone): Promise<void> {
    PubSubManager.emitter.emit('done', signal.data);
  }

  /**
   * On throw
   * @param signal
   */
  static async throw(signal: SignalThrow): Promise<void> {
    PubSubManager.emitter.emit('throw', signal.data);
  }
}
