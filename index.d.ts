export declare type Atom<S> = {
  getValue: () => S;
  subscribe: (listener: (value: S) => void) => () => void;
  update: (fn: (oldValue: S) => S) => void;
};
export declare type AtomGetter = <V>(atom: Atom<V>) => V;
export declare type DerivedAtomReader<S> = (read: AtomGetter) => S;
export declare const atom: <S>(initial: S | DerivedAtomReader<S>) => Atom<S>;
export declare const useAtom: <S>(atom: Atom<S>) => S;
export declare type AsyncAtom<P, S> = {
  compute: (p: P) => S | Promise<S>;
  fetch: (p: P) => Promise<S>;
  subscribe: (listener: (value: S) => void) => () => void;
  update: (fn: (oldValue: S) => S) => void;
};
export declare const asyncAtom: <P, S>(fn: (p: P) => Promise<S>) => AsyncAtom<P, S>;
export declare const useAsyncAtom: <P, S>(a: AsyncAtom<P, S>, params: P) => S;
declare type PromiseFunc<S, P> = (p: P) => Promise<S>;
export declare const usePromise: <S, P>(fn: PromiseFunc<S, P>, params: P) => [S, (v: S) => void];

export function useField<T>(name: string): {
  name: string;
  error: string;
  setError: (v: string | undefined) => void;
  registerField: (f: { get: () => T; set: (v: T) => void; clear: () => void }) => void;
};

export function useForm<T>(
  initial: T,
  submit: (d: T) => Promise<void>,
): {
  error: string;
  setError: (v?: string) => void;
  getData: () => T;
  setData: (v: T) => void;
  clear: () => void;
  reset: () => void;
  getFieldValue: (name: string) => any;
  setFieldValue: (name: string, value: any) => void;
  clearFieldValue: (name: string) => void;
  getFieldError: (name: string) => string | undefined;
  setFieldError: (name: string, value: string | undefined) => void;
  onSubmit: (d: T) => Promise<void>;
};

declare namespace Storage {
  export function setItem<T>(key: string, value: T): boolean;
  export function getItem<T>(key: string): T;
  export function removeItem(key: string): void;
  export function clear(): void;
  export function subscribe<T>(key: string, cb: (v: T) => void): void;
  export function unsubscribe(key: string, cb: Function): void;
}

export function useAsyncStorage<T>(key: string, initial: T & { loading?: boolean }): [T, (v: T) => void];
