import { emitter } from './common';

export class ProxyWatcher {
  onGet(handler: (target: any, property: string, value: any) => void) {
    return emitter.on('get', ({ target, property, value }: any) =>
      handler(target, property, value),
    );
  }
  onceGet(handler: (target: any, property: string, value: any) => void) {
    emitter.once('get', ({ target, property, value }: any) => handler(target, property, value));
  }

  onSet(handler: (target: any, property: string, value: any, oldValue: any) => void) {
    return emitter.on('set', ({ target, property, value, oldValue }: any) =>
      handler(target, property, value, oldValue),
    );
  }
  onceSet(handler: (target: any, property: string, value: any, oldValue: any) => void) {
    emitter.once('set', ({ target, property, value, oldValue }: any) =>
      handler(target, property, value, oldValue),
    );
  }
  onDelete(handler: (target: any, property: string) => void) {
    return emitter.on('delete', ({ target, property }: any) => handler(target, property));
  }
  onceDelete(handler: (target: any, property: string) => void) {
    return emitter.on('delete', ({ target, property }: any) => handler(target, property));
  }
}
