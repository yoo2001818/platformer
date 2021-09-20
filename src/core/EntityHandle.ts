export class EntityHandle {
  id: number;
  version: number;

  constructor(id: number, version: number) {
    this.id = id;
    this.version = version;
  }

  isValid(target: EntityHandle): boolean {
    return this.id === target.id && this.version === target.version;
  }

  incrementVersion(): EntityHandle {
    return new EntityHandle(this.id, this.version + 1);
  }

  toJSON(): unknown {
    return {id: this.id, version: this.version};
  }
}
