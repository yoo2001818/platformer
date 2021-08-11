import {quad} from '../../geom/quad';
import {GLFrameBuffer} from '../gl/GLFrameBuffer';
import {GLGeometry} from '../gl/GLGeometry';
import {GLRenderer} from '../gl/GLRenderer';
import {GLShader} from '../gl/GLShader';
import {GLTexture} from '../gl/GLTexture';
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

    uniform samplerCube uSource;

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
          prefilteredColor += textureCube(uSource, L) * NdotL;
          totalWeight += NdotL;
        }
      }
      prefilteredColor = prefilteredColor / totalWeight;

      return prefilteredColor;
    }

    const vec2 cubePackTexelSize = vec2(1.0 / 2048.0, 1.0 / 4096.0);

    void main() {
      vec4 pos = cubePackReverseLookup(vPosition, cubePackTexelSize);
      // Retrieve mipmap level
      vec2 logPos = floor(-log2(1.0 - vPosition));
      float mipLevel = min(logPos.x, logPos.y);
      if (mipLevel > 6.0) {
        gl_FragColor = vec4(0.0);
        return;
      }
      float mipBounds = pow(2.0, -mipLevel);
      float mipStart = 1.0 - mipBounds;
      vec2 mipPos = (vPosition - mipStart) / mipBounds;
      // Retrieve axis
      // Y
      // ^ Z- /
      // | Z+ /
      // | X- Y-
      // | X+ Y+
      // +------> X
      vec2 blockPos = fract(mipPos * vec2(2.0, 4.0)) * 2.0 - 1.0;
      vec2 packSize = cubePackTexelSize * vec2(2.0, 4.0) / mipBounds;
      // Calculate underscan factor
      blockPos /= max(1.0 - (2.0 * packSize), 0.0002);
      vec3 front;
      vec3 up;
      vec3 right;
      if (mipPos.y >= 0.5) {
        front = vec3(0.0, 0.0, 1.0);
        up = vec3(0.0, 1.0, 0.0);
      } else if (mipPos.x <= 0.5) {
        front = vec3(1.0, 0.0, 0.0);
        up = vec3(0.0, 1.0, 0.0);
      } else {
        front = vec3(0.0, 1.0, 0.0);
        up = vec3(0.0, 0.0, 1.0);
      }
      if (mod(mipPos.y, 0.5) >= 0.25) {
        front = front * -1.0;
        up = up * vec3(1.0, 1.0, -1.0);
      }
      right = cross(front, up);
      vec3 coord = front + up * blockPos.y + right * blockPos.x;
      // Run radiance / irradiance calculation
      vec4 result = runSample(coord, pow(min(mipLevel / 6.0, 1.0), 2.0));
      // vec4 result = vec4(sign(abs(blockPos) - 1.0), 0.0, 1.0);
      // vec4 result = vec4(normalize(coord) * 0.5 + 0.5, 0.0);
      gl_FragColor = vec4(result);
    }
  `,
);

// This accepts a cubemap and generates an environment map for PBR, which
// contains number of cubemap samples on 2D texture.
export function generatePBREnvMap(
  renderer: GLRenderer,
  source: GLTexture,
  target: GLTexture2D,
): void {
  // We won't care about the size of the target - it doesn't matter.
  // However it is still needed for framebuffer generation..
  const {width, height} = target.options;
  if (width == null || height == null) {
    throw new Error('The width/height of target buffer must be specified');
  }
  const fb = new GLFrameBuffer({
    color: target,
    width,
    height,
  });
  fb.bind(renderer);

  const {gl} = renderer;
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);

  renderer.draw({
    frameBuffer: fb,
    shader: BAKE_SHADER,
    geometry: BAKE_QUAD,
    uniforms: {
      uSource: source,
    },
  });
  fb.dispose();
}
