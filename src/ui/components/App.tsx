import React, {useRef} from 'react';
import {css, Global} from '@emotion/react';
import {RecoilRoot} from 'recoil';

import {create3DComponents} from '../../3d/create3DComponents';
import {Engine} from '../../core/Engine';
import {parseGLTF} from '../../loader/gltf';
import {Transform} from '../../3d/Transform';
import {Camera} from '../../3d/Camera';
import {PointLight} from '../../render/light/PointLight';

import {EngineProvider} from './EngineContext';
import {EntityList} from './EntityList';
import {LayoutTree, SplitList, SplitCell} from './LayoutTree';
import {Panel, PanelHeader, PanelContent} from './Panel';
import {EntityProperties} from './EntityProperties';
import {Viewport} from './Viewport';

function initEngine(): Engine {
  const engine = new Engine();
  engine.entityStore.registerComponents(create3DComponents());
  engine.entityStore.createEntities(parseGLTF(require('../../sample/models/gi.gltf')).entities);
  engine.entityStore.create({
    name: 'Test',
    transform: {position: [0, 1, 0]},
  });
  engine.entityStore.create({
    transform: new Transform()
      .rotateY(Math.PI / 2)
      // .rotateY(Math.PI / 4)
      // .rotateX(-Math.PI * 0.4 / 4)
      .translate([0, 0, 40]),
    camera: new Camera({
      type: 'perspective',
      fov: 70 / 180 * Math.PI,
      far: 1000,
      near: 0.3,
    }),
  });
  engine.entityStore.create({
    name: 'pointLight',
    transform: new Transform()
      .translate([0, 1, 0]),
    light: new PointLight({color: '#ffffff', power: 1, radius: 10, range: 10}),
  });
  return engine;
}

export function App(): React.ReactElement {
  const engine = useRef<Engine | null>(null);
  if (engine.current == null) {
    engine.current = initEngine();
  }
  return (
    <RecoilRoot>
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
              <Panel>
                <PanelHeader>
                  Viewport
                </PanelHeader>
                <PanelContent>
                  <Viewport />
                </PanelContent>
              </Panel>
            </SplitCell>
            <SplitCell size={0.2}>
              <SplitList direction="vertical">
                <SplitCell size={0.4}>
                  <Panel>
                    <PanelHeader>
                      Hierarchy
                    </PanelHeader>
                    <PanelContent>
                      <EntityList />
                    </PanelContent>
                  </Panel>
                </SplitCell>
                <SplitCell size={0.6}>
                  <Panel>
                    <PanelHeader>
                      Properties
                    </PanelHeader>
                    <PanelContent>
                      <EntityProperties />
                    </PanelContent>
                  </Panel>
                </SplitCell>
              </SplitList>
            </SplitCell>
          </SplitList>
        </LayoutTree>
    </EngineProvider>
    </RecoilRoot>
  );
}
