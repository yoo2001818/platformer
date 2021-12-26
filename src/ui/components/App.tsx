import React, {useEffect, useRef} from 'react';
import {css, Global} from '@emotion/react';

import {create3DComponents} from '../../3d/create3DComponents';
import {Engine} from '../../core/Engine';
import {parseGLTF} from '../../loader/gltf';
import {Transform} from '../../3d/Transform';
import {PointLight} from '../../render/light/PointLight';
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

import {EngineProvider} from './EngineContext';
import {EntityList} from './EntityList';
import {LayoutTree, SplitList, SplitCell} from './LayoutTree';
import {Panel, PanelHeader, PanelContent} from './Panel';
import {EntityProperties} from './EntityProperties';
import {Viewport} from './Viewport';

function initEngine(): Engine {
  const engine = new Engine();
  engine.entityStore.registerComponents(create3DComponents());
  engine.entityStore.createEntities(parseGLTF(require('../../sample/models/pri-home5.gltf')).entities);
  engine.entityStore.create({
    name: 'Test',
    transform: {position: [0, 1, 0]},
  });
  initModels(engine);
  engine.entityStore.create({
    name: 'PointLight',
    transform: new Transform()
      .translate([0, 0.2, 0.6]),
    light: new PointLight({color: '#ffffff', power: 5, radius: 10, range: 12}),
  });
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
      new SkyboxMaterial({
        texture: pbrTexture,
        lod: 2,
      }),
      new Geometry(quad()),
      {castRay: false},
    ),
  });
  engine.entityStore.create({
    name: 'envLight',
    transform: new Transform(),
    light: new EnvironmentLight({texture: pbrTexture, power: 1}),
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
      </LayoutTree>
    </EngineProvider>
  );
}
