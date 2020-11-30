import { Computed } from './@Computed';
import { State } from './@State';
import Emitter from './emitter';
// import { Processable } from './process';
// import { QueProxyable } from './proxy';

class A {
  @State()
  count = 1;

  num = 1;

  @Computed()
  name() {
    this.num++;
    return this.count;
  }
}
test('测试计算属性', () => {
  const a = new A();
  a.name();
  expect(a.num).toBe(2);
  a.name();
  expect(a.num).toBe(2);
  a.name();
  expect(a.num).toBe(2);
  a.count++;
  expect(a.num).toBe(2);
  a.name();
  expect(a.num).toBe(3);
  const b = new A();
  // 保证b不受影响
  expect(b.num).toBe(1);
  b.name();
  b.count++;
  expect(b.num).toBe(2);
  b.name();
  expect(b.num).toBe(3);
  expect(a.num).toBe(3);
  // a 和 b的function不同
  expect(a.name !== b.name).toBe(true);
  // 同一个对象的function相同
  expect(a.name === a.name).toBe(true);
});

test('测试Emitter', () => {
  const emitter = new Emitter();
  let count = 1;
  let count2 = 1;
  const unsub = emitter.on('get', () => count++);
  emitter.on('get', () => count2++);
  emitter.emit('get');
  expect(count).toBe(2);
  expect(count2).toBe(2);
  emitter.emit('get');
  expect(count).toBe(3);
  expect(count2).toBe(3);
  emitter.emit('get');
  expect(count).toBe(4);
  expect(count2).toBe(4);
  unsub();
  emitter.emit('get');
  expect(count).toBe(4);
  expect(count2).toBe(5);
  emitter.once('get', () => count--);
  emitter.emit('get');
  expect(count).toBe(3);
  emitter.emit('get');
  expect(count).toBe(3);
});

// test('测试excuteable', () => {
//   const obj1 = QueProxyable({ a: 1 });
//   const obj2 = QueProxyable({ b: 2 });
//   const obj3 = QueProxyable({ c: 1 });
//   let count = 1;
//   let count2 = 1;
//   const p1 = new Processable(() => {
//     count++;
//     new Processable(() => {
//       count2++;
//       return obj3.c;
//     });
//     console.log(obj3.c); // c 变化 子进程执行了 父进程也执行了一次 重新生成了子进程
//     return obj1.a + obj2.b;
//   });
//   expect(p1.value).toBe(3);
//   expect(count2).toBe(2);
// });
