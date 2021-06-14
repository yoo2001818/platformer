import type {Entity} from '../Entity';
import type {EntityChunk} from '../EntityChunk';
import type {EntityStore} from '../EntityStore';

export interface Component<
  TReadValue,
  TWriteValue extends TReadValue = TReadValue
> {
  register(store: EntityStore, index: number): void;
  unregister(): void;

  get(entity: Entity): TReadValue | null;
  set(entity: Entity, value: TWriteValue): void;
  delete(entity: Entity): void;

  getHashCode(value: TWriteValue | null): number;

  initChunk?(chunk: EntityChunk): void;
  moveToChunk?(entity: Entity, chunk: EntityChunk, offset: number): void;
  moveFromChunk?(entity: Entity, chunk: EntityChunk, offset: number): void;
  getChunk?(chunk: EntityChunk, offset: number): void;
}
