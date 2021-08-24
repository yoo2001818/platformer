import type {Entity} from '../Entity';
import type {EntityChunk} from '../EntityChunk';
import type {EntityGroup} from '../EntityGroup';
import type {EntityStore} from '../EntityStore';

export interface Component<
  TReadValue,
  TWriteValue = TReadValue
> {
  getIndex(): number | null;
  register(store: EntityStore, index: number): void;
  unregister(): void;

  get(entity: Entity): TReadValue | null;
  set(entity: Entity, value: TWriteValue): void;
  delete(entity: Entity): void;

  getHashCode(value: TWriteValue | null): number;

  initChunk?(chunk: EntityChunk, value: TWriteValue | null): void;
  getChunk?(chunk: EntityChunk, offset: number): TReadValue | null;
  setChunk?(chunk: EntityChunk, offset: number, value: TWriteValue): void;

  initGroup?(group: EntityGroup, value: TWriteValue | null): void;
}
