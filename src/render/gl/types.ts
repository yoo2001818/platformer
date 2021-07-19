import type {GLArrayBuffer} from './GLArrayBuffer';

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
