import {
  GLTexture,
  GLTextureFormat,
  GLTextureParameters,
  TEXTURE_2D,
} from './GLTexture';
import {GLTexture2D} from './GLTexture2D';

export class GLTexture2DGenerated extends GLTexture2D {
  generate: (self: GLTexture2DGenerated) => void;
  dependencies: GLTexture[];
  initialized: boolean;

  constructor(
    options: GLTextureParameters & GLTextureFormat,
    generate: (self: GLTexture2DGenerated) => void,
    dependencies: GLTexture[] = [],
  ) {
    super({...options, source: null, mipmap: false});
    this.generate = generate;
    this.dependencies = dependencies;
    this.initialized = false;
  }

  _init(): void {
    if (this.initialized) {
      return;
    }
    super._init();
    this.initialized = true;
    this.generate(this);
    if (this.options.mipmap !== false) {
      this._generateMipmap(TEXTURE_2D);
    }
  }

  isReady(): boolean {
    return this.dependencies.every((v) => v.isReady());
  }
}
