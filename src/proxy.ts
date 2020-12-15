import { emitter } from './common';

const PROXYABLE_FLAG = Symbol('is_proxyable');

const TARGET_PROXY_FLAG = Symbol('has_proxyable');

const ORIGIN_TARGET_FLAG = Symbol('origin_target_flag');

export function Ref<T>(v: T) {
  return Proxyable({ value: v });
}

export function Proxyable<T>(target: T): T {
  // 不是一个对象的时候不代理
  if (!target || typeof target !== 'object') return target;
  // 这个对象可能本身就是一个代理对象了
  if (isProxyableData(target)) {
    return target;
  }
  if (hasProxy(target)) {
    return target[TARGET_PROXY_FLAG];
  }

  const proxy = new Proxy(target as any, {
    // 调用的时候，自动的代理
    get(t, k, r) {
      if (k === PROXYABLE_FLAG) return true;
      if (k === ORIGIN_TARGET_FLAG) return t;
      const value = Proxyable(Reflect.get(t, k, r));
      emitter.emit('get', {
        target: proxy,
        property: k,
        value,
      });
      return value;
    },
    // 重设
    set(t, k, v, r) {
      const isAdd = !t.hasOwnProperty(k);
      const oldValue = Reflect.get(t, k);
      const res = Reflect.set(t, k, getOriginData(v), r);
      emitter.emit('set', {
        target: proxy,
        property: k,
        value: Proxyable(v),
        isAdd,
        oldValue: hasProxy(oldValue) ? Proxyable(oldValue) : oldValue,
      });
      return res;
    },
    // 删除属性
    deleteProperty(t, p) {
      const oldValue = Reflect.get(t, p);
      const res = Reflect.deleteProperty(t, p);
      emitter.emit('delete', {
        target: proxy,
        property: p,
        oldValue: hasProxy(oldValue) ? Proxyable(oldValue) : oldValue,
      });
      return res;
    },
  });
  return proxy;
}

export function isProxyableData(data: any) {
  return data && typeof data === 'object' && data[PROXYABLE_FLAG];
}

export function getOriginData(data: any) {
  return (data && data[ORIGIN_TARGET_FLAG]) || data;
}

export function hasProxy(data: any) {
  return data && data.hasOwnProperty(TARGET_PROXY_FLAG);
}
