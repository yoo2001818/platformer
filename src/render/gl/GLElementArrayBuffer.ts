import {GLBuffer, UsageType} from './GLBuffer';
import {BufferValue} from './types';

const ELEMENT_ARRAY_BUFFER = 0x8893;

export class GLElementArrayBuffer extends GLBuffer {
  constructor(
    initialValue?: BufferValue | null,
    usage: UsageType = 'static',
  ) {
    super(ELEMENT_ARRAY_BUFFER, initialValue, usage);
  }
}

