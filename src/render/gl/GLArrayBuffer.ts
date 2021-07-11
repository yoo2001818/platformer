import {GLBuffer, UsageType} from './GLBuffer';
import {BufferValue} from './types';

const ARRAY_BUFFER = 0x8892;

export class GLArrayBuffer extends GLBuffer {
  constructor(
    initialValue?: BufferValue | null,
    usage: UsageType = 'static',
  ) {
    super(ARRAY_BUFFER, initialValue, usage);
  }
}
