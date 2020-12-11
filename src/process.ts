import { Debounce, Throttle } from 'que-utils';
import { State } from './@State';
import { ProxyWatcher } from './Watcher';

let processId = 0;
const all_processes = new Map<number, Processable>();
const watcher = new ProxyWatcher();
const TARTGET_PROCESS_STORE: Map<any, Map<string, Processable[]>> = new Map();
let TEMP_RUNNING_PROCESS: Processable | undefined = undefined;

function addRely(t: any, k: string) {
  if (!TEMP_RUNNING_PROCESS) return;
  if (!TARTGET_PROCESS_STORE.get(t)) {
    TARTGET_PROCESS_STORE.set(t, new Map());
  }
  if (!TARTGET_PROCESS_STORE.get(t).get(k)) {
    TARTGET_PROCESS_STORE.get(t).set(k, []);
  }
  const arr = TARTGET_PROCESS_STORE.get(t).get(k);
  if (arr.length > 0) {
    const lastProcess = arr[arr.length - 1];
    // !! endID 仅仅是标识符  不代表子节点的ID一定在这个范围，因为子节点可能不断的变更
    // 这表示我这个process还没结束
    if (lastProcess.endId < 0) {
      return;
    }
    for (let i = arr.length - 1; i >= 0; i--) {
      const p = arr[i];
      // 表示是这个之后的 如果记录在之前其实是不用担心的，因为数组在执行的时候会把子节点都重置成不可执行
      // 不过还是有隐患 比如在throttle的时候，需要额外的定时函数 有点浪费性能  需要优化
      if (p.getId() > TEMP_RUNNING_PROCESS.beginId) {
        arr.pop();
      } else {
        // 施展自己，不用管了呀
        if (p.getId() === TEMP_RUNNING_PROCESS.getId()) {
          return;
        }
        break;
      }
    }
  }
  arr.push(TEMP_RUNNING_PROCESS);
}

watcher.onGet((t, k) => {
  addRely(t, k);
});
watcher.onSet((t, k) => {
  const ps = TARTGET_PROCESS_STORE.get(t)?.get(k);
  TARTGET_PROCESS_STORE.get(t)?.delete(k);
  if (TARTGET_PROCESS_STORE.get(t)?.size === 0) {
    TARTGET_PROCESS_STORE.delete(t);
  }
  ps?.forEach((p) => {
    /**
     * 在记录的过程中不需要添加
     */
    if (p !== TEMP_RUNNING_PROCESS) {
      p.update();
    }
  });
});

export class Processable {
  static withoutRecording(handler: () => void) {
    let lastProces = TEMP_RUNNING_PROCESS;
    TEMP_RUNNING_PROCESS = null;
    handler();
    TEMP_RUNNING_PROCESS = lastProces;
  }
  static getProcess(id: number) {
    return all_processes.get(id);
  }
  static getAllProcess() {
    return all_processes;
  }

  @State()
  private value: (() => void) | void;
  private _shouldGoOn: boolean = true;

  private id: number;

  private childProcess = new Set<Processable>();

  count = 1;

  beginId: number;

  endId: number;

  throttle: Throttle | undefined;
  debounce: Debounce | undefined;

  useTick = false;

  tick = 0;

  // 父节点ID
  parent: Processable = TEMP_RUNNING_PROCESS;

  constructor(
    private handler: (opt: {
      count: number;
      id: number;
      process: Processable;
    }) => (() => void) | void,
    {
      initOnRun = true, // 是否在初始化的时候就执行
      nexttick = false,
    }: {
      nexttick?: number | boolean; // 下一个周期执行这里定义下一个周期的时间 0 就是setTimeout
      initOnRun?: boolean;
    } = {},
  ) {
    this.id = ++processId;
    all_processes.set(this.id, this);
    initOnRun && this.run();
    this.useTick = !(typeof nexttick === 'boolean' && !nexttick);
    this.tick = this.useTick ? (nexttick === true ? 0 : (nexttick as number)) : 0;
    if (this.useTick) {
      this.throttle = new Throttle(this.tick);
      this.debounce = new Debounce(this.tick);
    }
  }

  getId() {
    return this.id;
  }

  /**
   * 一个process钟可能有包含其他的process
   * 因此重新执行的时候，需要停止自己包含的其他process
   * 以防止不必要计算和内存泄漏
   */

  clearChildProcess() {
    this.childProcess.forEach((p) => {
      p.stop();
      p.clearChildProcess();
    });
    this.childProcess.clear();
  }

  getChildProcess() {
    return this.childProcess;
  }

  run() {
    // 不该继续，那得停止
    if (!this._shouldGoOn) return;
    this.beginId = processId;
    this.endId = -1;
    // 要销毁之前的事件监听
    this.removeEvents();
    // 由于重新运行了，需要清除之前的子程序
    this.clearChildProcess();
    // 保存上个进程
    let lastProces = TEMP_RUNNING_PROCESS;
    // 将当前进程加入父进程
    lastProces?.childProcess?.add(this);
    // 保为当前进程
    TEMP_RUNNING_PROCESS = this;
    this.value = this.handler({
      count: this.count,
      process: this,
      id: this.id,
    });
    TEMP_RUNNING_PROCESS = lastProces;
    //记录endId
    this.endId = processId;
  }

  update() {
    if (this.useTick) {
      // 忽略nextick内的请求，默认就是一个setTimeout 0的生命周期
      // 同时延迟next执行
      this.throttle.execute(() => this.debounce.execute(() => this.run()));
    } else {
      this.run();
    }
  }

  /**
   * reRun一般是在一个process已经停止了之后需要重新执行
   */
  reRun() {
    this._shouldGoOn = true;
    this.run();
  }

  /**
   * 返回结果是一个函数的话  表示是一个要在销毁时执行的函数
   */
  removeEvents() {
    if (this.value && typeof this.value === 'function') {
      this.value();
    }
  }

  stop() {
    if (!this._shouldGoOn) return;
    this.clearChildProcess();
    this._shouldGoOn = false;
    this.removeEvents();
    // 清除进程ID的记录
    all_processes.delete(this.id);
  }
}
