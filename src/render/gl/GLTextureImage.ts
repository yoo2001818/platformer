import {createImage} from '../utils/createImage';

import {GLTexture2D} from './GLTexture2D';

export class GLTextureImage extends GLTexture2D {
  constructor(url: string) {
    super({
      source: createImage(url),
    });
  }
}
