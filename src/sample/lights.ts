import {EntityStore} from '../core/EntityStore';
import {Float32ArrayComponent, ObjectComponent} from '../core/components';
import {bakeChannelGeom} from '../geom/channelGeom/bakeChannelGeom';
import {parseObj} from '../geom/loader/obj';
import {Renderer} from '../render/Renderer';
import {Geometry} from '../render/Geometry';
import {BasicMaterial} from '../render/material/BasicMaterial';
import {GLRenderer} from '../render/gl/GLRenderer';
import {calcNormals} from '../geom/calcNormals';
import {quad} from '../geom/quad';
import {TransformComponent} from '../3d/TransformComponent';
import {Transform} from '../3d/Transform';
import {Camera} from '../3d/Camera';
import {MeshComponent} from '../render/MeshComponent';
import {Mesh} from '../render/Mesh';
import {Light} from '../render/light/Light';
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

const store = new EntityStore();

const nameComp = new ObjectComponent<string>();
const posComp = new TransformComponent();
const velComp = new Float32ArrayComponent(4);
const cameraComp = new ObjectComponent<Camera>();
const lightComp = new ObjectComponent<Light>();
const meshComp = new MeshComponent();

store.registerComponents({
  name: nameComp,
  transform: posComp,
  vel: velComp,
  camera: cameraComp,
  mesh: meshComp,
  light: lightComp,
});

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
      far: 1000,
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
  const material = new BasicMaterial({
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
      new BasicMaterial({
        albedo: pbrTexture,
        metalic: 0,
        roughness: 1,
      }),
      new Geometry(calcNormals(quad())),
    ),
  });
  store.create({
    name: 'skybox',
    transform: new Transform(),
    mesh: new Mesh(
      new SkyboxMaterial({
        texture: pbrTexture,
        lod: 3,
      }),
      new Geometry(quad()),
    ),
  });

  store.create({
    name: 'teapotBase',
    transform: new Transform(),
    mesh: new Mesh(
      material,
      new Geometry(bakeChannelGeom(teapot[0].geometry)),
    ),
  });

  store.create({
    name: 'teapotLid',
    transform: new Transform(),
    mesh: new Mesh(
      material,
      new Geometry(bakeChannelGeom(teapot[1].geometry)),
    ),
  });

  store.create({
    name: 'floor',
    transform: new Transform()
      .rotateX(-Math.PI / 2)
      .setScale([10, 10, 10]),
    mesh: new Mesh(
      new BasicMaterial({
        albedo: new GLTexture2D({source: createImage(require('./wood.jpg'))}),
        metalic: 0,
        roughness: 0.3,
      }),
      new Geometry(calcNormals(quad())),
    ),
  });

  store.create({
    name: 'envLight',
    transform: new Transform(),
    light: new EnvironmentLight({texture: pbrTexture, power: 1}),
  });

  store.create({
    name: 'light',
    transform: new Transform().translate([5, 5, 5]),
    light: new PointLight({
      color: '#0000ff',
      power: 200,
      radius: 1,
      range: 8,
    }),
  });

  store.create({
    name: 'light',
    transform: new Transform().translate([-5, 5, -5]),
    light: new PointLight({
      color: '#ff0000',
      power: 200,
      radius: 1,
      range: 8,
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

    requestAnimationFrame(update);
  }

  requestAnimationFrame(update);
  console.log(store);
}

main();
