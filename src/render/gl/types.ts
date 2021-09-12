import type {GLArrayBuffer} from './GLArrayBuffer';
import type {GLFrameBuffer} from './GLFrameBuffer';
import type {GLGeometry} from './GLGeometry';
import type {GLShader} from './GLShader';

export type ArrayBufferView =
  | Int8Array
  | Uint8Array
  | Uint8ClampedArray
  | Int16Array
  | Uint16Array
  | Int32Array
  | Uint32Array
  | Float32Array
  | Float64Array
  | DataView;

export type BufferValue =
  | ArrayBufferLike
  | ArrayBufferView
  | number[]
  | number[][];

export type GLAttributeType =
  | 'byte'
  | 'short'
  | 'unsignedByte'
  | 'unsignedShort'
  | 'unsignedInt'
  | 'float';

export interface AttributeOptions {
  buffer: GLArrayBuffer;
  size?: number;
  type?: GLAttributeType;
  normalized?: boolean;
  stride?: number;
  offset?: number;
  divisor?: number;
}

export type GLStateBlendEquation =
  | 'add'
  | 'subtract'
  | 'reverseSubtract'
  | 'min'
  | 'max';

export type GLStateBlendFunc =
  | 'zero'
  | 'one'
  | 'srcColor'
  | 'oneMinusSrcColor'
  | 'dstColor'
  | 'oneMinusDstColor'
  | 'srcAlpha'
  | 'oneMinusSrcAlpha'
  | 'dstAlpha'
  | 'oneMinusDstAlpha'
  | 'constantColor'
  | 'oneMinusConstantColor'
  | 'constantAlpha'
  | 'oneMinusConstantAlpha'
  | 'srcAlphaSaturate';

export type GLStateStencilOp =
  | 'keep'
  | 'zero'
  | 'replace'
  | 'incr'
  | 'incrWrap'
  | 'decr'
  | 'decrWrap'
  | 'invert';

export type GLStateTestFunc =
  | 'never'
  | 'less'
  | 'equal'
  | 'lequal'
  | 'greater'
  | 'notequal'
  | 'gequal'
  | 'always';

export type GLCullFaceMode =
  | 'front'
  | 'back'
  | 'frontAndBack';

export type GLFrontFace =
  | 'cw'
  | 'ccw';

export type GLStateStencilOpArgs = [
  GLStateStencilOp,
  GLStateStencilOp,
  GLStateStencilOp,
];

export interface GLStateBlendOptions {
  color?: number[];
  equation: GLStateBlendEquation | [GLStateBlendEquation, GLStateBlendEquation];
  func: [GLStateBlendFunc, GLStateBlendFunc] |
    [
      [GLStateBlendFunc, GLStateBlendFunc],
      [GLStateBlendFunc, GLStateBlendFunc],
    ];
}

export interface GLStateOptions {
  blend?: GLStateBlendOptions | false;
  colorMask?: boolean[];
  depthMask?: boolean;
  stencilMask?: number | [number, number];
  cull?: false | GLCullFaceMode;
  frontFace?: GLFrontFace;
  depth?: false
  | GLStateTestFunc
  | {func: GLStateTestFunc; range: [number, number];};
  dither?: boolean;
  stencil?: false | {
    func: [GLStateTestFunc, number, number]
    | [[GLStateTestFunc, number, number], [GLStateTestFunc, number, number]];
    op: GLStateStencilOpArgs
    | [GLStateStencilOpArgs, GLStateStencilOpArgs];
  };
  viewport?: false | [number, number, number, number];
  scissor?: false | [number, number, number, number];
  polygonOffset?: false | [number, number];
}

export interface DrawOptions {
  frameBuffer?: GLFrameBuffer | null;
  attributes?: {[key: string]: AttributeOptions;};
  geometry: GLGeometry;
  shader: GLShader;
  uniforms: {[key: string]: unknown;};
  primCount?: number;
  state?: GLStateOptions | null;
}
