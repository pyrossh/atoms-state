import { atom } from '../src';

describe('atom', () => {
  it('getValue', () => {
    const atomOne = atom(10);
    const atomTwo = atom(20);
    const sumAtom = atom(get => get(atomOne) + get(atomTwo));
    expect(atomOne.getValue()).toEqual(10);
    expect(atomTwo.getValue()).toEqual(20);
    expect(sumAtom.getValue()).toEqual(30);
  });

  it('update', () => {
    const atomOne = atom(10);
    const sumAtom = atom(get => get(atomOne) + 5);
    atomOne.update(v => v + 2);
    expect(atomOne.getValue()).toEqual(12);
    expect(sumAtom.getValue()).toEqual(17);
  });

  it('subscribe', async () => {
    const atomOne = atom(10);
    const sumAtom = atom(get => get(atomOne) + 5);
    atomOne.subscribe(newValue => expect(newValue).toEqual(15));
    sumAtom.subscribe(newValue => expect(newValue).toEqual(20));
    atomOne.update(v => v + 5);
  });
});
