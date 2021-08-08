export interface LightOptions {
  color: string;
  power: number;
  attenuation: number;
}

export class Light {
  options: LightOptions;

  constructor(options: LightOptions) {
    this.options = options;
  }
}
