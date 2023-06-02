/**
 * 任务队列
 * 每timeout ms从队列取出一任务（回调函数形式）执行，
 * 队列没有任务时，maxIdleTime ms后队列休眠，等下次往队列里append任务时唤醒
 */
export default function BufferList(options) {
  let {
    bufferCount = 10, //每次最多处理多少项
    timeout = 100, // 每项处理间隔 number
    maxIdleTime = 5000, //最大空闲时间 number
    debug, //是否开启debug记录  boolean
    handle, //列表项处理函数  (item:any,obj:{initialParams:any;context:{}})=>void
  } = options || {};

  if (!(this instanceof BufferList)) {
    return new BufferList(options);
  }

  const log = debug ? (...args) => console.debug(...args) : () => {};

  let timer;
  let started;
  let list = [];
  let idleAtTime;
  let initialParams;
  let context = {};

  const run = () => {
    if (list.length > 0) {
      idleAtTime = undefined;
      try {
        handle(list.splice(0, bufferCount), { initialParams, context });
      } catch (e) {
        console.error("handle执行异常", e);
      }
      log(`执行轮次,剩余${list.length}项`);
    } else if (typeof idleAtTime == "undefined") {
      log("空闲检查轮次");
      idleAtTime = new Date().getTime();
    } else if (new Date().getTime() - idleAtTime >= maxIdleTime) {
      //空闲超时
      timer = null;
      log("空闲超时");
      return;
    } else {
      log("空闲检查轮次");
    }
    timer = setTimeout(run, timeout);
  };

  //(params?:any)=>void
  const start = (params) => {
    if (started) return;
    started = true;
    initialParams = params;
    run();
  };

  // (item:any)=>void
  const append = (...items) => {
    list.push(...items);
    if (started && !timer) {
      run();
    }
  };

  Object.assign(this, { start, append });
}
