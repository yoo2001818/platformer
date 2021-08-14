import {quad} from '../../geom/quad';
import {GLFrameBuffer} from '../gl/GLFrameBuffer';
import {GLGeometry} from '../gl/GLGeometry';
import {GLRenderer} from '../gl/GLRenderer';
import {GLShader} from '../gl/GLShader';
import {GLTexture} from '../gl/GLTexture';
import {GLTexture2D} from '../gl/GLTexture2D';
import {GLTextureGenerated} from '../gl/GLTextureGenerated';
import {getHDROptions, HDRType} from '../hdr/utils';
import {CUBE_PACK, CUBE_PACK_HEADER} from '../shader/cubepack';
import {HDR} from '../shader/hdr';
import {PBR} from '../shader/pbr';
import {ShaderBank} from '../ShaderBank';

import {generateHammersleyMap} from './generateHammersleyMap';

const BAKE_QUAD = new GLGeometry(quad());
const BAKE_SHADER = new ShaderBank<[string]>(
  (format) => format,
  (format) => new GLShader(
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
      ${CUBE_PACK_HEADER}
      #define HDR_INPUT_${format}
      #define HDR_OUTPUT_${format}

      precision highp float;

      varying vec2 vPosition;

      uniform vec2 uTexelSize;
      uniform float uMaxLevel;
      uniform sampler2D uSource;
      uniform sampler2D uHammersleyMap;

      ${PBR}
      ${HDR}
      ${CUBE_PACK}

      vec3 runSample(vec3 direction, float roughness, float resolution) {
        vec3 N = normalize(direction);    
        vec3 R = N;
        vec3 V = R;

        const int SAMPLE_COUNT = 128;
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
            prefilteredColor += textureCubePackLodHDR(uSource, L, min(mipLevel, uMaxLevel + 1.0), uTexelSize) * dotNL;
            totalWeight += dotNL;
          }
        }
        prefilteredColor = prefilteredColor / totalWeight;

        return prefilteredColor;
      }

      vec3 runIrradianceSample(vec3 normal) {
        vec3 irradiance = vec3(0.0);  

        vec3 up = vec3(0.0, 1.0, 0.0);
        vec3 right = normalize(cross(up, normal));
        up = normalize(cross(normal, right));

        float sampleDelta = 0.025;
        float nrSamples = 0.0; 
        for (int phiI = 0; phiI < 100; ++phiI) {
          float phi = float(phiI) / 100.0 * 2.0 * PI;
          for (int thetaI = 0; thetaI < 25; ++thetaI) {
            float theta = float(thetaI) / 25.0 * 0.5 * PI;
            // spherical to cartesian (in tangent space)
            vec3 tangentSample = vec3(sin(theta) * cos(phi), sin(theta) * sin(phi), cos(theta));
            // tangent space to world
            vec3 sampleVec = tangentSample.x * right + tangentSample.y * up + tangentSample.z * normal; 

            irradiance += textureCubePackLodHDR(uSource, sampleVec, uMaxLevel - 1.0, uTexelSize) * cos(theta) * sin(theta);
            nrSamples += 1.0;
          }
        }
        irradiance = PI * irradiance * (1.0 / nrSamples);
        return irradiance;
      }

      void main() {
        vec4 pos = cubePackReverseLookup(vPosition, uTexelSize);
        float mipLevel = pos.w;
        vec3 coord = pos.xyz;
        float resolution = 1.0 / uTexelSize.x / 2.0;
        vec3 result;
        if (mipLevel < uMaxLevel) {
          // radiance calculation
          result = runSample(coord, pow(min(mipLevel / (uMaxLevel - 1.0), 1.0), 2.0), resolution);
        } else if (mipLevel == uMaxLevel) {
          // irradiance calculation
          result = runIrradianceSample(coord);
        } else {
          result = vec3(0.0);
        }
        gl_FragColor = packHDR(result);
      }
    `,
  ),
);

// This accepts a cubepack map and generates an environment map for PBR, which
// contains number of cubepack map samples on 2D texture.
export function generatePBREnvMap(
  renderer: GLRenderer,
  source: GLTexture,
  hdrFormat: HDRType,
): GLTexture {
  const {width, height} = source.options;
  if (width == null || height == null) {
    throw new Error('The width/height of target buffer must be specified');
  }
  return new GLTextureGenerated(source.options, () => {
    const maxLevel = Math.floor(Math.log2(0.5 * width) - 3);
    const hammersleyMap = generateHammersleyMap(1024);
    const target = new GLTexture2D({
      ...getHDROptions(hdrFormat),
      mipmap: false,
      source: null,
      width,
      height,
    });
    const fb = new GLFrameBuffer({
      color: target,
      width,
      height,
    });
    fb.bind(renderer);

    renderer.gl.clear(renderer.gl.COLOR_BUFFER_BIT);

    renderer.draw({
      frameBuffer: fb,
      shader: BAKE_SHADER.get(hdrFormat),
      geometry: BAKE_QUAD,
      uniforms: {
        uTexelSize: [1 / width, 1 / height],
        uSource: source,
        uHammersleyMap: hammersleyMap,
        uMaxLevel: maxLevel,
      },
    });
    fb.dispose();
    hammersleyMap.dispose();

    return target;
  }, [source]);
}
