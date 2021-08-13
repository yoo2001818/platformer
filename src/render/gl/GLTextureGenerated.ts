import {
  GLTexture,
  GLTextureFormat,
  GLTextureParameters,
  TEXTURE_2D,
} from './GLTexture';
import {TEXTURE_2D_PLACEHOLDER} from './GLTexture2D';

export class GLTextureGenerated extends GLTexture {
  generate: () => GLTexture;
  dependencies: GLTexture[];
  result: GLTexture | null = null;

  constructor(
    options: GLTextureParameters & GLTextureFormat,
    generate: () => GLTexture,
    dependencies: GLTexture[] = [],
  ) {
    super(TEXTURE_2D, {...options, mipmap: false});
    this.generate = generate;
    this.dependencies = dependencies;
  }

  _getInstance(): GLTexture {
    if (!this.isReady()) {
      return TEXTURE_2D_PLACEHOLDER;
    }
    if (this.result == null) {
      this.result = this.generate();
    }
    return this.result._getInstance();
  }

  isReady(): boolean {
    return this.dependencies.every((v) => v.isReady());
  }

  prepare(): void {
    this._getInstance();
  }
}
