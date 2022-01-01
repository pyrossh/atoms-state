import { useState, useEffect, useRef, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import dot from 'dot-object';

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
    subs.forEach((sub) => {
      sub(value);
    });
  };
  if (isDerived) {
    compute();
  } else {
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
      subs.forEach((sub) => {
        sub(value);
      });
    },
  };
};

export const useAtom = (atom) => {
  const [data, setData] = useState(atom.getValue());
  useEffect(() => {
    return atom.subscribe((value) => {
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
          .then((res) => {
            value = res;
          })
          .catch((err) => {
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
      subs.forEach((sub) => {
        sub(value);
      });
    },
  };
};

export const useAsyncAtom = (a, params) => {
  const [, toggle] = useState(false);
  useEffect(() => {
    return a.subscribe(() => toggle((v) => !v));
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

const usePromiseCache = new Map();
export const usePromise = (fn, params) => {
  const [data, setData] = useState(false);
  const fnCache = usePromiseCache.get(fn) || new Map();
  if (!usePromiseCache.get(fn)) {
    usePromiseCache.set(fn, fnCache);
  }
  const key = typeof params === 'string' ? params : JSON.stringify(params);
  const value = fnCache.get(key);
  if (value) {
    if (value instanceof Promise) {
      throw value;
    } else if (value instanceof Error || (value === null || value === void 0 ? void 0 : value.errors)) {
      throw value;
    }
    return [
      value,
      (v) => {
        fnCache.set(key, v);
        setData(!data);
      },
    ];
  }
  fnCache.set(
    key,
    fn(params)
      .then((res) => {
        fnCache.set(key, res);
      })
      .catch((err) => fnCache.set(key, err)),
  );
  throw fnCache.get(key);
};

export const Storage = {
  listeners: {},
  async getItem(key) {
    const item = await AsyncStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  },
  async setItem(key, value) {
    await AsyncStorage.setItem(key, JSON.stringify(value));
    if (this.listeners[key]) {
      for (const cb of this.listeners[key]) {
        cb(value);
      }
    }
  },
  async removeItem(key) {
    await AsyncStorage.removeItem(key);
    if (this.listeners[key]) {
      for (const cb of this.listeners[key]) {
        cb(null);
      }
    }
  },
  async clear() {
    await AsyncStorage.clear();
  },
  subscribe(key, cb) {
    if (!this.listeners[key]) {
      this.listeners[key] = new Set();
    }
    this.listeners[key].add(cb);
    return () => {
      this.listeners[key].delete(cb);
    };
  },
  unsubscribe(key, cb) {
    this.listeners[key].delete(cb);
  },
};

export const useAsyncStorage = (key, initialValue) => {
  const [storedValue, setStoredValue] = useState({
    ...initialValue,
    loading: true,
  });
  const setData = async (v) => {
    await Storage.setItem(key, v);
  };
  useEffect(() => {
    Storage.getItem(key)
      .then((v) => {
        if (v) {
          setData({ ...v, loading: false });
        } else {
          setData({ ...initialValue, loading: false });
        }
      })
      .catch((err) => setStoredValue({ ...initialValue, loading: false, err }));

    return Storage.subscribe(key, (v) => {
      setStoredValue(v);
    });
  }, [key, JSON.stringify(initialValue)]);
  return [storedValue, setData];
};

export const Fields = {
  data: {},
  keys() {
    return Object.keys(this.data);
  },
  get(k) {
    return this.data[k];
  },
  set(k, v) {
    this.data[k] = v;
  },
  remove(k) {
    delete this.data[k];
  },
};

export const useField = (name) => {
  const [error, setError] = useState('');
  const errorRef = useRef('');
  if (!name) {
    throw new Error('You need to provide the "name" prop.');
  }
  const setErrorMessage = (message) => {
    errorRef.current = message;
    setError(message);
  };
  return {
    name,
    error,
    setError: setErrorMessage,
    getField: () => Fields.get(name),
    registerField: (f) => {
      const oldField = Fields.get(name) || {};
      Fields.set(name, {
        ...oldField,
        ...f,
        getError: () => errorRef.current,
        setError: setErrorMessage,
      });
      return () => {
        // TODO: this remove happens after refresh so that state persists for 1 render
        // could cause wrong calcuations later on
        Fields.remove(name);
      };
    },
  };
};

export const useForm = (initial, submit, watchOn = []) => {
  const [error, setError] = useState('');
  const [, rerender] = useState(false);
  const refresh = () => rerender((v) => !v);
  const getData = () => {
    const obj = {};
    for (const name of Fields.keys()) {
      obj[name] = Fields.get(name).get();
    }
    return dot.object(obj);
  };
  const setData = useCallback((data) => {
    const dotData = dot.dot(data);
    for (const name of Fields.keys()) {
      Fields.get(name).set(dotData[name]);
    }
  }, []);
  useEffect(() => {
    if (initial) {
      setData(initial);
    }
  }, [JSON.stringify(initial), setData]);
  useEffect(() => {
    for (const name of watchOn) {
      const field = Fields.get(name);
      if (field) {
        Fields.set(name, {
          ...field,
          watch: refresh,
        });
      }
    }
  }, [Fields.keys().length]);
  return {
    error,
    setError,
    getData,
    setData,
    clear: () => {
      for (const name of Fields.keys()) {
        Fields.get(name).clear();
      }
    },
    reset: () => {
      setData(initial);
    },
    getFieldValue: (name) => {
      const field = Fields.get(name);
      if (field) {
        return field.get();
      }
    },
    setFieldValue: (name, value) => {
      const field = Fields.get(name);
      if (field) {
        field.set(value);
      }
    },
    clearFieldValue: (name) => {
      const field = Fields.get(name);
      if (field) {
        field.clear();
      }
    },
    getFieldError: (name) => {
      const field = Fields.get(name);
      if (field) {
        return field.getError();
      }
      return '';
    },
    setFieldError: (name, value) => {
      const field = Fields.get(name);
      if (field) {
        field.setError(value);
      }
    },
    onSubmit: async () => {
      try {
        const data = getData();
        setError('');
        for (const name of Fields.keys()) {
          Fields.get(name).setError('');
        }
        const allValid = Fields.keys()
          .map((key) => Fields.get(key))
          .reduce((acc, field) => acc && field.getError() === '', true);
        if (allValid) {
          await submit(data);
        }
      } catch (err) {
        // this is for validation errors
        if (err.error && typeof err.error !== 'string') {
          Object.keys(err.error).forEach((k) => {
            const field = Fields.get(k);
            if (field) {
              field.setError(err.error[k]);
            }
          });
          setError('Validation failed. Please correct the necessary fields.');
        } else {
          setError(err.message || err.error);
        }
      }
    },
  };
};
