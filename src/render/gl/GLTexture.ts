import {createId} from '../utils/createId';

import {GLRenderer} from './GLRenderer';
import {ArrayBufferView} from './types';
import {ATTRIBUTE_TYPE_MAP, TEXTURE_FORMAT_MAP, TEXTURE_PARAM_MAP, WEBGL1_ATTRIBUTE_TYPE_MAP, WEBGL2_TEXTURE_FORMAT_MAP} from './utils';
import {getWebGL2InternalFormat} from './utils/getWebGL2InternalFormat';

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
  anistropic?: number | 'max';
}

export interface GLTextureFormat {
  width?: number;
  height?: number;
  mipmap?: boolean;
  // TODO: This should be derived from "internalFormat", even for WebGL1
  format?:
    | 'rgba'
    | 'rgb'
    | 'rg'
    | 'luminanceAlpha'
    | 'luminance'
    | 'alpha'
    | 'depth'
    | 'depthStencil'
    | 'rgbaInteger'
    | 'rgInteger'
    | 'red'
    | 'redInteger';
  type?:
    | 'halfFloat'
    | 'float'
    | 'unsignedByte'
    | 'unsignedShort4444'
    | 'unsignedShort5551'
    | 'unsignedShort565'
    | 'unsignedInt'
    | 'unsignedInt248'
    | 'unsignedInt2101010'
    // WebGL 2
    | 'byte'
    | 'unsignedShort'
    | 'short'
    | 'unsignedInt'
    | 'int'
    | 'unsignedInt10F11F11F'
    | 'unsignedInt5999'
    | 'float32unsignedInt248rev';
  flipY?: boolean;
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
  id: number;
  type: number;
  renderer: GLRenderer | null = null;
  texture: WebGLTexture | null = null;
  boundId: number | null = null;
  boundVersion: number | null = null;
  inferredWidth: number | null = null;
  inferredHeight: number | null = null;
  options: GLTextureOptions;

  constructor(type: number, options: GLTextureOptions) {
    this.id = createId();
    this.type = type;
    this.options = options;
  }

  bind(renderer: GLRenderer): void {
    renderer.textureManager.bind(this);
  }

  _getInstance(renderer: GLRenderer): GLTexture {
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
      if (this.boundId != null && this.boundVersion != null) {
        this.renderer.textureManager.notifyUnbind(
          this.boundId,
          this.boundVersion,
        );
      }
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
    const {gl, capabilities: {anisotropicExt, maxAnisotropy}} = renderer;
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
      let anistropicValue = 1;
      if (params.anistropic === 'max') {
        anistropicValue = maxAnisotropy;
      } else if (params.minFilter === 'nearest') {
        anistropicValue = 1;
      } else {
        anistropicValue = params.anistropic ?? maxAnisotropy;
      }
      gl.texParameterf(
        target,
        anisotropicExt.TEXTURE_MAX_ANISOTROPY_EXT,
        anistropicValue,
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
    const {gl, capabilities} = renderer;
    const {source, format, type} = options;
    const internalFormat = capabilities.isWebGL2
      ? getWebGL2InternalFormat(type ?? 'unsignedByte', format ?? 'rgb')
      : format ?? 'rgb';
    const attributeMap = capabilities.isWebGL2
      ? ATTRIBUTE_TYPE_MAP
      : WEBGL1_ATTRIBUTE_TYPE_MAP;
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
      typeof ImageBitmap !== 'undefined' && source instanceof ImageBitmap
    ) {
      this._active();
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, flipY);
      gl.texImage2D(
        target,
        0,
        WEBGL2_TEXTURE_FORMAT_MAP[internalFormat],
        TEXTURE_FORMAT_MAP[format ?? 'rgb'],
        attributeMap[type ?? 'unsignedByte'],
        source,
      );
      this.inferredWidth = source.width;
      this.inferredHeight = source.height;
      if (!capabilities.isWebGL2 && options.mipmap !== false) {
        if (
          Math.log2(source.width) % 1 !== 0 ||
          Math.log2(source.height) % 1 !== 0
        ) {
          // NPOT texture detected; if mipmap is enabled, give up
          this._setParameters(target, {
            minFilter: 'linear',
            wrapS: 'clampToEdge',
            wrapT: 'clampToEdge',
          });
          options.mipmap = false;
        }
      }
    } else {
      const {width, height} = options;
      if (width == null || height == null) {
        throw new Error('Texture with array-based source requires width ' +
          'and height');
      }
      const sourceArr = source as ArrayBufferView;
      this._active();
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.texImage2D(
        target,
        0,
        WEBGL2_TEXTURE_FORMAT_MAP[internalFormat],
        width!,
        height!,
        0,
        TEXTURE_FORMAT_MAP[format ?? 'rgb'],
        attributeMap[type ?? 'unsignedByte'],
        sourceArr ?? null,
      );
      this.inferredWidth = width;
      this.inferredHeight = height;
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

  isValid(): boolean {
    return true;
  }

  prepare(renderer: GLRenderer): void {
    //
  }

  getWidth(): number {
    return this.inferredWidth ?? this.options.width!;
  }

  getHeight(): number {
    return this.inferredHeight ?? this.options.height!;
  }

}
