import {Entity} from '../Entity';
import {EntityChunk} from '../EntityChunk';
import {EntityStore} from '../EntityStore';

export interface Component<TReadValue, TWriteValue = TReadValue> {
  register(store: EntityStore, index: number): void;
  unregister(): void;

  get(entity: Entity): TReadValue | null;
  set(entity: Entity, value: TWriteValue): void;
  delete(entity: Entity): void;

  getHashCode(entity: Entity): number;

  initChunk?(chunk: EntityChunk): void;
  moveToChunk?(entity: Entity, chunk: EntityChunk, offset: number): void;
  moveFromChunk?(entity: Entity, chunk: EntityChunk, offset: number): void;
  getChunk?(chunk: EntityChunk, offset: number): void;
}
