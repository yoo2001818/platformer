import {quad} from '../../geom/quad';
import {GLFrameBuffer} from '../gl/GLFrameBuffer';
import {GLGeometry} from '../gl/GLGeometry';
import {GLRenderer} from '../gl/GLRenderer';
import {GLShader} from '../gl/GLShader';
import {GLTexture2D} from '../gl/GLTexture2D';
import {CUBE_PACK} from '../shader/cubepack';
import {RGBE} from '../shader/hdr';
import {PBR} from '../shader/pbr';

import {generateHammersleyMap} from './generateHammersleyMap';

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
    uniform sampler2D uHammersleyMap;

    ${PBR}
    ${CUBE_PACK}
    ${RGBE}

    vec3 runSample(vec3 direction, float roughness, float resolution) {
      vec3 N = normalize(direction);    
      vec3 R = N;
      vec3 V = R;

      const int SAMPLE_COUNT = 1024;
      float totalWeight = 0.0;   
      vec3 prefilteredColor = vec3(0.0);     
      for (int i = 0; i < SAMPLE_COUNT; ++i) {
        vec2 Xi = hammersleyFromMap(uHammersleyMap, i, SAMPLE_COUNT);
        vec3 H = importanceSampleGGX(Xi, N, roughness);

        float dotHV = max(dot(H, V), 0.0);

        vec3 L = normalize(2.0 * dot(H, V) * H - V);

        float dotNH = max(dot(N, H), 0.0);

        float D = distributionGGX(dotNH, roughness);
        float pdf = (D * dotNH / (4.0 * dotHV)) + 0.0001; 

        float saTexel  = 4.0 * PI / (6.0 * resolution * resolution);
        float saSample = 1.0 / (float(SAMPLE_COUNT) * pdf + 0.0001);

        float mipLevel = 0.0;
        if (roughness > 0.0) {
          mipLevel = 0.5 * log2(saSample / saTexel);
        }

        float dotNL = max(dot(N, L), 0.0);
        if (dotNL > 0.0) {
          prefilteredColor += unpackHDR(textureCubePackLod(uSource, L, min(mipLevel, 8.0), uTexelSize)) * dotNL;
          totalWeight += dotNL;
        }
      }
      prefilteredColor = prefilteredColor / totalWeight;

      return prefilteredColor;
    }

    void main() {
      vec4 pos = cubePackReverseLookup(vPosition, uTexelSize);
      float mipLevel = pos.w;
      vec3 coord = pos.xyz;
      float resolution = 1.0 / uTexelSize.x / 2.0;
      // Run radiance / irradiance calculation
      vec3 result = runSample(coord, pow(min(mipLevel / 6.0, 1.0), 2.0), resolution);
      gl_FragColor = packHDR(result);
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
  const hammersleyMap = generateHammersleyMap(1024);
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
      uHammersleyMap: hammersleyMap,
    },
  });
  fb.dispose();
  hammersleyMap.dispose();

  return target;
}
