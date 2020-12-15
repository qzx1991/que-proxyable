import { Debounce, Throttle } from 'que-utils';
import { ProxyWatcher } from './Watcher';

let processId = 0;
const all_processes = new Map<number, Processable>();
const watcher = new ProxyWatcher();
const TARTGET_PROCESS_STORE: Map<any, Map<string | symbol, Processable[]>> = new Map();
const PROCESS_TARGET_STORE = new Map<Processable, Map<any, Set<string | symbol>>>();
const SYSTEM_ADD_PROPERTY = Symbol('add');
const SYSTEM_DELETE_PROPERTY = Symbol('delete');

let TEMP_RUNNING_PROCESS: Processable | undefined = undefined;

function addProcessTargetStore(t: any, k: string | symbol, v?: any) {
  if (!TEMP_RUNNING_PROCESS) return;
  if (!PROCESS_TARGET_STORE.get(TEMP_RUNNING_PROCESS)) {
    PROCESS_TARGET_STORE.set(TEMP_RUNNING_PROCESS, new Map());
  }
  const pmap = PROCESS_TARGET_STORE.get(TEMP_RUNNING_PROCESS);
  if (!pmap.get(t)) {
    pmap.set(t, new Set());
  }
  const pset = pmap.get(t);
  pset.add(k);

  if (v && typeof v === 'object' && !Array.isArray(v)) {
    if (TEMP_RUNNING_PROCESS.opt?.add) {
      // pset.add(SYSTEM_ADD_PROPERTY);
      addProcessTargetStore(v, SYSTEM_ADD_PROPERTY);
    }
    if (TEMP_RUNNING_PROCESS.opt?.delete) {
      addProcessTargetStore(v, SYSTEM_DELETE_PROPERTY);
    }
  }
}

function addTargetProcessStore(t: any, k: string | symbol, v?: any) {
  if (!TEMP_RUNNING_PROCESS) return;

  if (v && typeof v === 'object' && !Array.isArray(v)) {
    // addTargetProcessStore(v, )
    if (TEMP_RUNNING_PROCESS.opt?.add) {
      // pset.add(SYSTEM_ADD_PROPERTY);
      addTargetProcessStore(v, SYSTEM_ADD_PROPERTY);
    }
    if (TEMP_RUNNING_PROCESS.opt?.delete) {
      addTargetProcessStore(v, SYSTEM_DELETE_PROPERTY);
    }
  }

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
        const process = arr.pop();
        PROCESS_TARGET_STORE.get(process).get(t).delete(k);
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

function addRely(t: any, k: string, v?: any) {
  addProcessTargetStore(t, k, v);
  addTargetProcessStore(t, k, v);
}

watcher.onGet((t, k, v) => {
  addRely(t, k, v);
});

function onSet(t: any, k: string | symbol) {
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
}

function deleteRely(process: Processable) {
  process.getChildProcess()?.forEach((p) => deleteRely(p));
  PROCESS_TARGET_STORE.get(process)?.forEach((keys, target) => {
    const store = TARTGET_PROCESS_STORE.get(target);
    store &&
      keys.forEach((key) => {
        const processes = store.get(key);
        processes &&
          store.set(
            key,
            processes.filter((p) => p !== process),
          );
      });
  });
  PROCESS_TARGET_STORE.delete(process);
}
watcher.onSet((t, k, v, ov, isAdd) => {
  // 对于t的常规属性的操作
  onSet(t, k);
  if (isAdd) {
    if (t && typeof t === 'object' && !Array.isArray(t)) {
      onSet(t, SYSTEM_ADD_PROPERTY);
    }
  }
});

watcher.onDelete((t, k, ov) => {
  onSet(t, SYSTEM_DELETE_PROPERTY);
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
    public handler: (opt: {
      count: number;
      id: number;
      process: Processable;
    }) => (() => void) | void,
    public opt?: {
      nexttick?: number | boolean; // 下一个周期执行这里定义下一个周期的时间 0 就是setTimeout
      // 是否在初始化的时候就运行
      initOnRun?: boolean;
      // 是否监听属性的删除
      delete?: boolean;
      // 是否监听属性的增加
      add?: boolean;
      // 是否
      syncArray?: boolean;
    },
  ) {
    opt = opt || {};
    const {
      initOnRun = true, // 是否在初始化的时候就执行
      nexttick = false,
    } = opt;
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
    // 清空自己的依赖
    deleteRely(this);
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
    all_processes.set(this.id, this);
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
