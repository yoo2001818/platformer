import {GLRenderer} from './GLRenderer';
import {GLTexture, GLTextureParameters, GLTextureTexImage} from './GLTexture';

export const TEXTURE_2D = 0x0DE1;

export interface GLTexture2DOptions
extends GLTextureParameters, GLTextureTexImage {
}

export class GLTexture2D extends GLTexture {
  options: GLTexture2DOptions;
  uploadFulfilled: number;

  constructor(options: GLTexture2DOptions) {
    super(TEXTURE_2D, options);
    this.options = options;
    this.uploadFulfilled = 0;
  }

  _getInstance(): GLTexture {
    if (!this.isReady()) {
      return TEXTURE_2D_PLACEHOLDER;
    }
    return this;
  }

  _init(): void {
    if (this.uploadFulfilled === 0) {
      this._setParameters(TEXTURE_2D, this.options);
    }
    if (this.uploadFulfilled < 2) {
      this.uploadFulfilled =
        this._texImage2D(TEXTURE_2D, this.options, this.uploadFulfilled);
      if (this.uploadFulfilled === 2 && this.options.mipmap !== false) {
        this._generateMipmap(TEXTURE_2D);
      }
    }
  }

  _invalidate(): void {
    this.uploadFulfilled = 0;
  }

  setOptions(options: GLTexture2DOptions): void {
    this.options = options;
    this.uploadFulfilled = 0;
  }

  isReady(): boolean {
    return this._isReady(this.options, this.uploadFulfilled);
  }
}

export const TEXTURE_2D_PLACEHOLDER = new GLTexture2D({
  width: 1,
  height: 1,
  format: 'rgb',
  source: new Uint8Array([0, 0, 0]),
  mipmap: false,
});
