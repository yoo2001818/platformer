import {GLTexture, GLTextureFormat, GLTextureParameters} from './GLTexture';
import {GLTexture2D} from './GLTexture2D';

export class GLTexture2DGenerated extends GLTexture2D {
  generate: (self: GLTexture2DGenerated) => void;
  dependencies: GLTexture[];

  constructor(
    options: GLTextureParameters & GLTextureFormat,
    generate: (self: GLTexture2DGenerated) => void,
    dependencies: GLTexture[] = [],
  ) {
    super({...options, source: null});
    this.generate = generate;
    this.dependencies = dependencies;
  }
}
