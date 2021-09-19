import {useEffect, useState} from 'react';

import {AFTER_RENDER_PHASE, Engine} from '../../core/Engine';

import {useEngine} from './useEngine';

// TODO: Run diff-checking. Seriously.
export function useEngineValue<T>(
  callback: (engine: Engine) => T,
): T {
  const engine = useEngine();
  const [_, setVersion] = useState(0);
  useEffect(() => {
    const system = () => {
      setVersion((v) => v + 1);
    };
    engine.registerSystem(AFTER_RENDER_PHASE, system);
    return () => {
      engine.unregisterSystem(AFTER_RENDER_PHASE, system);
    };
  }, []);
  return callback(engine);
}

