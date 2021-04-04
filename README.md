# atoms

[![Version](https://img.shields.io/npm/v/@pyros2097/atoms?color=blue)](https://www.npmjs.com/package/pyros2097/atoms)

A simple statemanagement library for react.

`npm i @pyros2097/atoms`

## Usage
```js
import React from 'react';
import ReactDOM from 'react-dom';
import { atom, useAtom } from '@pyros2097/atoms';

const countAtom = atom(10);
const sumAtom = atom(get => get(countAtom) + 10);

const increment = () => {
  countAtom.update(count => count + 1);
};

const decrement = () => {
  countAtom.update(count => count - 1);
};

const Counter = () => {
  const count = useAtom(countAtom);
  const sum = useAtom(sumAtom);

  return (
    <div>
      <p>Count: {count}</p>
      <p>Sum: {sum}</p>
      <button onClick={increment}>Inc</button>
      <button onClick={decrement}>Dec</button>
    </div>
  );
};

ReactDOM.render(<Counter />, document.getElementById('root'));
```
