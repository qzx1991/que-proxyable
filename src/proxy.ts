import Emitter from "./emitter";

const PROXYABLE_FLAG = Symbol("is_proxyable");
const ORIGIN_TARGET_FLAG = Symbol("origin_target_flag");

export function QueProxyable<T extends object>(target: T): T {
  // 不是一个对象的时候不代理
  if (!target || typeof target !== "object") return target;
  // 这个对象可能本身就是一个代理对象了
  if (isProxyableData(target)) {
    return target;
  }

  const KEYS_PROXYDATA_MAP = new Map<string | number | symbol, any>();

  const proxy = new Proxy(target, {
    // 调用的时候，自动的代理
    get(t, k, r) {
      if (k === PROXYABLE_FLAG) return true;
      if (k === ORIGIN_TARGET_FLAG) return t;
      // 这个key已经被代理过 直接用
      if (KEYS_PROXYDATA_MAP.has(k)) {
        return KEYS_PROXYDATA_MAP.get(k);
      }
      // 还没有被代理过
      const rawValue = Reflect.get(t, k, r);
      // 是一个对象，可以被代理
      if (rawValue && typeof rawValue === "object") {
        const value = QueProxyable(rawValue);
        KEYS_PROXYDATA_MAP.set(k, value);
        return value;
      }
      return rawValue;
    },
    // 重设
    set(t, p, v, r) {
      // 记得要移除 防止内存泄漏
      KEYS_PROXYDATA_MAP.delete(p);
      return Reflect.set(t, p, v, r);
    },
    // 删除属性
    deleteProperty(t, p) {
      KEYS_PROXYDATA_MAP.delete(p);
      return Reflect.deleteProperty(t, p);
    },
  });
  return proxy;
}

export function isProxyableData(data: any) {
  return data && typeof data === "object" && data[PROXYABLE_FLAG];
}

export function getOriginData(data: any) {
  return (data && data[ORIGIN_TARGET_FLAG]) || data;
}
