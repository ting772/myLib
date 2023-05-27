export default function (options) {
  let { consume, timeout = 1000, slice, maxIdleTime = 10000 } = options;

  let type = typeof slice;
  if (!["number", "function"].includes(type)) {
    throw Error("不支持的切割方式");
  }

  let list = [];
  let context = {};
  let initialParams;
  let timerId;
  let idleAtTime;
  let started;

  const append = function (...args) {
    list.push(...args);
    if (started && !timerId) {
      timerId = setTimeout(run, timeout);
    }
  };

  const run = () => {
    let arr;
    if (typeof slice == "number") {
      arr = list.splice(0, slice);
    } else if (typeof slice == "function") {
      arr = slice(list);
    } else {
      throw Error("不支持的切割方式");
    }

    timerId = undefined;
    if (arr.length == 0) {
      if (!idleAtTime) idleAtTime = +new Date();
      else if (+new Date() - idleAtTime > maxIdleTime) {
        idleAtTime = undefined;
        console.debug("finish consume");
        return;
      }
    } else {
      idleAtTime = undefined;
      try {
        consume(arr, { context, initialParams });
      } catch (e) {
        console.error("consume执行异常", e);
      }
    }

    console.debug(`consume next turn,${list.length} items left`);
    timerId = setTimeout(run, timeout);
  };

  const start = function (params) {
    if (started) return;
    started = true;
    initialParams = params;
    timerId = setTimeout(run, timeout);
  };

  return { append, start };
}
