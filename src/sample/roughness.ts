import {EntityStore} from '../core/EntityStore';
import {bakeChannelGeom} from '../geom/channelGeom/bakeChannelGeom';
import {parseObj} from '../geom/loader/obj';
import {Renderer} from '../render/Renderer';
import {Geometry} from '../render/Geometry';
import {StandardMaterial} from '../render/material/StandardMaterial';
import {GLRenderer} from '../render/gl/GLRenderer';
import {quad} from '../geom/quad';
import {Transform} from '../3d/Transform';
import {Camera} from '../3d/Camera';
import {Mesh} from '../render/Mesh';
import {GLTexture2D} from '../render/gl/GLTexture2D';
import {createImage} from '../render/utils/createImage';
import {OrbitCameraController} from '../input/OrbitCameraController';
import {generatePBREnvMap} from '../render/map/generatePBREnvMap';
import {getHDRType} from '../render/hdr/utils';
import {generateCubePackEquirectangular} from '../render/map/generateCubePack';
import {SkyboxMaterial} from '../render/material/SkyboxMaterial';
import {create3DComponents} from '../3d/create3DComponents';
import {EnvironmentLight} from '../render/light/EnvironmentLight';

const store = new EntityStore();

store.registerComponents(create3DComponents());

function main() {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');

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
  const hdrType = getHDRType(glRenderer);
  const mip = generateCubePackEquirectangular(
    glRenderer,
    skyboxTexture,
    'rgbe',
    hdrType,
    2048,
  );
  const pbrTexture = generatePBREnvMap(glRenderer, mip, hdrType);
  // const brdfTexture = generateBRDFMap();
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
      far: 1000,
      near: 0.1,
    }),
  });

  store.create({
    name: 'skybox',
    transform: new Transform(),
    mesh: new Mesh(
      new SkyboxMaterial('skybox', {
        texture: pbrTexture,
        lod: 3,
      }),
      new Geometry('skybox', quad()),
    ),
  });

  store.create({
    name: 'envLight',
    transform: new Transform(),
    light: new EnvironmentLight({texture: pbrTexture, power: 1}),
  });

  for (let y = 0; y < 10; y += 1) {
    for (let x = 0; x < 10; x += 1) {
      const roughness = x / 10;
      const metalic = y / 10;

      store.create({
        name: 'teapotBase',
        transform: new Transform()
          .setPosition([x * 4, y * 4, 0]),
        mesh: new Mesh(
          new StandardMaterial('teapot', {
            albedo: '#ffffff',
            metalic,
            roughness,
          }),
          new Geometry('teapot', bakeChannelGeom(teapot[0].geometry)),
        ),
      });

      store.create({
        name: 'teapotLid',
        transform: new Transform()
          .setPosition([x * 4, y * 4, 0]),
        mesh: new Mesh(
          new StandardMaterial('teapot', {
            albedo: '#ffffff',
            metalic,
            roughness,
          }),
          new Geometry('teapot', bakeChannelGeom(teapot[1].geometry)),
        ),
      });
    }
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
