import {useContext} from 'react';

import {EngineContext} from '../components/EngineContext';
import type {Engine} from '../../core/Engine';

export function useEngine(): Engine {
  const engine = useContext(EngineContext);
  if (engine == null) {
    throw new Error('EngineContext is not provided');
  }
  return engine;
}
