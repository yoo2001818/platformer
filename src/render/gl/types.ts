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

export interface DrawOptions {
  frameBuffer?: GLFrameBuffer | null;
  geometry: GLGeometry;
  shader: GLShader;
  uniforms: unknown;
  primCount?: number;
}
