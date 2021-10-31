import {useEffect, useState} from 'react';

import {Engine} from '../../core/Engine';
import {Signal} from '../../core/Signal';

import {useEngine} from './useEngine';

export function useEngineValue<T>(
  callback: (engine: Engine) => T,
  getSignals: (engine: Engine, value: T) => (Signal | null | undefined)[],
  deps: any[],
): T {
  const engine = useEngine();
  const [_, setVersion] = useState(0);
  useEffect(() => {
    const signals = getSignals(engine, callback(engine));
    const handler = () => {
      setVersion((v) => v + 1);
    };
    signals.forEach((signal) => signal?.add(handler));
    return () => {
      signals.forEach((signal) => signal?.remove(handler));
    };
  }, [engine, ...deps]);
  return callback(engine);
}

