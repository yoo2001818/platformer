import {EntityStore} from '../core/EntityStore';
import {bakeChannelGeom} from '../geom/channelGeom/bakeChannelGeom';
import {parseObj} from '../geom/loader/obj';
import {Renderer} from '../render/Renderer';
import {Geometry} from '../render/Geometry';
import {StandardMaterial} from '../render/material/StandardMaterial';
import {GLRenderer} from '../render/gl/GLRenderer';
import {calcNormals} from '../geom/calcNormals';
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
import {PointLight} from '../render/light/PointLight';
import {EnvironmentLight} from '../render/light/EnvironmentLight';
import {DirectionalShadowLight} from '../render/light/DirectionalShadowLight';
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
    source: createImage(require('./studio_country_hall_2k.rgbe.png')),
    magFilter: 'nearest',
    minFilter: 'nearest',
    mipmap: false,
  });
  // const texture = new GLTexture2D({source: createImage(logo)});
  const teapot = parseObj(require('./teapot.obj').default);

  gl!.enable(gl!.CULL_FACE);
  gl!.enable(gl!.DEPTH_TEST);
  gl!.depthFunc(gl!.LEQUAL);

  const cameraEntity = store.create({
    transform: new Transform().translate([0, 0, 40]),
    camera: new Camera({
      type: 'perspective',
      fov: 70 / 180 * Math.PI,
      far: 100,
      near: 0.1,
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
  const material = new StandardMaterial('material', {
    albedo: '#ffffff',
    metalic: 0,
    roughness: 0.12,
  });
  store.create({
    name: 'envMapDebug',
    transform: new Transform()
      .rotateX(-Math.PI / 2)
      .setScale([2.5, 5, 10])
      .setPosition([15, 0, 0]),
    mesh: new Mesh(
      new StandardMaterial('material', {
        albedo: pbrTexture,
        metalic: 0,
        roughness: 1,
      }),
      new Geometry('quad', calcNormals(quad())),
    ),
  });
  store.create({
    name: 'skybox',
    transform: new Transform(),
    mesh: new Mesh(
      new SkyboxMaterial('skybox', {
        texture: pbrTexture,
        lod: 2,
      }),
      new Geometry('quad', quad()),
    ),
  });

  store.create({
    name: 'teapotBase',
    transform: new Transform(),
    mesh: new Mesh(
      material,
      new Geometry('teapotBase', bakeChannelGeom(teapot[0].geometry)),
    ),
  });

  store.create({
    name: 'teapotLid',
    transform: new Transform(),
    mesh: new Mesh(
      material,
      new Geometry('teapotLid', bakeChannelGeom(teapot[1].geometry)),
    ),
  });

  store.create({
    name: 'floor',
    transform: new Transform()
      .rotateX(-Math.PI / 2)
      .setScale([10, 10, 10]),
    mesh: new Mesh(
      new StandardMaterial('floor', {
        albedo: new GLTexture2D({source: createImage(require('./wood.jpg'))}),
        metalic: 0,
        roughness: 0.3,
      }),
      new Geometry('floor', calcNormals(quad())),
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

  for (let i = 0; i < 200; i += 1) {
    store.create({
      name: 'light',
      transform: new Transform()
        .translate([
          Math.random() * 20 - 10,
          Math.random() * 2,
          Math.random() * 20 - 10,
        ]),
      light: new PointLight({
        color: [Math.random(), Math.random(), Math.random()],
        power: 30,
        radius: 1,
        range: 2,
      }),
    });
  }

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

    requestAnimationFrame(update);
  }

  requestAnimationFrame(update);
  console.log(store);
}

main();
