import {quad} from '../../geom/quad';
import {GLFrameBuffer} from '../gl/GLFrameBuffer';
import {GLGeometry} from '../gl/GLGeometry';
import {GLRenderer} from '../gl/GLRenderer';
import {GLShader} from '../gl/GLShader';
import {GLTexture2D} from '../gl/GLTexture2D';
import {CUBE_PACK} from '../shader/cubepack';
import {PBR} from '../shader/pbr';

const BAKE_QUAD = new GLGeometry(quad());
const BAKE_SHADER = new GLShader(
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

    vec3 unpackRGBE(vec4 value) {
      vec3 rgb = value.rgb;
      rgb *= pow(2.0, value.a * 255.0 - 128.0);
      return rgb;
    }

    vec4 packRGBE(vec3 value) {
      float v = max(value.r, max(value.g, value.b));
      float e = ceil(log2(v));
      float s = pow(2.0, e);
      return vec4(value / s, (e + 128.0) / 255.0);
    }

    ${PBR}
    ${CUBE_PACK}

    vec4 runSample(vec3 direction, float roughness) {
      vec3 N = normalize(direction);    
      vec3 R = N;
      vec3 V = R;

      const int SAMPLE_COUNT = 1024;
      float totalWeight = 0.0;   
      vec4 prefilteredColor = vec4(0.0);     
      for (int i = 0; i < SAMPLE_COUNT; ++i) {
        vec2 Xi = hammersley(i, SAMPLE_COUNT);
        vec3 H = importanceSampleGGX(Xi, N, roughness);
        vec3 L = normalize(2.0 * dot(V, H) * H - V);

        float NdotL = max(dot(N, L), 0.0);
        if (NdotL > 0.0) {
          prefilteredColor += textureCubePackLodInt(uSource, L, 0.0, uTexelSize) * NdotL;
          totalWeight += NdotL;
        }
      }
      prefilteredColor = prefilteredColor / totalWeight;

      return prefilteredColor;
    }

    void main() {
      vec4 pos = cubePackReverseLookup(vPosition, uTexelSize);
      float mipLevel = pos.w;
      vec3 coord = pos.xyz;
      // Run radiance / irradiance calculation
      vec4 result = runSample(coord, pow(min(mipLevel / 6.0, 1.0), 2.0));
      gl_FragColor = vec4(result);
    }
  `,
);

// This accepts a cubepack map and generates an environment map for PBR, which
// contains number of cubepack map samples on 2D texture.
export function generatePBREnvMap(
  renderer: GLRenderer,
  source: GLTexture2D,
): GLTexture2D {
  const {width, height} = source.options;
  if (width == null || height == null) {
    throw new Error('The width/height of target buffer must be specified');
  }
  const target = new GLTexture2D({
    ...source.options,
    source: null,
  });
  const fb = new GLFrameBuffer({
    color: target,
    width,
    height,
  });
  fb.bind(renderer);

  renderer.draw({
    frameBuffer: fb,
    shader: BAKE_SHADER,
    geometry: BAKE_QUAD,
    uniforms: {
      uTexelSize: [1 / width, 1 / height],
      uSource: source,
    },
  });
  fb.dispose();

  return target;
}
