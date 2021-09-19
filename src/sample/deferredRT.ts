import {vec3} from 'gl-matrix';

import {Renderer} from '../render/Renderer';
import {Geometry} from '../render/Geometry';
import {StandardMaterial} from '../render/material/StandardMaterial';
import {GLRenderer} from '../render/gl/GLRenderer';
import {calcTangents} from '../geom/calcTangents';
import {quad} from '../geom/quad';
import {Transform} from '../3d/Transform';
import {Camera} from '../3d/Camera';
import {Mesh} from '../render/Mesh';
import {GLTexture2D} from '../render/gl/GLTexture2D';
import {createImage} from '../render/utils/createImage';
import {OrbitCameraController} from '../input/OrbitCameraController';
import {generateCubePackEquirectangular} from '../render/map/generateCubePack';
import {generatePBREnvMap} from '../render/map/generatePBREnvMap';
import {getHDRType} from '../render/hdr/utils';
import {SkyboxMaterial} from '../render/material/SkyboxMaterial';
import {EnvironmentLight} from '../render/light/EnvironmentLight';
import {calcNormals} from '../geom/calcNormals';
import {GLTextureImage} from '../render/gl/GLTextureImage';
import {parseGLTF} from '../loader/gltf';
import {updateAnimation} from '../anim/updateAnimation';
import {create3DComponents} from '../3d/create3DComponents';
import {WorldBVH} from '../render/raytrace/WorldBVH';
import {DeferredPipeline} from '../render/pipeline/DeferredPipeline';
import {RaytraceEffect} from '../render/deferredEffect/RaytraceEffect';
import {Engine, RENDER_PHASE, UPDATE_PHASE} from '../core/Engine';

const engine = new Engine();
const store = engine.entityStore;

store.registerComponents(create3DComponents());

function main() {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl2', {antialias: false}) || canvas.getContext('webgl');

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  document.body.appendChild(canvas);

  if (gl == null) {
    alert('WebGL is not supported');
    return;
  }

  const glRenderer = new GLRenderer(gl);
  const renderer = new Renderer(glRenderer, store);
  glRenderer.setViewport();

  const skyboxTexture = new GLTexture2D({
    width: 4096,
    height: 2048,
    format: 'rgba',
    source: createImage(require('./studio_country_hall_2k.rgbe.png')),
    magFilter: 'nearest',
    minFilter: 'nearest',
    mipmap: false,
  });

  const cameraEntity = store.create({
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

  const hdrType = getHDRType(glRenderer);
  const mip = generateCubePackEquirectangular(
    glRenderer,
    skyboxTexture,
    'rgbe',
    hdrType,
    1024,
  );
  const pbrTexture = generatePBREnvMap(glRenderer, mip, hdrType);

  const gltf = parseGLTF(require('./models/pri-home5.gltf'));
  store.createEntities(gltf.entities);

  store.create({
    name: 'floor',
    transform: new Transform()
      .rotateX(-Math.PI / 2)
      .setScale([40, 40, 40])
      .translate([0, -1, 0]),
    mesh: new Mesh(
      new StandardMaterial({
        albedo: new GLTextureImage(require('./textures/forestground01.albedo.jpg')),
        metalic: 0,
        roughness: new GLTextureImage(require('./textures/forestground01.roughness.jpg')),
        normal: new GLTextureImage(require('./textures/forestground01.normal.jpg')),
        texScale: [20, 20],
      }),
      new Geometry(calcTangents(calcNormals(quad()))),
      {
        castShadow: false,
      },
    ),
  });

  store.create({
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

  store.create({
    name: 'envLight',
    transform: new Transform(),
    light: new EnvironmentLight({texture: pbrTexture, power: 1}),
  });

  const orbitController = new OrbitCameraController(
    canvas,
    document.body,
    cameraEntity,
    3,
  );
  vec3.copy(orbitController.center, [0, 0, 0]);

  renderer.setCamera(cameraEntity);

  const worldBVH = new WorldBVH(store);
  worldBVH.update();

  const rasterPipeline = renderer.pipeline;
  if (rasterPipeline instanceof DeferredPipeline) {
    rasterPipeline.addEffect(new RaytraceEffect(rasterPipeline, worldBVH));
  }

  engine.registerSystem(UPDATE_PHASE, (v) => orbitController.update(v));
  engine.registerSystem(UPDATE_PHASE, (v) => updateAnimation(store, v));
  engine.registerSystem(RENDER_PHASE, (v) => renderer.render(v));

  let lastTime = 0;

  function update(time: number) {
    const delta = time - lastTime;
    lastTime = time;
    engine.update(delta / 1000);
    requestAnimationFrame(update);
  }

  requestAnimationFrame(update);
  console.log(store);

}

main();


