import type {Entity} from '../Entity';
import type {EntityChunk} from '../EntityChunk';
import type {EntityGroup} from '../EntityGroup';
import type {EntityStore} from '../EntityStore';

export interface Component<
  TReadValue,
  TWriteValue = TReadValue
> {
  getName(): string | null;
  getIndex(): number | null;
  register(store: EntityStore, index: number, name: string): void;
  unregister(): void;

  get(entity: Entity): TReadValue | null;
  set(entity: Entity, value: TWriteValue): void;
  delete(entity: Entity): void;
  clone?(value: TReadValue): TReadValue;

  getHashCode(value: TWriteValue | null): number;

  handleInitEntity?(entity: Entity): void;
  handleDestroyEntity?(entity: Entity): void;

  handleInitChunk?(chunk: EntityChunk, value: TWriteValue | null): void;
  getChunk?(chunk: EntityChunk, offset: number): TReadValue | null;
  setChunk?(chunk: EntityChunk, offset: number, value: TWriteValue): void;

  handleInitGroup?(group: EntityGroup, value: TWriteValue | null): void;
}
