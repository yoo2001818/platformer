import {GLTexture, GLTextureParameters, GLTextureTexImage} from './GLTexture';

export const TEXTURE_2D = 0x0DE1;

export interface GLTexture2DOptions
extends GLTextureParameters, GLTextureTexImage {
}

export class GLTexture2D extends GLTexture {
  options: GLTexture2DOptions;
  uploadFulfilled: number;

  constructor(options: GLTexture2DOptions) {
    super();
    this.options = options;
    this.uploadFulfilled = 0;
  }

  _init(): void {
    if (this.uploadFulfilled === 0) {
      this._setParameters(TEXTURE_2D, this.options);
    }
    this.uploadFulfilled =
      this._texImage2D(TEXTURE_2D, this.options, this.uploadFulfilled);
  }

  _invalidate(): void {
    this.uploadFulfilled = 0;
  }

  setOptions(options: GLTexture2DOptions): void {
    this.options = options;
    this.uploadFulfilled = 0;
    const {renderer, texture} = this;
    if (renderer != null && texture != null) {
      this.bind(renderer);
      this._setParameters(TEXTURE_2D, options);
    }
  }
}
