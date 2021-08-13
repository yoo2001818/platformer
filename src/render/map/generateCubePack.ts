import {quad} from '../../geom/quad';
import {GLFrameBuffer} from '../gl/GLFrameBuffer';
import {GLGeometry} from '../gl/GLGeometry';
import {GLRenderer} from '../gl/GLRenderer';
import {GLShader} from '../gl/GLShader';
import {GLTexture} from '../gl/GLTexture';
import {GLTexture2D} from '../gl/GLTexture2D';
import {GLTextureGenerated} from '../gl/GLTextureGenerated';
import {CUBE_PACK} from '../shader/cubepack';
import {RGBE} from '../shader/hdr';

const GEOM_QUAD = new GLGeometry(quad());
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

    ${RGBE}
    ${CUBE_PACK}

    void main() {
      vec4 pos = cubePackReverseFace(vPosition);
      float mipLevel = pos.w;
      float face = pos.z;
      vec2 uv = pos.xy;
      if (mipLevel != uLevel) {
        gl_FragColor = texture2DLodEXT(uSource, vPosition, 0.0);
        return;
      }
      float targetMipLevel = mipLevel - 1.0;
      vec2 mipTexel = uTexelSize / pow(2.0, -targetMipLevel);
      // Probe 4 neighboring pixels
      vec3 samples = vec3(0.0);
      samples += unpackHDR(textureCubePackFaceLodInt(uSource,
        uv + mipTexel * vec2(-1.0, -1.0), face, targetMipLevel));
      samples += unpackHDR(textureCubePackFaceLodInt(uSource,
        uv + mipTexel * vec2(1.0, -1.0), face, targetMipLevel));
      samples += unpackHDR(textureCubePackFaceLodInt(uSource,
        uv + mipTexel * vec2(-1.0, 1.0), face, targetMipLevel));
      samples += unpackHDR(textureCubePackFaceLodInt(uSource,
        uv + mipTexel * vec2(1.0, 1.0), face, targetMipLevel));
      gl_FragColor = packHDR(samples / 4.0);
    }
  `,
);

export function generateCubePackMipMap(
  renderer: GLRenderer,
  source: GLTexture,
  maxLevel: number,
): GLTexture {
  // NOTE This will dispose "the other" texture
  const {width, height} = source.options;
  if (width == null || height == null) {
    throw new Error('The source texture must manually set width / height');
  }
  return new GLTextureGenerated(source.options, () => {
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
        geometry: GEOM_QUAD,
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
    pingPongFBtoA.dispose();
    pingPongFBtoB.dispose();
    return output;
  }, [source]);
}

const EQUI_SHADER = new GLShader(
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

    uniform vec2 uTexelSize;
    uniform sampler2D uSource;

    ${RGBE}
    ${CUBE_PACK}

    const vec2 invAtan = vec2(0.1591, 0.3183);

    void main() {
      vec4 pos = cubePackReverseLookup(vPosition, uTexelSize);
      float mipLevel = pos.w;
      vec3 dir = normalize(pos.xyz);
      if (mipLevel >= 1.0) {
        gl_FragColor = vec4(0.0);
        return;
      }

      // Run equirectangular mapping
      vec2 uv = vec2(atan(dir.z, dir.x), asin(dir.y));
      uv *= invAtan;
      uv += 0.5;

      gl_FragColor = texture2D(uSource, uv);
    }
  `,
);

export function generateCubePackEquirectangular(
  renderer: GLRenderer,
  source: GLTexture,
  size: number,
  maxLevel: number,
): GLTexture {
  const width = size;
  const height = size * 2;
  return new GLTextureGenerated({
    ...source.options,
    width,
    height,
  }, () => {
    const target = new GLTexture2D({
      ...source.options,
      width,
      height,
      source: null,
    });
    const fb = new GLFrameBuffer({
      color: target,
      width,
      height,
    });
    renderer.draw({
      frameBuffer: fb,
      geometry: GEOM_QUAD,
      shader: EQUI_SHADER,
      uniforms: {
        uTexelSize: [1 / width, 1 / height],
        uSource: source,
      },
    });
    fb.dispose();
    return generateCubePackMipMap(renderer, target, maxLevel);
  }, [source]);
}
