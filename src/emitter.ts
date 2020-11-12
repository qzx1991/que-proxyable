export default class Emitter {
  // 一直监听
  on(eventname: string, handler: () => void) {}
  // 监听一次
  once(eventname: string, handler: () => void) {}
  // 触发事件
  emit(eventname: string, ...values: any[]) {}
  // 销毁
  destroy() {}
}
