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
    if (value) {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } else {
      await AsyncStorage.removeItem(key);
    }
    if (this.listeners[key]) {
      for (const cb of this.listeners[key]) {
        cb(value);
      }
    }
  },
  async removeItem(key) {
    await AsyncStorage.removeItem(key);
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
  const [loading, setLoading] = useState(true);
  const [storedValue, setStoredValue] = useState(initialValue);
  const setData = async (v) => {
    await Storage.setItem(key, v);
  };
  useEffect(() => {
    Storage.getItem(key)
      .then((v) => {
        if (v) {
          setData(v);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
    return Storage.subscribe(key, (v) => {
      setStoredValue(v);
    });
  }, [key, JSON.stringify(initialValue)]);
  return [storedValue || initialValue, setData, loading];
};

export const fields = {};

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
    registerField: (f) => {
      fields[name] = {
        ...f,
        getError: () => errorRef.current,
        setError: setErrorMessage,
      };
      return () => {
        delete fields[name];
      };
    },
  };
};

export const useForm = (initial, submit) => {
  const [error, setError] = useState('');
  const getData = () => {
    const obj = {};
    for (const name of Object.keys(fields)) {
      obj[name] = fields[name].get();
    }
    return dot.object(obj);
  };
  const setData = useCallback((data) => {
    const dotData = dot.dot(data);
    for (const name of Object.keys(fields)) {
      fields[name].set(dotData[name]);
    }
  }, []);
  useEffect(() => {
    if (initial) {
      setData(initial);
    }
  }, [initial, setData]);
  return {
    error,
    setError,
    getData,
    setData,
    clear: () => {
      for (const name of Object.keys(fields)) {
        fields[name].clear();
      }
    },
    reset: () => {
      setData(initial);
    },
    getFieldValue: (name) => {
      const field = fields[name];
      if (field) {
        return field.get();
      }
    },
    setFieldValue: (name, value) => {
      const field = fields[name];
      if (field) {
        field.set(value);
      }
    },
    clearFieldValue: (name) => {
      const field = fields[name];
      if (field) {
        field.clear();
      }
    },
    getFieldError: (name) => {
      const field = fields[name];
      if (field) {
        return field.getError();
      }
      return '';
    },
    setFieldError: (name, value) => {
      const field = fields[name];
      if (field) {
        field.setError(value);
      }
    },
    onSubmit: async () => {
      try {
        const data = getData();
        setError('');
        for (const name of Object.keys(fields)) {
          fields[name].setError('');
        }
        const allValid = Object.keys(fields)
          .map((key) => fields[key])
          .reduce((acc, field) => acc && field.getError() === '', true);
        if (allValid) {
          await submit(data);
        }
      } catch (err) {
        // this is for validation errors
        if (err.error && typeof err.error !== 'string') {
          Object.keys(err.error).forEach((k) => {
            const field = fields[k];
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
