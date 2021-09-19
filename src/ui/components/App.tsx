import React, {useRef} from 'react';

import {Engine} from '../../core/Engine';

import {EngineProvider} from './EngineContext';

export function App(): React.ReactElement {
  const engine = useRef<Engine | null>(null);
  if (engine.current == null) {
    engine.current = new Engine();
  }
  return (
    <EngineProvider engine={engine.current}>
      <div>
        { JSON.stringify(engine.current, null, 2) }
      </div>
    </EngineProvider>
  );
}
