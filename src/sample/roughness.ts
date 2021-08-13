import {EntityStore} from '../core/EntityStore';
import {Float32ArrayComponent, ObjectComponent} from '../core/components';
import {bakeChannelGeom} from '../geom/channelGeom/bakeChannelGeom';
import {parseObj} from '../geom/loader/obj';
import {Renderer} from '../render/Renderer';
import {Geometry} from '../render/Geometry';
import {BasicMaterial} from '../render/material/BasicMaterial';
import {GLRenderer} from '../render/gl/GLRenderer';
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
import {CUBE_PACK, CUBE_PACK_HEADER} from '../render/shader/cubepack';
import {generateBRDFMap} from '../render/map/generateBRDFMap';
import {generatePBREnvMap} from '../render/map/generatePBREnvMap';
import {getHDRType} from '../render/hdr/utils';
import {HDR} from '../render/shader/hdr';
import {generateCubePackEquirectangular} from '../render/map/generateCubePack';

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
    8,
  );
  const pbrTexture = generatePBREnvMap(glRenderer, mip, hdrType);
  const brdfTexture = generateBRDFMap(glRenderer);
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
      new ShaderMaterial(
        /* glsl */`
          #version 100
          precision highp float;

          attribute vec3 aPosition;

          varying vec2 vPosition;

          void main() {
            vPosition = aPosition.xy;
            gl_Position = vec4(aPosition.xy, 1.0, 1.0);
          }
        `,
        /* glsl */`
          #version 100
          ${CUBE_PACK_HEADER}
          #define HDR_INPUT_${getHDRType(glRenderer)}
          precision highp float;

          ${HDR}
          ${CUBE_PACK}

          varying vec2 vPosition;

          uniform sampler2D uTexture;
          uniform mat4 uInverseView;
          uniform mat4 uInverseProjection;

          const vec2 cubePackTexelSize = vec2(1.0 / 2048.0, 1.0 / 4096.0);

          void main() {
            vec4 viewPos = uInverseProjection * vec4(vPosition.xy, 1.0, 1.0);
            viewPos /= viewPos.w;
            vec3 dir = (uInverseView * vec4(normalize(viewPos.xyz), 0.0)).xyz;
            vec3 result = textureCubePackLodHDR(uTexture, dir, 3.0, cubePackTexelSize);
            result = result / (result + 1.0);
            gl_FragColor = vec4(result, 1.0);
          }
        `,
        {
          uTexture: pbrTexture,
        },
      ),
      new Geometry(quad()),
    ),
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
          new BasicMaterial({
            albedo: '#ffffff',
            metalic,
            roughness,
            environment: pbrTexture,
            brdf: brdfTexture,
          }),
          new Geometry(bakeChannelGeom(teapot[0].geometry)),
        ),
      });

      store.create({
        name: 'teapotLid',
        transform: new Transform()
          .setPosition([x * 4, y * 4, 0]),
        mesh: new Mesh(
          new BasicMaterial({
            albedo: '#ffffff',
            metalic,
            roughness,
            environment: pbrTexture,
            brdf: brdfTexture,
          }),
          new Geometry(bakeChannelGeom(teapot[1].geometry)),
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