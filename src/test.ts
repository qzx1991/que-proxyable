import { QueProxyable, isProxyableData, getOriginData } from "./proxy";

const data = { a: { b: 133 } };
const a = QueProxyable(data);
console.log(getOriginData(a) === data);
