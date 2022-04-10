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
  entriesJson: Map<string, unknown>;

  constructor(engine: Engine) {
    this.engine = engine;
    this.entries = new Map();
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
    newEntry.load?.();
    return newEntry;
  }

  toJSON(): unknown {
    return Object.fromEntries(
      Array.from(this.entries.entries()).map(([key, entry]) => {
        return [key, entry.toJSON()];
      }),
    );
  }
}
