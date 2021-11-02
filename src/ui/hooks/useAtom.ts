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
