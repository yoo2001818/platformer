import React from 'react';

import {Engine} from '../../core/Engine';

export const EngineContext = React.createContext<Engine | null>(null);

export interface EngineProviderProps {
  engine: Engine;
  children: React.ReactNode;
}

export function EngineProvider(props: EngineProviderProps): React.ReactElement {
  const {engine, children} = props;
  return (
    <EngineContext.Provider value={engine}>
      {children}
    </EngineContext.Provider>
  );
}
