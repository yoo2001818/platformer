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
import {Light} from '../render/Light';
import {GLTexture2D} from '../render/gl/GLTexture2D';
import {createImage} from '../render/utils/createImage';
import {OrbitCameraController} from '../input/OrbitCameraController';
import {ShaderMaterial} from '../render/material/ShaderMaterial';
import {GLTextureEquirectangular} from '../render/gl/GLTextureEquirectangular';
import {CUBE_PACK} from '../render/shader/cubepack';
import {generatePBREnvMap} from '../render/map/generatePBREnvMap';
import {generateBRDFMap} from '../render/map/generateBRDFMap';

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
  const gl = canvas.getContext('webgl');

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

  //*
  const skyboxTexture = new GLTextureEquirectangular({
    width: 4096,
    height: 2048,
    source: createImage(require('./green_point_park_2k.jpg')),
    magFilter: 'linear',
    minFilter: 'linearMipmapLinear',
  });
  /*/
  const skyboxTexture = new GLTextureCube({
    sources: [
      createImage(require('./sky1.png')),
      createImage(require('./sky2.png')),
      createImage(require('./sky3.png')),
      createImage(require('./sky4.png')),
      createImage(require('./sky5.png')),
      createImage(require('./sky6.png')),
    ],
  });
  // */
  const pbrTexture = new GLTexture2D({
    width: 2048,
    height: 4096,
    source: null,
    magFilter: 'linear',
    minFilter: 'linear',
  });
  const brdfTexture = generateBRDFMap(glRenderer);
  // const texture = new GLTexture2D({source: createImage(logo)});
  const teapot = parseObj(require('./teapot.obj').default);
  const material = new BasicMaterial({
    albedo: '#ffffff',
    metalic: 0,
    roughness: 0.002,
    environment: pbrTexture,
    brdf: brdfTexture,
  });

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
      new ShaderMaterial(
        /* glsl */`
          #version 100
          precision lowp float;

          attribute vec3 aPosition;

          varying vec2 vPosition;

          void main() {
            vPosition = aPosition.xy;
            gl_Position = vec4(aPosition.xy, 1.0, 1.0);
          }
        `,
        /* glsl */`
          #version 100
          precision lowp float;

          ${CUBE_PACK}

          varying vec2 vPosition;

          uniform sampler2D uTexture;
          uniform mat4 uInverseView;
          uniform mat4 uInverseProjection;

          void main() {
            vec4 viewPos = uInverseProjection * vec4(vPosition.xy, 1.0, 1.0);
            viewPos /= viewPos.w;
            vec3 dir = (uInverseView * vec4(normalize(viewPos.xyz), 0.0)).xyz;
            gl_FragColor = vec4(textureCubePackLod(uTexture, dir, 6.0).xyz, 1.0);
          }
        `,
        {
          uTexture: pbrTexture,
        },
      ),
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
        roughness: 0.5,
        environment: pbrTexture,
        brdf: brdfTexture,
      }),
      new Geometry(calcNormals(quad())),
    ),
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
        roughness: 0.2,
      }),
      new Geometry(calcNormals(quad())),
    ),
  });

  store.create({
    name: 'brdfMapDebug',
    transform: new Transform()
      .rotateX(-Math.PI / 2)
      .setScale([2.5, 2.5, 2.5])
      .setPosition([-15, 0, 0]),
    mesh: new Mesh(
      new BasicMaterial({
        albedo: brdfTexture,
        metalic: 0,
        roughness: 0.2,
      }),
      new Geometry(calcNormals(quad())),
    ),
  });

  store.create({
    name: 'light',
    transform: new Transform().translate([5, 5, 5]),
    light: new Light({
      color: '#ffaaaa',
      power: 2,
      attenuation: 0.0001,
    }),
  });

  store.create({
    name: 'light',
    transform: new Transform().translate([-5, 5, -5]),
    light: new Light({
      color: '#aaaaff',
      power: 2,
      attenuation: 0.00001,
    }),
  });

  store.create({
    name: 'light',
    transform: new Transform().translate([15, 5, 0]),
    light: new Light({
      color: '#ffffff',
      power: 2,
      attenuation: 0.00001,
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
  let pbrBuilt = false;

  function update(time: number) {
    const delta = time - lastTime;
    lastTime = time;

    store.sort();

    skyboxTexture.bind(glRenderer);
    if (skyboxTexture.isReady() && !pbrBuilt) {
      pbrBuilt = true;
      generatePBREnvMap(glRenderer, skyboxTexture, pbrTexture);
    }

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
