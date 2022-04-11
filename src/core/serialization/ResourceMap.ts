import {Engine} from '../Engine';

export interface ResourceMapComponent {
  load?(): void;
  toJSON(): unknown;
}

export interface ResourceMapDescriptor<T extends ResourceMapComponent> {
  name: string;
  create(engine: Engine, resourceMap: ResourceMap, json?: unknown): T;
}

export class ResourceMap {
  engine: Engine;
  entries: Map<string, ResourceMapComponent>;
  entriesKeys: string[];
  entriesJson: Map<string, unknown>;

  constructor(engine: Engine) {
    this.engine = engine;
    this.entries = new Map();
    this.entriesKeys = [];
    this.entriesJson = new Map();
  }

  fromJSON(json: unknown): void {
    if (typeof json === 'object') {
      const jsonObj = json as {[key: string]: unknown;};
      this.entriesJson = new Map(Object.entries(jsonObj));
    }
  }

  get<T extends ResourceMapComponent>(descriptor: ResourceMapDescriptor<T>): T {
    const oldEntry = this.entries.get(descriptor.name);
    if (oldEntry != null) {
      return oldEntry as T;
    }
    let jsonObj: unknown;
    if (this.entriesJson.has(descriptor.name)) {
      jsonObj = this.entriesJson.get(descriptor.name);
      this.entriesJson.delete(descriptor.name);
    }
    const newEntry = descriptor.create(this.engine, this, jsonObj);
    this.entries.set(descriptor.name, newEntry);
    this.entriesKeys.push(descriptor.name);
    newEntry.load?.();
    return newEntry;
  }

  toJSON(): unknown {
    const output: {[key: string]: unknown;} = {};
    // There can be new entries appended to the array while performing
    // serialization. Since we can't track them all, we repeatedly try doing it
    // until the entriesKeys array doesn't change.
    // (This is quite easy because entriesKeys's length will change)
    // eslint-disable-next-line @typescript-eslint/prefer-for-of
    for (let i = 0; i < this.entriesKeys.length; i += 1) {
      const key = this.entriesKeys[i];
      const entry = this.entries.get(key)!;
      output[key] = entry.toJSON();
    }
    return output;
  }
}
