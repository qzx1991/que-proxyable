import { emitter } from './common';
import { QueProxyable } from './proxy';

export function State() {
  return (target: any, key: string) => {
    // 这里的target其实是被注解的类的prototype 是它的原型链，
    // 因此，如果要对原型的属性做点什么 得有个地方去存储
    Object.defineProperty(target, key, {
      get() {
        if (this !== target) {
          // return value;
          const descriptor = Object.getOwnPropertyDescriptor(this, key);
          // 这表示这个对象没有被代理过， 我来代理了
          if (!descriptor) {
            return Reflect.get(target, key);
          }
        }
        return Reflect.get(target, key);
      },
      set(v) {
        // 这表示自己可能作为了别人的原型链的一员，这时不应该做什么事
        const descriptor = Object.getOwnPropertyDescriptor(this, key);
        if (this === target || descriptor) {
          Reflect.set(target, key, v);
        }
        if (!descriptor) {
          let tValue = v;
          Object.defineProperty(this, key, {
            get() {
              const proxyableData = QueProxyable(tValue);
              emitter.emit('get', {
                target: this,
                property: key,
                value: proxyableData,
              });
              return proxyableData;
            },
            set(v) {
              emitter.emit('set', {
                target: this,
                property: key,
                value: v,
                oldValue: tValue,
              });
              tValue = v;
            },
          });
        }
      },
    });
  };
}
