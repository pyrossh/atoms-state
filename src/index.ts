export type Atom<S> = {
  getValue: () => S;
  subscribe: (listener: (value: S) => void) => () => void;
  update: (fn: (oldValue: S) => S) => void;
};
export type AtomGetter = <V>(atom: Atom<V>) => V;
export type DerivedAtomReader<S> = (read: AtomGetter) => S;

export type Destructor = () => void | undefined;
export type EffectCallback = () => (void | Destructor);
export type SetStateAction<S> = S | ((prevState: S) => S);
export type Dispatch<A> = (value: A) => void;
export type DependencyList = ReadonlyArray<any>;
export type StateContainerProps = {
  useState: <S>(initialState: S | (() => S)) => [S, Dispatch<SetStateAction<S>>];
  useEffect: (effect: EffectCallback, deps?: DependencyList) => void;
};

export const atom = <S>(initial: S | DerivedAtomReader<S>): Atom<S> => {
  let value: S;
  const isDerived = typeof initial === 'function';
  const subs = new Set<(value: S) => void>();
  const get = <A>(a: Atom<A>) => {
    a.subscribe(compute);
    return a.getValue();
  };
  const compute = () => {
    value = (initial as DerivedAtomReader<S>)(get);
    subs.forEach(sub => {
      sub(value);
    });
  };
  if (isDerived) {
    compute();
  } else {
    value = initial as S;
  }
  return {
    getValue(): S {
      return value;
    },
    subscribe(fn) {
      subs.add(fn);
      return () => subs.delete(fn);
    },
    update(fn: (oldValue: S) => S) {
      value = fn(value);
      subs.forEach(sub => {
        sub(value);
      });
    },
  };
};

export type AsyncAtom<P, S> = {
  compute: (p: P) => S | Promise<S>;
  fetch: (p: P) => Promise<S>;
  subscribe: (listener: (value: S) => void) => () => void;
  update: (fn: (oldValue: S) => S) => void;
};

export const asyncAtomCache = new Map();

export const asyncAtom = <P, S>(fn: (p: P) => Promise<S>): AsyncAtom<P, S> => {
  let value: S | Promise<S>;
  let params: any;
  const subs = new Set<(value: S) => void>();
  const fnCache = asyncAtomCache.get(fn) || new Map();
  if (!asyncAtomCache.get(fn)) {
    asyncAtomCache.set(fn, fnCache);
  }
  return {
    compute(p: P): S | Promise<S> {
      const key = JSON.stringify(p);
      const cacheValue = fnCache.get(key);
      if (typeof cacheValue !== 'undefined') {
        return cacheValue;
      }
      if (key !== JSON.stringify(params)) {
        params = p;
        value = fn(p);
        fnCache.set(key, value);
        value
          .then(res => {
            value = res;
            fnCache.set(key, res);
          })
          .catch(err => {
            value = err;
            fnCache.set(key, err);
          });
      }
      return value;
    },
    fetch(p: P): Promise<S> {
      return fn(p);
    },
    subscribe(fn) {
      subs.add(fn);
      return () => subs.delete(fn);
    },
    update(updater: (oldValue: S) => S) {
      const key = JSON.stringify(params);
      value = updater(value as S);
      fnCache.set(key, value);
      subs.forEach(sub => {
        sub(value as S);
      });
    },
  };
};

export const createUseAtom =
  ({ useState, useEffect }: StateContainerProps) =>
    <S>(atom: Atom<S>): S => {
      const [data, setData] = useState(atom.getValue());
      useEffect(() => {
        return atom.subscribe((value) => {
          setData(value);
        });
      }, []);
      return data;
    };


export const createUseAsyncAtom =
  ({ useState, useEffect }: StateContainerProps) =>
    <P, S>(a: AsyncAtom<P, S>, params: P) => {
      const [, toggle] = useState(false);
      useEffect(() => {
        return a.subscribe(() => toggle((v) => !v));
      }, []);
      return a.compute(params);
    };

export const createUseAsyncAtomSuspend =
  ({ useState, useEffect }: StateContainerProps) =>
    <P, S>(a: AsyncAtom<P, S>, params: P) => {
      const [, toggle] = useState(false);
      useEffect(() => {
        return a.subscribe(() => toggle((v) => !v));
      }, []);
      const v = a.compute(params);
      if (v instanceof Error) {
        return { err: v, data: null, loading: false };
      } else if (v instanceof Promise) {
        return { err: null, data: null, loading: true };
      } else {
        return { err: null, data: null, loading: true };
      }
    };
