const isFunc = (obj) => typeof obj == "function";

/**
 * 并发队列
 * 指定最大并发个数、处理回调函数
 * 当启动时以及追加数据项时、单项处理完成时、队列启动时、开始loop，直到最大并发数
 */
export default function ConcurrentList(options) {
  let {
    max = 10, //最大并行处理数量
    handle, //处理回调 (item:any,obj:{initialParams:any,context:{},done:()=>{}})=>void  完成or异常时需要调用done释放资源
    onTotalUpdate, //总共处理数量更新回调 (n:number)=>void
    onCurrentUpdate, //当前正在处理数量更新回调 (n:number)=>void
    onListLeftUpdate, //当前剩余数量回调 (n:number)=>void
  } = options;

  if (!(this instanceof ConcurrentList)) {
    return new ConcurrentList(options);
  }

  let list = [];
  let current = 0;
  let total = 0;
  let started = false;
  let context = {};
  let initialParams;

  const notifyListLengthChange = () => {
    if (isFunc(onListLeftUpdate)) {
      try {
        onListLeftUpdate(list.length);
      } catch (e) {
        console.error("onListLeftUpdate内部异常", e);
      }
    }
  };

  const notifyTotalChange = () => {
    if (isFunc(onTotalUpdate)) {
      try {
        onTotalUpdate(total);
      } catch (e) {
        console.error("onTotalUpdate内部异常", e);
      }
    }
  };

  const notifyCurrentChange = () => {
    if (isFunc(onCurrentUpdate)) {
      try {
        onCurrentUpdate(current);
      } catch (e) {
        console.error("onCurrentUpdate内部异常", e);
      }
    }
  };

  const decrement = () => {
    current--;
    notifyCurrentChange();

    if (list.length > 0) {
      console.debug("decrement启动loop");
      loop();
    }
  };

  const increment = () => {
    current++;
    notifyCurrentChange();
  };

  const loop = () => {
    let item;
    while (current < max && (item = list.shift())) {
      increment();
      notifyListLengthChange();
      try {
        handle(item, {
          context,
          initialParams,
          done: decrement,
        });
      } catch (e) {
        console.error(e);
      }
    }
  };

  const start = (params) => {
    if (started) return;
    started = true;
    initialParams = params;
    if (list.length > 0) {
      console.debug("start启动loop");
      loop();
    }
  };

  const append = (...items) => {
    if (items.length == 0) return;

    list.push(...items);
    total += items.length;
    notifyTotalChange();
    notifyListLengthChange();

    if (started && current < max && list.length > 0) {
      console.debug("append启动loop");
      loop();
    }
  };

  Object.assign(this, {
    append, //追加数据
    start, //开始处理列表项
  });
}
