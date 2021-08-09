import {quad} from '../geom/quad';

import {GLFrameBuffer} from './gl/GLFrameBuffer';
import {GLGeometry} from './gl/GLGeometry';
import {GLRenderer} from './gl/GLRenderer';
import {GLShader} from './gl/GLShader';
import {GLTexture} from './gl/GLTexture';
import {GLTexture2D} from './gl/GLTexture2D';

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

    void main() {
      // Retrieve mipmap level
      vec2 logPos = floor(-log2(1.0 - vPosition));
      float mipLevel = min(logPos.x, logPos.y);
      float mipBounds = pow(2.0, -mipLevel);
      float mipStart = 1.0 - mipBounds;
      vec2 mipPos = (vPosition - mipStart) / mipBounds;
      // Retrieve axis
      // Y
      // ^ Z+ /
      // | Z- /
      // | X+ Y+
      // | X- Y-
      // +------> X
      vec2 blockPos = fract(mipPos * vec2(2.0, 4.0)) * 2.0 - 1.0;
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
      }
      right = cross(front, up);
      vec3 coord = front + up * blockPos.y + right * blockPos.x;
      vec4 result = textureCube(uSource, coord);
      gl_FragColor = vec4(result.rgb, 1.0);
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

  // Because of the texture structure, we can perform everything on single
  // draw call. Let's do that first.
  BAKE_SHADER.bind(renderer);
  BAKE_QUAD.bind(renderer, BAKE_SHADER);
  BAKE_SHADER.setUniforms({
    uSource: source,
  });
  BAKE_QUAD.draw();

  fb.unbind();
}
