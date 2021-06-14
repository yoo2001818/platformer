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

  initChunk?(chunk: EntityChunk, value: TWriteValue): void;
  getChunk?(chunk: EntityChunk, offset: number): TReadValue;
  setChunk?(chunk: EntityChunk, offset: number, value: TWriteValue): void;
}
