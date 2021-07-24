import {Renderer} from './Renderer';
import {ArrayBufferView} from './types';
import {ATTRIBUTE_TYPE_MAP, TEXTURE_FORMAT_MAP, TEXTURE_PARAM_MAP} from './utils';

export type GLTextureCandidate =
  | ArrayBufferView
  | ImageData
  | HTMLImageElement
  | HTMLCanvasElement
  | HTMLVideoElement
  | ImageBitmap;

export interface GLTextureParameters {
  magFilter?: 'linear' | 'nearest';
  minFilter?:
    | 'linear'
    | 'nearest'
    | 'nearestMipmapNearest'
    | 'linearMipmapNearest'
    | 'nearestMipmapLinear'
    | 'linearMipmapLinear';
  wrapS?: 'repeat' | 'clampToEdge' | 'mirroredRepeat';
  wrapT?: 'repeat' | 'clampToEdge' | 'mirroredRepeat';
}

export interface GLTextureTexImage {
  source?: GLTextureCandidate;
  width?: number;
  height?: number;
  mipmap?: boolean;
  format?: 'rgba' | 'rgb' | 'luminanceAlpha' | 'luminance' | 'alpha';
  type?:
    | 'unsignedByte'
    | 'unsignedShort4444'
    | 'unsignedShort5551'
    | 'unsignedShort565';
}

export interface GLTextureOptions
extends GLTextureParameters, GLTextureTexImage {
}

const TEXTURE_2D = 0x0DE1;
const TEXTURE_CUBE_MAP = 0x8513;

export class GLTexture {
  renderer: Renderer | null = null;
  texture: WebGLTexture | null = null;
  boundId: number | null = null;
  boundVersion: number | null = null;
  options: GLTextureOptions;
  uploadFulfilled = 0;

  constructor(options: GLTextureOptions) {
    this.options = options;
  }

  bind(renderer: Renderer): void {
    renderer.textureManager.bind(this);
  }

  _bind(renderer: Renderer, id: number, version: number): void {
    this.boundId = id;
    this.boundVersion = version;
    this.renderer = renderer;
    const {gl} = renderer;
    if (this.texture == null) {
      this.texture = gl.createTexture();
      gl.activeTexture(gl.TEXTURE0 + id);
      gl.bindTexture(gl.TEXTURE_2D, this.texture);
      this._init();
    } else {
      gl.activeTexture(gl.TEXTURE0 + id);
      gl.bindTexture(gl.TEXTURE_2D, this.texture);
    }
  }

  _bindTick(): void {
    this._init();
  }

  _unbind(): void {
    this.boundId = null;
    this.boundVersion = null;
  }

  dispose(): void {
    if (this.texture != null && this.renderer != null) {
      this.renderer.gl.deleteTexture(this.texture);
      this.texture = null;
      this.uploadFulfilled = 0;
    }
  }

  _init(): void {
    if (this.uploadFulfilled === 0) {
      this._setParameters(TEXTURE_2D, this.options);
    }
    this.uploadFulfilled =
      this._texImage2D(TEXTURE_2D, this.options, this.uploadFulfilled);
  }

  _setParameters(target: number, params: GLTextureParameters): void {
    const {renderer} = this;
    if (renderer == null) {
      return;
    }
    const {gl} = renderer;
    gl.texParameteri(
      target,
      gl.TEXTURE_MAG_FILTER,
      TEXTURE_PARAM_MAP[params.magFilter ?? 'linear'],
    );
    gl.texParameteri(
      target,
      gl.TEXTURE_MIN_FILTER,
      TEXTURE_PARAM_MAP[params.minFilter ?? 'nearestMipmapLinear'],
    );
    gl.texParameteri(
      target,
      gl.TEXTURE_WRAP_S,
      TEXTURE_PARAM_MAP[params.wrapS ?? 'repeat'],
    );
    gl.texParameteri(
      target,
      gl.TEXTURE_WRAP_T,
      TEXTURE_PARAM_MAP[params.wrapT ?? 'repeat'],
    );
  }

  _texImage2D(
    target: number,
    options: GLTextureTexImage,
    fulfilled = 0,
  ): number {
    const {renderer} = this;
    if (renderer == null) {
      return 0;
    }
    if (fulfilled >= 2) {
      return fulfilled;
    }
    const {gl} = renderer;
    const {source, format, type} = options;
    if (source instanceof HTMLImageElement && !source.complete) {
      if (fulfilled === 0) {
        // Perform loading routine
        gl.texImage2D(
          target,
          0,
          TEXTURE_FORMAT_MAP.rgb,
          1,
          1,
          0,
          TEXTURE_FORMAT_MAP.rgb,
          ATTRIBUTE_TYPE_MAP.unsignedByte,
          new Uint8Array([0, 0, 0, 1]),
        );
        // Don't do anything else now; hopefully it'll reload soon
        return 1;
      }
    } else if (
      source instanceof HTMLElement ||
      source instanceof ImageData ||
      // TODO: IE doesn't support ImageBitmap. Oh well.
      source instanceof ImageBitmap
    ) {
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(
        target,
        0,
        TEXTURE_FORMAT_MAP[format ?? 'rgb'],
        TEXTURE_FORMAT_MAP[format ?? 'rgb'],
        ATTRIBUTE_TYPE_MAP[type ?? 'unsignedByte'],
        source,
      );
      gl.generateMipmap(target);
    } else {
      const {width, height} = options;
      if (width == null || height == null) {
        throw new Error('Texture with array-based source requires width ' +
          'and height');
      }
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(
        target,
        0,
        TEXTURE_FORMAT_MAP[format ?? 'rgb'],
        width!,
        height!,
        0,
        TEXTURE_FORMAT_MAP[format ?? 'rgb'],
        ATTRIBUTE_TYPE_MAP[type ?? 'unsignedByte'],
        source ?? null,
      );
      gl.generateMipmap(target);
    }
    return 2;
  }

  invalidate(): void {
    this.uploadFulfilled = 0;
  }

  setOptions(options: GLTextureOptions): void {
    this.options = options;
    this.uploadFulfilled = 0;
    const {renderer, texture} = this;
    if (renderer != null && texture != null) {
      this.bind(renderer);
      this._setParameters(TEXTURE_2D, options);
    }
  }
}
