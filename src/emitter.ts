export default class Emitter {
  private handlers = new Map<
    string,
    { handler: (...args: any[]) => void; once?: boolean }[]
  >();
  // 一直监听
  on(eventname: string, handler: (...args: any[]) => void) {
    if (!this.handlers.has(eventname)) {
      this.handlers.set(eventname, []);
    }
    const arr = this.handlers.get(eventname);
    const obj = { handler };
    arr?.push(obj);
    return () => {
      const newArr = this.handlers.get(eventname);
      if (newArr) {
        newArr?.splice(newArr?.indexOf(obj), 1);
      }
    };
  }
  // 监听一次
  once(eventname: string, handler: (...args: any[]) => void) {
    if (!this.handlers.has(eventname)) {
      this.handlers.set(eventname, []);
    }
    const arr = this.handlers.get(eventname);
    arr?.push({ handler, once: true });
  }
  // 触发事件
  emit(eventname: string, ...values: any[]) {
    const arr = this.handlers.get(eventname);
    if (arr) {
      arr.forEach((i) => i.handler(...values));
      this.handlers.set(
        eventname,
        arr.filter((i) => !i.once)
      );
    }
  }
  // 销毁
  destroy() {
    this.handlers = new Map();
  }
}
