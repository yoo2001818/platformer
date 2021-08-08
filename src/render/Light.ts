export interface LightOptions {
  color: string;
  ambient: number;
  diffuse: number;
  specular: number;
  attenuation: number;
}

export class Light {
  options: LightOptions;

  constructor(options: LightOptions) {
    this.options = options;
  }
}
