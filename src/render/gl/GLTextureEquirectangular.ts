import {mat4} from 'gl-matrix';

import {quad} from '../../geom/quad';

import {TEXTURE_CUBE_MAP_DIRS} from './GLTextureCube';
import {GLFrameBuffer} from './GLFrameBuffer';
import {GLGeometry} from './GLGeometry';
import {GLShader} from './GLShader';
import {GLTexture2D, GLTexture2DOptions} from './GLTexture2D';
import {GLTexture, TEXTURE_CUBE_MAP} from './GLTexture';

const EQUIRECTANGULAR_GEOMETRY = new GLGeometry(quad());
const EQUIRECTANGULAR_SHADER = new GLShader(
  /* glsl */`
    #version 100
    precision highp float;

    attribute vec3 aPosition;

    varying vec3 vPosition;

    uniform mat4 uView;
    uniform mat4 uProjection;

    void main() {
      vPosition = (uProjection * uView * vec4(aPosition.xy, 1.0, 1.0)).xyz;
      gl_Position = vec4(aPosition.xy, 1.0, 1.0);
    }
  `,
  /* glsl */`
    #version 100
    precision highp float;

    varying vec3 vPosition;

    uniform sampler2D uTexture;

    const vec2 invAtan = vec2(0.1591, 0.3183);

    void main() {
      vec3 dir = normalize(vPosition);

      // Run equirectangular mapping
      vec2 uv = vec2(atan(dir.z, dir.x), asin(dir.y));
      uv *= invAtan;
      uv += 0.5;

      gl_FragColor = texture2D(uTexture, uv);
    }
  `,
);
const EQUIRECTANGULAR_MATRIXES = [
  mat4.lookAt(mat4.create(), [0, 0, 0], [-1, 0, 0], [0, -1, 0]),
  mat4.lookAt(mat4.create(), [0, 0, 0], [1, 0, 0], [0, -1, 0]),
  mat4.lookAt(mat4.create(), [0, 0, 0], [0, 1, 0], [0, 0, 1]),
  mat4.lookAt(mat4.create(), [0, 0, 0], [0, -1, 0], [0, 0, -1]),
  mat4.lookAt(mat4.create(), [0, 0, 0], [0, 0, 1], [0, -1, 0]),
  mat4.lookAt(mat4.create(), [0, 0, 0], [0, 0, -1], [0, -1, 0]),
];
const EQUIRECTANGULAR_PROJECTION = mat4.perspective(
  mat4.create(),
  Math.PI / 2,
  1,
  0.1,
  10,
);

export class GLTextureEquirectangular extends GLTexture {
  texture2D: GLTexture2D;
  options: GLTexture2DOptions;
  uploadFulfilled: number;
  uploadWorking = false;

  constructor(options: GLTexture2DOptions) {
    super(TEXTURE_CUBE_MAP);
    if (options.width == null || options.height == null) {
      throw new Error('width and height must be provided');
    }
    if (options.width !== options.height * 2) {
      throw new Error('width be must height * 2');
    }

    // Then equirectangular mapper
    this.texture2D = new GLTexture2D({
      ...options,
      wrapS: 'clampToEdge',
      wrapT: 'clampToEdge',
      minFilter: 'linear',
      magFilter: 'linear',
      mipmap: false,
    });
    this.options = options;
    this.uploadFulfilled = 0;
  }

  _init(): void {
    const {options, renderer, texture2D} = this;
    if (renderer == null) {
      throw new Error('Renderer is null');
    }
    if (this.uploadFulfilled === 0) {
      TEXTURE_CUBE_MAP_DIRS.forEach((target) => {
        this._texImage2D(target, {
          ...options,
          width: options.height,
          height: options.height,
          source: undefined,
        }, 0);
      });
      this.uploadFulfilled = 1;
    }
    if (this.uploadFulfilled < 2 && !this.uploadWorking) {
      // Prepare internal texture2D. Be sure to use the this.bound ID!
      texture2D._bind(renderer, this.boundId!, this.boundVersion!);
      texture2D._bindTick();
      // Check if the internal texture2D is loaded...
      if (texture2D.uploadFulfilled === 2) {
        this.uploadWorking = true;
        console.log('uploading...');
        // It is loaded. Now we can generate cubemap using a simple shader.
        EQUIRECTANGULAR_SHADER.bind(renderer);
        EQUIRECTANGULAR_GEOMETRY.bind(renderer, EQUIRECTANGULAR_SHADER);

        // Create a one-off framebuffer.
        const fb = new GLFrameBuffer({
          width: options.height!,
          height: options.height!,
        });
        fb.bind(renderer);
        // Draw to each side.
        EQUIRECTANGULAR_MATRIXES.forEach((matrix, i) => {
          EQUIRECTANGULAR_SHADER.setUniforms({
            uProjection: EQUIRECTANGULAR_PROJECTION,
            uView: matrix,
            uTexture: texture2D,
          });
          fb.set({
            // NOTE: This will cause circular loop; it is guarded using
            // a mutex.
            color: {target: i, texture: this},
            width: options.height!,
            height: options.height!,
          });
          EQUIRECTANGULAR_GEOMETRY.draw();
        });
        fb.unbind();
        fb.dispose();
        // Finally, generate a mipmap if desired.
        if (options.mipmap !== false) {
          this.generateMipmap();
        }
        this.uploadWorking = false;
        this.uploadFulfilled = 2;
        // Dispose the texture2D.
        texture2D.dispose();
        this._bind(renderer, this.boundId!, this.boundVersion!);
      }
    }
  }
}
