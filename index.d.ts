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
export {};
