import React, {useRef} from 'react';

import {create3DComponents} from '../../3d/create3DComponents';
import {Engine} from '../../core/Engine';
import {parseGLTF} from '../../loader/gltf';

import {EngineProvider} from './EngineContext';
import {EntityList} from './EntityList';

export function App(): React.ReactElement {
  const engine = useRef<Engine | null>(null);
  if (engine.current == null) {
    engine.current = new Engine();
    const engineVal = engine.current;
    engineVal.entityStore.registerComponents(create3DComponents());
    engineVal.entityStore.createEntities(parseGLTF(require('../../sample/models/gi.gltf')).entities);
    engineVal.entityStore.create({
      name: 'Test',
      transform: {position: [0, 1, 0]},
    });
  }
  return (
    <EngineProvider engine={engine.current}>
      <EntityList />
      <pre>
        { JSON.stringify(engine.current, null, 2) }
      </pre>
    </EngineProvider>
  );
}
