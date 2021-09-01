import {EntityStore} from '../core/EntityStore';
import {bakeChannelGeom} from '../geom/channelGeom/bakeChannelGeom';
import {parseObj} from '../geom/loader/obj';
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
// import {generatePBREnvMap} from '../render/map/generatePBREnvMap';
import {generateCubePackEquirectangular} from '../render/map/generateCubePack';
import {generatePBREnvMap} from '../render/map/generatePBREnvMap';
import {getHDRType} from '../render/hdr/utils';
import {SkyboxMaterial} from '../render/material/SkyboxMaterial';
import {EnvironmentLight} from '../render/light/EnvironmentLight';
import {DirectionalShadowLight} from '../render/light/DirectionalShadowLight';
import {calcNormals} from '../geom/calcNormals';
import {GLTextureImage} from '../render/gl/GLTextureImage';
import {create3DComponents} from '../3d/create3DComponents';

const store = new EntityStore();

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
    source: createImage(require('./immenstadter_horn_2k.rgbe.png')),
    magFilter: 'nearest',
    minFilter: 'nearest',
    mipmap: false,
  });
  gl!.enable(gl!.CULL_FACE);
  gl!.enable(gl!.DEPTH_TEST);
  gl!.depthFunc(gl!.LEQUAL);

  const cameraEntity = store.create({
    transform: new Transform().translate([0, 0, 40]),
    camera: new Camera({
      type: 'perspective',
      fov: 70 / 180 * Math.PI,
      far: 100,
      near: 1,
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
  // mip.dispose();
  // generatePBREnvMap(glRenderer, skyboxTexture, pbrTexture);
  const coneModel = parseObj(require('./models/cone/cone.obj').default);
  const coneMat = new StandardMaterial({
    albedo: new GLTextureImage(require('./models/cone/albedo.png')),
    metalic: 0,
    roughness: new GLTextureImage(require('./models/cone/roughness.png')),
    normal: new GLTextureImage(require('./models/cone/normal.png')),
  });
  const coneMesh = new Mesh(
    coneMat,
    new Geometry(calcTangents(bakeChannelGeom(coneModel[0].geometry))),
  );

  const cone1 = store.create({
    name: 'cone1',
    transform: new Transform()
      .setScale([0.1, 0.1, 0.1])
      .translate([
        0,
        0.15,
        0,
      ]),
    mesh: coneMesh,
  });

  const cone2 = store.create({
    name: 'cone2',
    transform: new Transform()
      .translate([
        100,
        0,
        0,
      ]),
    mesh: coneMesh,
    parent: cone1,
  });

  store.create({
    name: 'cone3',
    transform: new Transform()
      .translate([
        0,
        100,
        0,
      ]),
    mesh: coneMesh,
    parent: cone2,
  });

  store.create({
    name: 'cone3',
    transform: new Transform()
      .translate([
        0,
        -100,
        0,
      ]),
    mesh: coneMesh,
    parent: cone2,
  });

  store.create({
    name: 'floor',
    transform: new Transform()
      .rotateX(-Math.PI / 2)
      .setScale([40, 40, 40]),
    mesh: new Mesh(
      new StandardMaterial({
        albedo: new GLTextureImage(require('./textures/forestground01.albedo.jpg')),
        metalic: 0,
        roughness: new GLTextureImage(require('./textures/forestground01.roughness.jpg')),
        normal: new GLTextureImage(require('./textures/forestground01.normal.jpg')),
        texScale: [4, 4],
      }),
      new Geometry(calcTangents(calcNormals(quad()))),
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
    ),
  });

  store.create({
    name: 'envLight',
    transform: new Transform(),
    light: new EnvironmentLight({texture: pbrTexture, power: 1}),
  });

  store.create({
    name: 'directionalLight',
    transform: new Transform()
      .rotateY(90 * Math.PI / 180)
      .rotateX(-40 * Math.PI / 180),
    light: new DirectionalShadowLight({
      color: '#ffffff',
      power: 30,
    }),
  });

  const orbitController = new OrbitCameraController(
    canvas,
    document.body,
    cameraEntity,
    10,
  );

  renderer.setCamera(cameraEntity);

  let lastTime = 0;

  function update(time: number) {
    const delta = time - lastTime;
    lastTime = time;

    store.sort();

    gl!.clearColor(0, 0, 0, 255);
    gl!.clear(gl!.COLOR_BUFFER_BIT | gl!.DEPTH_BUFFER_BIT);
    orbitController.update(delta);
    renderer.render();
    cone1.get<Transform>('transform')!.rotateY(delta * 0.004);
    cone2.get<Transform>('transform')!.rotateZ(delta * 0.003);

    requestAnimationFrame(update);
  }

  requestAnimationFrame(update);
  console.log(store);
}

main();

