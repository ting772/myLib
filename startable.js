const STATES = {
  INITIAL: 0,
  RUNNING: 1,
  PAUSED: 2,
  STOPPED: 3,
  ENDED: 4,
};

let taskId = 0;

export default function Startable(options) {
  let { autoStart, run, initialParams, name } = options;

  if (!(this instanceof Startable)) {
    return new Startable(options);
  }

  name = name ?? `task-${++taskId}`;

  let state = STATES.INITIAL;
  const signals = [];
  const context = {
    name,
  };

  const nextCreator = () => {
    const ret = (end) => {
      if (ret.called) return;
      ret.called = true;
      if (end) state = STATES.ENDED;
      let callback;
      while ((callback = signals.shift())) {
        callback();
      }
      if (state == STATES.RUNNING) run(runContextCreator());
    };
    return ret;
  };

  const runContextCreator = () => {
    return {
      initialParams,
      context,
      next: nextCreator(),
    };
  };

  const pause = () => {
    if (state !== STATES.RUNNING) {
      throw Error("pause调用只能在运行状态调用");
    }
    return new Promise((resolve, reject) => {
      signals.push(() => {
        if (state == STATES.RUNNING) {
          state = STATES.PAUSED;
          resolve();
        } else {
          reject(Error(`暂停失败，当前状态${state}`));
        }
      });
    });
  };
  const resume = () => {
    if (state !== STATES.PAUSED) {
      throw Error("resume调用只能在暂停状态调用");
    }
    state = STATES.RUNNING;
    run(runContextCreator());
  };
  const stop = () => {
    if (![STATES.PAUSED, STATES.RUNNING].includes(state)) {
      throw Error("stop调用只能在暂停或者运行状态调用");
    }
    if (state == STATES.PAUSED) {
      state = STATES.STOPPED;
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      signals.push(() => {
        if ([STATES.PAUSED, STATES.RUNNING].includes(state)) {
          state = STATES.STOPPED;
          resolve();
        } else {
          reject(Error(`停止失败，当前状态${state}`));
        }
      });
    });
  };
  const start = (params) => {
    if (state !== STATES.INITIAL) {
      throw Error("start调用只能在初始状态调用");
    }

    initialParams = params;
    state = STATES.RUNNING;
    run(runContextCreator());
  };

  const isRunning = () => state == STATES.RUNNING;
  const isStopped = () => state == STATES.STOPPED;

  if (autoStart) {
    Promise.resolve().then(() => {
      start(initialParams);
    });
  }

  Object.assign(this, {
    name,
    pause,
    stop,
    resume,
    start,
    isRunning,
    isStopped,
  });
}
