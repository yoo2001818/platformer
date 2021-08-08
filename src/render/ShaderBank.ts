import {GLShader} from './gl/GLShader';

export class ShaderBank<T extends any[]> {
  _getId: (...args: T) => string;
  _onGenerate: (...args: T) => GLShader;
  instances: Map<string, GLShader>;

  constructor(
    getId: (...args: T) => string,
    onGenerate: (...args: T) => GLShader,
  ) {
    this._getId = getId;
    this._onGenerate = onGenerate;
    this.instances = new Map();
  }

  dispose(): void {
    for (const shader of this.instances.values()) {
      shader.dispose();
    }
  }

  get(...values: T): GLShader {
    const id = this._getId(...values);
    const instance = this.instances.get(id);
    if (instance != null) {
      return instance;
    }
    const newInstance = this._onGenerate(...values);
    this.instances.set(id, newInstance);
    return newInstance;
  }
}
