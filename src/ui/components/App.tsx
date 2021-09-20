import React, {useRef} from 'react';

import {create3DComponents} from '../../3d/create3DComponents';
import {Engine} from '../../core/Engine';

import {EngineProvider} from './EngineContext';

export function App(): React.ReactElement {
  const engine = useRef<Engine | null>(null);
  if (engine.current == null) {
    engine.current = new Engine();
    const engineVal = engine.current;
    engineVal.entityStore.registerComponents(create3DComponents());
    engineVal.entityStore.create({
      name: 'Test',
      transform: {position: [0, 1, 0]},
    });
  }
  return (
    <EngineProvider engine={engine.current}>
      <pre>
        { JSON.stringify(engine.current, null, 2) }
      </pre>
    </EngineProvider>
  );
}
