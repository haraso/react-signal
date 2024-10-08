import { createSignalCollector } from './createSignalCollector';
import { getProtected, Signals } from './types';

export type Dispose = {
  (...signals: Signals[]): void;
  forceTrigger: () => void;
};

let runningEffect: () => void = null!;
export const getCurrentRunningEffectTrigger = () => runningEffect;

function createEffect(
  isLazy: boolean,
  handler: () => void,
  watch: Signals[] = [],
): Dispose {
  const {
    signals: collectedSignals,
    collectSignals,
    disposeCollect,
  } = createSignalCollector();
  let isRunning = false;

  const trigger = () => {
    runningEffect = trigger;
    const oldSignals = new Set(collectedSignals.toArray());
    collectedSignals.clear();
    collectSignals(watch);
    handler();
    disposeCollect();
    collectedSignals.forEach((s) => {
      getProtected(s)._addEffect(trigger);
      oldSignals.delete(s);
    });
    oldSignals.forEach((s) => getProtected(s)._removeEffect(trigger));
    runningEffect = null!;
  };

  const dispose = (...signals: Signals[]) => {
    if (signals.length)
      return signals.forEach((s) => {
        collectedSignals.delete(s);
        getProtected(s)._removeEffect(trigger);
      });

    collectedSignals.forEach((s) => {
      getProtected(s)._removeEffect(trigger);
    });
    collectedSignals.clear();
  };
  dispose.forceTrigger = trigger;

  if (isLazy) {
    watch.forEach((s) => collectedSignals.add(s));
    collectedSignals.forEach((s) => getProtected(s)._addEffect(trigger));
  } else {
    trigger();
  }

  return dispose;
}

export function effect(handler: () => void, watch?: Signals[]) {
  return createEffect(false, handler, watch);
}

export function lazyEffect(handler: () => void, watch: Signals[]) {
  return createEffect(true, handler, watch);
}
