import { emitter } from "./common";

const PROXYABLE_FLAG = Symbol("is_proxyable");
const ORIGIN_TARGET_FLAG = Symbol("origin_target_flag");

export function QueProxyable<T extends object>(target: T): T {
  // 不是一个对象的时候不代理
  if (!target || typeof target !== "object") return target;
  // 这个对象可能本身就是一个代理对象了
  if (isProxyableData(target)) {
    return target;
  }

  // 存储已经被代理过的数据
  const KEYS_PROXYDATA_MAP = new Map<string | number | symbol, any>();

  const proxy = new Proxy(target, {
    // 调用的时候，自动的代理
    get(t, k, r) {
      if (t !== this) {
        return Reflect.get(t, k);
      }
      if (k === PROXYABLE_FLAG) return true;
      if (k === ORIGIN_TARGET_FLAG) return t;
      let value: any;
      // 这个key已经被代理过 直接用
      if (KEYS_PROXYDATA_MAP.has(k)) {
        value = KEYS_PROXYDATA_MAP.get(k);
      } else {
        // 还没有被代理过
        const rawValue = Reflect.get(t, k, r);
        // 是一个对象，可以被代理
        if (rawValue && typeof rawValue === "object") {
          value = QueProxyable(rawValue);
          KEYS_PROXYDATA_MAP.set(k, value);
        } else {
          value = rawValue;
        }
      }
      emitter.emit("get", {
        target: t,
        property: k,
        value,
      });
      return value;
    },
    // 重设
    set(t, k, v, r) {
      // 记得要移除 防止内存泄漏
      if (t === this) {
        KEYS_PROXYDATA_MAP.delete(k);
        emitter.emit("set", {
          target: t,
          property: k,
          value: v,
          oldValue: Reflect.get(t, k),
        });
      }
      return Reflect.set(t, k, v, r);
    },
    // 删除属性
    deleteProperty(t, p) {
      KEYS_PROXYDATA_MAP.delete(p);
      emitter.emit("delete", {
        target: t,
        property: p,
      });
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
