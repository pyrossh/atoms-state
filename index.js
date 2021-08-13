import React from "react";

export const atom = (initial) => {
    let value;
    const isDerived = typeof initial === 'function';
    const subs = new Set();
    const get = (a) => {
        a.subscribe(compute);
        return a.getValue();
    };
    const compute = () => {
        value = initial(get);
        subs.forEach(sub => {
            sub(value);
        });
    };
    if (isDerived) {
        compute();
    }
    else {
        value = initial;
    }
    return {
        getValue() {
            return value;
        },
        subscribe(fn) {
            subs.add(fn);
            return () => subs.delete(fn);
        },
        update(fn) {
            value = fn(value);
            subs.forEach(sub => {
                sub(value);
            });
        },
    };
};

export const useAtom = (atom) => {
    const [data, setData] = React.useState(atom.getValue());
    React.useEffect(() => {
        return atom.subscribe(value => {
            setData(value);
        });
    }, []);
    return data;
};

export const asyncAtom = (fn) => {
    let value;
    let params;
    const subs = new Set();
    return {
        compute(p) {
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
        fetch(p) {
            return fn(p);
        },
        subscribe(fn) {
            subs.add(fn);
            return () => subs.delete(fn);
        },
        update(updater) {
            value = updater(value);
            subs.forEach(sub => {
                sub(value);
            });
        },
    };
};

export const useAsyncAtom = (a, params) => {
    const [, toggle] = React.useState(false);
    React.useEffect(() => {
        return a.subscribe(() => toggle(v => !v));
    }, []);
    const v = a.compute(params);
    if (v instanceof Error) {
        throw v;
    }
    else if (v instanceof Promise) {
        throw v;
    }
    else {
        return v;
    }
};

const usePromiseCache = new Map();
export const usePromise = (fn, params) => {
    const [data, setData] = React.useState(false);
    const fnCache = usePromiseCache.get(fn) || new Map();
    if (!usePromiseCache.get(fn)) {
        usePromiseCache.set(fn, fnCache);
    }
    const key = typeof params === 'string' ? params : JSON.stringify(params);
    const value = fnCache.get(key);
    if (value) {
        if (value instanceof Promise) {
            throw value;
        }
        else if (value instanceof Error || (value === null || value === void 0 ? void 0 : value.errors)) {
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
    fnCache.set(key, fn(params)
        .then(res => {
        fnCache.set(key, res);
    })
        .catch(err => fnCache.set(key, err)));
    throw fnCache.get(key);
};
