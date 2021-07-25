import {
  GLTexture,
  GLTextureCandidate,
  GLTextureParameters,
  GLTextureTexImage,
} from './GLTexture';

export const TEXTURE_CUBE_MAP = 0x8513;
export const TEXTURE_CUBE_MAP_DIRS = [
  // +X
  0x8515,
  // -X
  0x8516,
  // +Y
  0x8517,
  // -Y
  0x8518,
  // +Z
  0x8519,
  // -Z
  0x851A,
];

export interface GLTextureCubeOptions
  extends GLTextureParameters, Omit<GLTextureTexImage, 'source'> {
  sources: GLTextureCandidate[];
}

export class GLTextureCube extends GLTexture {
  options: GLTextureCubeOptions;
  uploadFulfilled: number[];
  mipmapGenerated: boolean;

  constructor(options: GLTextureCubeOptions) {
    super(TEXTURE_CUBE_MAP);
    this.options = options;
    this.uploadFulfilled = [0, 0, 0, 0, 0, 0];
    this.mipmapGenerated = false;
  }

  _init(): void {
    let fulfilled = true;
    this.uploadFulfilled.forEach((value, i) => {
      if (value < 2) {
        this.uploadFulfilled[i] = this._texImage2D(
          TEXTURE_CUBE_MAP_DIRS[i],
          {
            ...this.options,
            source: this.options.sources[i],
          },
          value,
        );
      }
      if (this.uploadFulfilled[i] < 2) {
        fulfilled = false;
      }
    });
    if (fulfilled && !this.mipmapGenerated) {
      this._setParameters(TEXTURE_CUBE_MAP, this.options);
      this._generateMipmap(TEXTURE_CUBE_MAP);
      this.mipmapGenerated = true;
    }
  }

  _invalidate(): void {
    this.uploadFulfilled = [0, 0, 0, 0, 0, 0];
    this.mipmapGenerated = false;
  }

  setOptions(options: GLTextureCubeOptions): void {
    this.options = options;
    this.uploadFulfilled = [0, 0, 0, 0, 0, 0];
    this.mipmapGenerated = false;
  }
}
