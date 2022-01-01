import {GLShader} from '../gl/GLShader';
import {DrawOptions} from '../gl/types';
import {MaterialVertexShaderBlock} from '../Material';

export interface PipelineShaderBlock {
  // void main()
  vert: string;
  // material(MaterialInfo mInfo)
  frag: string;
}

export interface Pipeline {
  dispose(): void;
  getDeferredShader(id: string, onCreate: () => PipelineShaderBlock): GLShader;
  getForwardShader(id: string, onCreate: () => PipelineShaderBlock): GLShader;
  getCameraUniforms(): {[key: string]: unknown;};
  drawDeferred(options: DrawOptions): void;
  drawForward(options: DrawOptions): void;
  renderVertex(
    onGetShader: (
      id: string,
      onCreate: (defines?: string) => MaterialVertexShaderBlock,
    ) => GLShader,
    onDraw: (options: DrawOptions) => void,
  ): void;
  shouldForceRender(): boolean;
  render(deltaTime?: number): void;
}
