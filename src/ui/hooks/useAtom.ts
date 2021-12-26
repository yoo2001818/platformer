import {AtomDescriptor} from '../../core/Atom';

import {useEngineValue} from './useEngineValue';

export function useAtom<T>(atom: AtomDescriptor<T>): [T, (value: T) => void] {
  const atomVal = useEngineValue(
    (engine) => engine.entityStore.getAtom(atom),
    (_, atom) => {
      return {
        signals: [atom.signal],
        getVersion: () => atom.version,
      };
    },
    [atom],
  );
  return [atomVal.state, (value) => atomVal.setState(value)];
}

export function useAtomNullable<T>(
  atom: AtomDescriptor<T> | null,
): [T | null, (value: T) => void] {
  const atomVal = useEngineValue(
    (engine) => (atom != null
      ? engine.entityStore.getAtom(atom)
      : null),
    (_, atom) => {
      if (atom == null) {
        return {signals: [], getVersion: () => 0};
      }
      return {
        signals: [atom.signal],
        getVersion: () => atom.version,
      };
    },
    [atom],
  );
  if (atomVal == null) {
    return [null, () => { /* noop */ }];
  }
  return [atomVal.state, (value) => atomVal.setState(value)];
}
