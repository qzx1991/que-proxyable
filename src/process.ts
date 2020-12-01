import { State } from './@State';
import { ProxyWatcher } from './Watcher';

let processId = 0;
const all_processes = new Map<number, Processable>();
const watcher = new ProxyWatcher();
const TARTGET_PROCESS_STORE: Map<any, Map<string, Processable[]>> = new Map();
let TEMP_RUNNING_PROCESS: Processable | undefined = undefined;

function addRely(t, k) {
  if (!TEMP_RUNNING_PROCESS) return;
  if (!TARTGET_PROCESS_STORE.get(t)) {
    TARTGET_PROCESS_STORE.set(t, new Map());
  }
  if (!TARTGET_PROCESS_STORE.get(t).get(k)) {
    TARTGET_PROCESS_STORE.get(t).set(k, []);
  }
  const arr = TARTGET_PROCESS_STORE.get(t).get(k);
  for (let i = arr.length - 1; i >= 0; i--) {
    const p = arr[i];
    // 表示是这个之后的
    if (p.getId() >= TEMP_RUNNING_PROCESS.beginId) {
      arr.pop();
    } else {
      break;
    }
  }
  arr.push(TEMP_RUNNING_PROCESS);
}

watcher.onGet((t, k) => {
  addRely(t, k);
});
watcher.onSet((t, k) => {
  const ps = TARTGET_PROCESS_STORE.get(t)?.get(k);
  // 标识是setting
  // 运行
  TARTGET_PROCESS_STORE.get(t)?.delete(k);
  if (TARTGET_PROCESS_STORE.get(t)?.size === 0) {
    TARTGET_PROCESS_STORE.delete(t);
  }
  ps?.forEach((p) => p.run());
  TARTGET_PROCESS_STORE.get(t)?.delete(k);
  if (TARTGET_PROCESS_STORE.get(t)?.size === 0) {
    TARTGET_PROCESS_STORE.delete(t);
  }
});

export class Processable {
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

  beginId: number;

  // 父节点ID
  parent: Processable = TEMP_RUNNING_PROCESS;

  constructor(private handler: () => (() => void) | void, initOnRun = true) {
    this.id = ++processId;
    all_processes.set(this.id, this);
    initOnRun && this.run();
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
    this.value = this.handler();
    TEMP_RUNNING_PROCESS = lastProces;
  }

  removeEvents() {
    if (this.value) {
      this.value();
    }
  }

  stop() {
    this.clearChildProcess();
    this._shouldGoOn = false;
    this.removeEvents();
    // 清除进程ID的记录
    all_processes.delete(this.id);
  }
}
