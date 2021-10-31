import {useEffect, useState} from 'react';

import {Engine} from '../../core/Engine';
import {Signal} from '../../core/Signal';

import {useEngine} from './useEngine';

export interface SignalComparator {
  signals: (Signal | null | undefined)[];
  getVersion: () => number;
}

export function useEngineValue<T>(
  callback: (engine: Engine) => T,
  getSignals: (engine: Engine, value: T) => SignalComparator,
  deps: any[],
): T {
  const engine = useEngine();
  const [_, setVersion] = useState(0);
  useEffect(() => {
    const {signals, getVersion} = getSignals(engine, callback(engine));
    let prevVersion = engine.entityStore.version;
    const handler = () => {
      const currVersion = getVersion();
      if (prevVersion !== currVersion) {
        setVersion((v) => v + 1);
        prevVersion = currVersion;
      }
    };
    signals.forEach((signal) => signal?.add(handler));
    return () => {
      signals.forEach((signal) => signal?.remove(handler));
    };
  }, [engine, ...deps]);
  return callback(engine);
}

