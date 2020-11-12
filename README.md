# que-proxyable 使用说明



> 一个简单的使用proxy代理对象的库，并能够进行监听。



## 简单使用

```typescript
import {QueProxyable, ProxyWatcher} from 'que-proxyable';
const data = QueProxyable({a: 100})
const watcher = new ProxyWatch();
const unsub = watcher.onGet((t, k) => console.log(t, k));
data.a = 1000; // print value of t and k
unsub();
data.a = 2000; // print nothing
```



## 进阶使用



### State

```typescript
import {State, ProxyWatcher} from 'que-proxyable';
class A {
    @State()
    count = 1;
}
const watcher = new ProxyWatcher();
watcher.onGet((t, k) => console.log(k));
const a = new A();
a.count;
// k's value count will print
```

### Compute

```javascript
import {State, Compute,} from 'que-proxyable';
class A {
    @State()
    count = 1;

	age = 1;

	@Compute()
	show()　{
        this.age++;
        return this.count;
    }

}
const a = new A();
a.show();
console.log(a.age); // 2
a.show();
console.log(a.age); // still 2
a.count++;
console.log(a.age); // still 2
a.show();
console.log(a.age); // 3
```

