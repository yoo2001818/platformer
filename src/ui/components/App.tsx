import React, {useRef} from 'react';
import {css, Global} from '@emotion/react';

import {create3DComponents} from '../../3d/create3DComponents';
import {Engine} from '../../core/Engine';
import {parseGLTF} from '../../loader/gltf';

import {EngineProvider} from './EngineContext';
import {EntityList} from './EntityList';
import {LayoutTree, SplitList, SplitCell} from './LayoutTree';
import {PanelHeader} from './PanelHeader';

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
      <Global
        styles={css`
          html, body, #root {
            width: 100%;
            height: 100%;
            margin: 0;
          }
        `}
      />
      <LayoutTree>
        <SplitList direction="horizontal">
          <SplitCell size={0.8}>
            <PanelHeader>
              Canvas
            </PanelHeader>
          </SplitCell>
          <SplitCell size={0.2}>
            <SplitList direction="vertical">
              <SplitCell size={0.4}>
                <PanelHeader>
                  Hierarchy
                </PanelHeader>
                <EntityList />
              </SplitCell>
              <SplitCell size={0.6}>
                <PanelHeader>
                  Inspector
                </PanelHeader>
              </SplitCell>
            </SplitList>
          </SplitCell>
        </SplitList>
      </LayoutTree>
    </EngineProvider>
  );
}
