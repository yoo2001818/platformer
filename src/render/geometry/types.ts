import {GLElementArrayBuffer} from '../gl/GLElementArrayBuffer';
import {GLArrayBuffer} from '../gl/GLArrayBuffer';
import {AttributeOptions, BufferValue} from '../gl/types';

export interface StaticGeometryOptions {
  attributes: {[key: string]: BufferValue;};
  indices?: BufferValue;
  mode?: number;
}

export interface GeometryOptions {
  attributes: {[key: string]: BufferValue | GLArrayBuffer | AttributeOptions;};
  indices?: BufferValue | GLElementArrayBuffer;
  mode?: number;
  size?: number;
  count?: number;
}

// ChannelGeometry allows to specify separate indices for each attribute.
// This therefore allows changing each triangle's property without changing
// all the attributes, which is useful for calculating normals and tangents,
// since position data is shared between all vertices, but hard normals are
// not.
export interface ChannelGeometryOptions {
  attributes: {[key: string]: BufferValue | AttributeOptions;};
  indices: {[key: string]: number[];};
}

export const POINTS = 0;
export const LINES = 1;
export const LINE_LOOP = 2;
export const LINE_STRIP = 3;
export const TRIANGLES = 4;
export const TRIANGLE_STRIP = 5;
export const TRIANGLE_FAN = 6;

