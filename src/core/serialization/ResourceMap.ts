export interface ResourceMapComponent {
  toJSON(): unknown;
}

export interface ResourceMapDescriptor<T extends ResourceMapComponent> {
  name: string;
  create(json?: unknown): T;
}

export class ResourceMap {

  constructor() {
    // TODO
  }

  fromJSON(json: unknown): void {

  }

  get<T>(descriptor: ResourceMapDescriptor<T>): T {

  }

  toJSON(): void {

  }
}
