import {GLRenderer} from './GLRenderer';
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

export interface GLTextureFormat {
  width?: number;
  height?: number;
  mipmap?: boolean;
  format?:
    | 'rgba'
    | 'rgb'
    | 'luminanceAlpha'
    | 'luminance'
    | 'alpha'
    | 'depth'
    | 'depthStencil';
  type?:
    | 'halfFloat'
    | 'float'
    | 'unsignedByte'
    | 'unsignedShort4444'
    | 'unsignedShort5551'
    | 'unsignedShort565'
    | 'unsignedInt'
    | 'unsignedInt248';
}

export interface GLTextureOptions extends
  GLTextureParameters, GLTextureFormat {
}

export interface GLTextureTexImage extends GLTextureFormat {
  source?: GLTextureCandidate | null;
}

export const TEXTURE_2D = 0x0DE1;
export const TEXTURE_CUBE_MAP = 0x8513;

export class GLTexture {
  type: number;
  renderer: GLRenderer | null = null;
  texture: WebGLTexture | null = null;
  boundId: number | null = null;
  boundVersion: number | null = null;
  width: number | null = null;
  height: number | null = null;
  options: GLTextureOptions;

  constructor(type: number, options: GLTextureOptions) {
    this.type = type;
    this.options = options;
  }

  bind(renderer: GLRenderer): void {
    renderer.textureManager.bind(this);
  }

  _getInstance(): GLTexture {
    return this;
  }

  _bind(renderer: GLRenderer, id: number, version: number): void {
    this.boundId = id;
    this.boundVersion = version;
    this.renderer = renderer;
    const {gl} = renderer;
    if (this.texture == null) {
      this.texture = gl.createTexture();
      this._active();
      gl.bindTexture(this.type, this.texture);
      this._init();
    } else {
      this._active();
      gl.bindTexture(this.type, this.texture);
      this._init();
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
      this.boundId = null;
      this.boundVersion = null;
      this._invalidate();
    }
  }

  _init(): void {
  }

  _invalidate(): void {
  }

  _active(): void {
    const {renderer, boundId} = this;
    if (renderer == null || boundId == null) {
      return;
    }
    const {gl, textureManager} = renderer;
    if (textureManager.activeId !== boundId) {
      gl.activeTexture(gl.TEXTURE0 + boundId);
      textureManager.activeId = boundId;
    }
  }

  _generateMipmap(target: number): void {
    const {renderer} = this;
    if (renderer == null) {
      return;
    }
    this._active();
    const {gl} = renderer;
    gl.generateMipmap(target);
  }

  _setParameters(target: number, params: GLTextureParameters): void {
    const {renderer} = this;
    if (renderer == null) {
      return;
    }
    this._active();
    const {gl, anisotropicExt} = renderer;
    gl.texParameteri(
      target,
      gl.TEXTURE_MAG_FILTER,
      TEXTURE_PARAM_MAP[params.magFilter ?? 'linear'],
    );
    gl.texParameteri(
      target,
      gl.TEXTURE_MIN_FILTER,
      TEXTURE_PARAM_MAP[params.minFilter ?? 'linearMipmapLinear'],
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
    if (anisotropicExt) {
      const max =
        gl.getParameter(anisotropicExt.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
      gl.texParameterf(
        target,
        anisotropicExt.TEXTURE_MAX_ANISOTROPY_EXT,
        max,
      );
    }
  }

  _texImage2D(
    target: number,
    options: GLTextureTexImage,
    fulfilled = 0,
    flipY = true,
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
        this._active();
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
      return fulfilled;
    } else if (
      source instanceof HTMLElement ||
      source instanceof ImageData ||
      // TODO: IE doesn't support ImageBitmap. Oh well.
      source instanceof ImageBitmap
    ) {
      this._active();
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, flipY);
      gl.texImage2D(
        target,
        0,
        TEXTURE_FORMAT_MAP[format ?? 'rgb'],
        TEXTURE_FORMAT_MAP[format ?? 'rgb'],
        ATTRIBUTE_TYPE_MAP[type ?? 'unsignedByte'],
        source,
      );
      this.width = source.width;
      this.height = source.height;
    } else {
      const {width, height} = options;
      if (width == null || height == null) {
        throw new Error('Texture with array-based source requires width ' +
          'and height');
      }
      this._active();
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
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
      this.width = width;
      this.height = height;
    }
    return 2;
  }

  _isReady(options: GLTextureTexImage, fulfilled: number): boolean {
    if (fulfilled >= 2) {
      return true;
    }
    const {source} = options;
    if (source instanceof HTMLImageElement && !source.complete) {
      return false;
    }
    return true;
  }

  invalidate(): void {
    this._invalidate();
  }

  generateMipmap(): void {
    this._generateMipmap(this.type);
  }

  isReady(): boolean {
    return false;
  }

  prepare(renderer: GLRenderer): void {
    //
  }

}
