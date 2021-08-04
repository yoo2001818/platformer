import {GLShader} from './gl/GLShader';

export class ShaderBank<T extends any[]> {
  _onGenerate: (...args: T) => GLShader;
  instances: Map<string, GLShader>;

  constructor(onGenerate: (...args: T) => GLShader) {
    this._onGenerate = onGenerate;
    this.instances = new Map();
  }

  dispose(): void {
    for (const shader of this.instances.values()) {
      shader.dispose();
    }
  }

  get(...values: T): GLShader {
    return this._onGenerate(...values);
  }
}
