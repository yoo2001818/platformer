import {quad} from '../../geom/quad';
import {GLFrameBuffer} from '../gl/GLFrameBuffer';
import {GLGeometry} from '../gl/GLGeometry';
import {GLRenderer} from '../gl/GLRenderer';
import {GLShader} from '../gl/GLShader';
import {GLTexture2D} from '../gl/GLTexture2D';
import {CUBE_PACK} from '../shader/cubepack';

const MIP_QUAD = new GLGeometry(quad());
const MIP_SHADER = new GLShader(
  /* glsl */`
    #version 100
    precision highp float;

    attribute vec3 aPosition;

    varying vec2 vPosition;

    void main() {
      vPosition = aPosition.xy * 0.5 + 0.5;
      gl_Position = vec4(aPosition.xy, 1.0, 1.0);
    }
  `,
  /* glsl */`
    #version 100
    precision highp float;

    varying vec2 vPosition;

    uniform float uLevel;
    uniform vec2 uTexelSize;
    uniform sampler2D uSource;

    ${CUBE_PACK}

    void main() {
      vec4 pos = cubePackReverseFace(vPosition);
      float mipLevel = pos.w;
      float face = pos.z;
      vec2 uv = pos.xy;
      if (mipLevel != uLevel) {
        discard;
        return;
      }
      float targetMipLevel = mipLevel - 1.0;
      vec2 mipTexel = uTexelSize / pow(2.0, -targetMipLevel);
      // Probe 4 neighboring pixels
      vec4 samples = vec4(0.0);
      samples += textureCubePackFaceLodInt(uSource,
        uv + mipTexel * vec2(-1.0, -1.0), face, targetMipLevel);
      samples += textureCubePackFaceLodInt(uSource,
        uv + mipTexel * vec2(1.0, -1.0), face, targetMipLevel);
      samples += textureCubePackFaceLodInt(uSource,
        uv + mipTexel * vec2(-1.0, 1.0), face, targetMipLevel);
      samples += textureCubePackFaceLodInt(uSource,
        uv + mipTexel * vec2(1.0, 1.0), face, targetMipLevel);
      gl_FragColor = samples / 4.0;
    }
  `,
);

export function generateCubePackMipMap(
  renderer: GLRenderer,
  source: GLTexture2D,
  maxLevel: number,
): GLTexture2D {
  // NOTE This will dispose "the other" texture
  const {width, height} = source.options;
  if (width == null || height == null) {
    throw new Error('The source texture must manually set width / height');
  }
  const pingPongA = source;
  const pingPongB = new GLTexture2D({
    ...source.options,
    source: null,
  });
  const pingPongFBtoA = new GLFrameBuffer({
    color: pingPongA,
    width,
    height,
  });
  const pingPongFBtoB = new GLFrameBuffer({
    color: pingPongB,
    width,
    height,
  });
  for (let i = 0; i < maxLevel; i += 1) {
    const toB = i % 2 === 0;
    renderer.draw({
      frameBuffer: toB ? pingPongFBtoB : pingPongFBtoA,
      geometry: MIP_QUAD,
      shader: MIP_SHADER,
      uniforms: {
        uLevel: i + 1,
        uTexelSize: [1 / width, 1 / height],
        uSource: toB ? pingPongA : pingPongB,
      },
    });
  }
  const output = maxLevel % 2 === 0 ? pingPongA : pingPongB;
  const other = maxLevel % 2 === 0 ? pingPongB : pingPongA;
  other.dispose();
  return output;
}

export function generateCubePackEquirectangular(
  renderer: GLRenderer,
  source: GLTexture2D,
  size: number,
  maxLevel: number,
): GLTexture2D {
  const width = size;
  const height = size * 2;
}
