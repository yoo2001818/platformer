import React, {useEffect, useRef} from 'react';
import {css, Global} from '@emotion/react';

import {create3DComponents} from '../../3d/create3DComponents';
import {Engine} from '../../core/Engine';
import {parseGLTF} from '../../loader/gltf';
import {Transform} from '../../3d/Transform';
import {GLTexture2D} from '../../render/gl/GLTexture2D';
import {createImage} from '../../render/utils/createImage';
import {generateCubePackEquirectangular} from '../../render/map/generateCubePack';
import {generatePBREnvMap} from '../../render/map/generatePBREnvMap';
import {Mesh} from '../../render/Mesh';
import {SkyboxMaterial} from '../../render/material/SkyboxMaterial';
import {Geometry} from '../../render/Geometry';
import {quad} from '../../geom/quad';
import {EnvironmentLight} from '../../render/light/EnvironmentLight';
import {initModels} from '../../editor/initModels';
import {DirectionalShadowLight} from '../../render/light/DirectionalShadowLight';

import {EngineProvider} from './EngineContext';
import {EntityList} from './EntityList';
import {LayoutTree, SplitList, SplitCell} from './LayoutTree';
import {Panel, PanelHeader, PanelContent} from './Panel';
import {EntityProperties} from './EntityProperties';
import {Viewport} from './Viewport';
import {MenuBar} from './MenuBar';

function initEngine(): Engine {
  const engine = new Engine();
  engine.entityStore.registerComponents(create3DComponents());
  engine.entityStore.append(parseGLTF(require('../../sample/models/cat.gltf')).entityStore.getEntities());
  engine.entityStore.create({
    name: 'Test',
    transform: {position: [0, 1, 0]},
  });
  initModels(engine);
  engine.entityStore.create({
    name: 'DirectionalLight',
    transform: new Transform()
      // .setPosition([-0.1792, 4.3322, -3.1509]),
      .setPosition([0.6899, 1.5984, 0.6409])
      .rotateY(30 / 180 * Math.PI)
      .rotateX(-35 / 180 * Math.PI),
    light: new DirectionalShadowLight({
      power: 5,
      color: '#ffffff',
    }),
  });

  /*
  engine.entityStore.create({
    name: 'ProbeLight',
    transform: new Transform()
      .setPosition([1.8099, 1.1495, -1.6352])
      .setScale([1.5468, 1.2735, 1.5468]),
    light: new ProbeGridLight(),
  });
  */
  const skyboxTexture = new GLTexture2D({
    width: 4096,
    height: 2048,
    format: 'rgba',
    source: createImage(require('./../../sample/studio_country_hall_2k.rgbe.png')),
    magFilter: 'nearest',
    minFilter: 'nearest',
    mipmap: false,
  });
  const mip = generateCubePackEquirectangular(
    null,
    skyboxTexture,
    'rgbe',
    'halfFloat',
    1024,
  );
  const pbrTexture = generatePBREnvMap(null, mip, 'halfFloat');
  engine.entityStore.create({
    name: 'skybox',
    transform: new Transform(),
    mesh: new Mesh(
      new SkyboxMaterial('skybox', {
        texture: pbrTexture,
        lod: 2,
        power: 0,
      }),
      new Geometry('quad', quad()),
      {castRay: false},
    ),
  });
  engine.entityStore.create({
    name: 'envLight',
    transform: new Transform(),
    light: new EnvironmentLight({texture: pbrTexture, power: 0}),
  });
  return engine;
}

export function App(): React.ReactElement {
  const engine = useRef<Engine | null>(null);
  if (engine.current == null) {
    engine.current = initEngine();
  }
  useEffect(() => {
    const engineVal = engine.current!;

    let animId: number;
    let lastTime = 0;

    function update(time: number) {
      const delta = time - lastTime;
      lastTime = time;

      engineVal.update(delta / 1000);

      animId = requestAnimationFrame(update);
    }

    animId = requestAnimationFrame(update);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, []);
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
        <SplitList direction="vertical">
          <MenuBar />
          <SplitCell size={1}>
            <SplitList direction="horizontal">
              <SplitCell size={0.8}>
                <Viewport />
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
          </SplitCell>
        </SplitList>
      </LayoutTree>
    </EngineProvider>
  );
}
