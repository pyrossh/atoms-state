# atoms-state

[![Version](https://badge.fury.io/gh/pyros2097%2Fatoms-state.svg)](https://github.com/pyros2097/atoms-state/packages)

State management and common hooks

`npm i @pyros2097/atoms-state`

## Usage

```js
import React from 'react';
import ReactDOM from 'react-dom';
import { atom, useAtom } from 'atoms-state';

const countAtom = atom(10);
const sumAtom = atom((get) => get(countAtom) + 10);

const increment = () => {
  countAtom.update((count) => count + 1);
};

const decrement = () => {
  countAtom.update((count) => count - 1);
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

## Async

```js
import React, { Suspense } from 'react';
import ReactDOM from 'react-dom';
import { asyncAtom, useAsyncAtom } from 'atoms-state';

const todoAtom = asyncAtom(async ({ id }) => {
  const res = await fetch(`https://jsonplaceholder.typicode.com/todos/${id}`);
  return await res.json();
});

const completeTodo = () => {
  todoAtom.update((todo) => ({ ...todo, completed: !todo.completed }));
};

const Counter = () => {
  const todo = useAsyncAtom(todoAtom, { id: 1 });

  return (
    <div>
      <p>id: {todo.id}</p>
      <p>userId: {todo.userId}</p>
      <p>title: {todo.title}</p>
      <p>completed: {todo.completed}</p>
      <button onClick={completeTodo}>Toggle Complete</button>
    </div>
  );
};

ReactDOM.render(
  <Suspense fallback={<div>Loading</div>}>
    <Counter />
  </Suspense>,
  document.getElementById('root'),
);
```
