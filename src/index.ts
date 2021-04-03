import { useState, useEffect } from 'react';

export type Atom<S> = {
  getValue: () => S;
  subscribe: (listener: (value: S) => void) => () => void;
  update: (fn: (oldValue: S) => S) => void;
};
export type AtomGetter = <V>(atom: Atom<V>) => V;
export type DerivedAtomReader<S> = (read: AtomGetter) => S;

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

export const useAtom = <S>(atom: Atom<S>): S => {
  const [data, setData] = useState<S>(atom.getValue());
  useEffect(() => {
    return atom.subscribe(value => {
      setData(value);
    });
  }, []);
  return data;
};

export type AsyncAtom<P, S> = {
  compute: (p: P) => S | Promise<S>;
  fetch: (p: P) => Promise<S>;
  subscribe: (listener: (value: S) => void) => () => void;
  update: (fn: (oldValue: S) => S) => void;
};

export const asyncAtom = <P, S>(fn: (p: P) => Promise<S>): AsyncAtom<P, S> => {
  let value: S | Promise<S>;
  let params: any;
  const subs = new Set<(value: S) => void>();
  return {
    compute(p: P): S | Promise<S> {
      if (JSON.stringify(p) !== JSON.stringify(params)) {
        params = p;
        value = fn(p);
        value
          .then(res => {
            value = res;
          })
          .catch(err => {
            value = err;
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
      value = updater(value as S);
      subs.forEach(sub => {
        sub(value as S);
      });
    },
  };
};

export const useAsyncAtom = <P, S>(a: AsyncAtom<P, S>, params: P) => {
  const [, toggle] = useState(false);
  useEffect(() => {
    return a.subscribe(() => toggle(v => !v));
  }, []);
  const v = a.compute(params);
  if (v instanceof Error) {
    throw v;
  } else if (v instanceof Promise) {
    throw v;
  } else {
    return v;
  }
};

type PromiseFunc<S, P> = (p: P) => Promise<S>;

const usePromiseCache: Map<Function, Map<string, any>> = new Map();
export const usePromise = <S, P>(
  fn: PromiseFunc<S, P>,
  params: P
): [S | null, (v: S) => void] => {
  const [data, setData] = useState<boolean>(false);
  const fnCache = usePromiseCache.get(fn) || new Map();
  if (!usePromiseCache.get(fn)) {
    usePromiseCache.set(fn, fnCache);
  }
  const key = typeof params === 'string' ? params : JSON.stringify(params);
  const value = fnCache.get(key);
  if (value) {
    if (value instanceof Promise) {
      throw value;
    } else if (value instanceof Error || value?.errors) {
      throw value;
    }
    return [
      value,
      v => {
        fnCache.set(key, v);
        setData(!data);
      },
    ];
  }

  fnCache.set(
    key,
    fn(params)
      .then(res => {
        fnCache.set(key, res);
      })
      .catch(err => fnCache.set(key, err))
  );
  throw fnCache.get(key);
};
