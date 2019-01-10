"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance"); }

function _iterableToArrayLimit(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

const _ = new WeakMap();

const MAX_TIMEOUT = 1e17; // Node / Browser timing function

const now = typeof process === "object" && typeof process.hrtime === "function" ? (a, b) => {
  var _process$hrtime, _process$hrtime2;

  return (_process$hrtime = process.hrtime(), _process$hrtime2 = _slicedToArray(_process$hrtime, 2), a = _process$hrtime2[0], b = _process$hrtime2[1], _process$hrtime), a * 1e3 + b * 1e-6;
} : typeof performance === "object" && typeof performance.now === "function" ? performance.now.bind(performance) : Date.now; // Helper to handle multiple callbacks listening to an event

class DisposableMegaphone {
  constructor() {
    _.set(this, {
      callbacks: []
    });
  }

  speak(...params) {
    const self = _.get(this);

    if (self.used) throw new Error(this.constructor.name + ".speak() must be called only once." + " Cannot accept " + String(params) + " after " + String(self.params));
    self.used = true;
    self.params = params;
    self.callbacks.forEach(callback => callback.apply(null, params));
    self.callbacks = null;
  }

  listen(callback) {
    if (typeof callback !== "function") throw new Error(this.constructor.name + ".listen requires a function as callback");

    const _$get = _.get(this),
          used = _$get.used,
          params = _$get.params,
          callbacks = _$get.callbacks;

    if (used) {
      callback.apply(null, params);
    } else {
      callbacks.push(callback);
    }
  }

}
/*
   Evaluation is something between a normal foo(callback) and a Promise = () = {...}
    Promise always run asynchrounsly: this creates some problems, since Condition uses proxying:
   ! (c0) => NotClass(Class(...)): normally all logic evaluations should be transactional
    Also, Promise is resolved as soon as it's created, this doesn't facilitate lazy behaviour with
   arrays of Conditions that must be passed to an && or || operator.
    Lastly, there is a specific issue with any Condition using a setTimeout or setInterval: you can't
   easily clear it off in case you don't need it anymore. This may happen using .anda(), or .out()
   for example.
    Evaluation object allows two-side communication for this regard, with the .abort() method.
    Some features:
    - It's "functional-like": nothing can be changed once evaluated.
    - .on((...x) => {}) returns nothing. This stuff is not chainable, at the moment.
    - if no .on() has ever been called, the condition is NOT evaluated (lazy behaviour)
    - a.on(f0), a.on(f1), a.on.(f2): all f0, f1, ... things may happen:
      SYNCH/ASYNCH but ALREADY RESOLVED/REJECTED: Evaluation.on(resolve, reject), listener runs immediately
      ASYNCH pending or ongoing: .on(listener, ...) listener is scheduled in a queue
      SYNCH pending or ongoing: .on(listener, ...) listner runs immediately
    - It can be encapsulated into a Promise with .toPromise(). WILL BREAK LAZINESS:
     This will cause calling .on() and evaluating it.
    - .then() is a shortcut for .toPromise().then() 
    - .ona() method schedules the evaluation for async execution. Differently from .then(),
      which evalutes immediately but schedules the listeners async, .ona() evaluates asynch:
        .then(resolve); foo(); => [EVALUATE]+[FOO] +/async/[RESOLVE]
       .ona(resolve); foo(); => [FOO] +/async/[EVALUATE]+[RESOLVE]
 */


const EVALUATION_PENDING = "pending";
const EVALUATION_ONGOING = "ongoing";
const EVALUATION_RESOLVED = "resolved";
const EVALUATION_REJECTED = "rejected";

const EVALUATION_FULFILL = function EVALUATION_FULFILL(value) {
  const self = _.get(this);

  if (self.done) {
    console.warn("Resolver function attempted to call onFulfilled after status was already set, ignored");
    return;
  }

  self.done = true;
  self.value = value;
  self.status = EVALUATION_RESOLVED;
  self.queue.speak((resolve, reject) => resolve(value));
};

const EVALUATION_REJECT = function EVALUATION_REJECT(reason) {
  const self = _.get(this);

  if (self.done) {
    console.warn("Resolver function attempted to call onRejected after status was already set, ignored");
    return;
  }

  self.done = true;
  self.reason = reason;
  self.status = EVALUATION_REJECTED;
  self.queue.speak((resolve, reject) => reject(reason));
};

class Evaluation {
  static resolve(value) {
    return new Evaluation(resolve => resolve(value));
  }

  static reject(reason) {
    return new Evaluation((_, reject) => reject(reason));
  }

  constructor(resolver, aborter = () => undefined) {
    if (typeof resolver !== "function") throw new Error(this.constructor.name + " resolver " + String(resolver) + " is not a function");
    if (typeof aborter !== "function") throw new Error(this.constructor.name + " aborter " + String(aborter) + " is not a function");

    _.set(this, {
      resolver,
      aborter,
      done: false,
      status: EVALUATION_PENDING,
      queue: new DisposableMegaphone()
    });
  }

  abort(reason = "aborted") {
    const _$get2 = _.get(this),
          status = _$get2.status,
          aborter = _$get2.aborter;

    if (status === EVALUATION_ONGOING) {
      EVALUATION_REJECT.call(this, reason);

      try {
        aborter.call(null);
      } catch (e) {
        // Silent error
        console.warn(this.constructor.name + ".abort()", e);
      }

      return true;
    } else if (status === EVALUATION_PENDING) {
      EVALUATION_REJECT.call(this, reason);
      return true;
    } // Can't abort an already resolved / rejected Evaluation


    return false;
  }

  on(onFulfilled, onRejected) {
    // As the Promise object, it does ignore non-function parameters
    typeof onFulfilled === "function" || (onFulfilled = x => x);
    typeof onRejected === "function" || (onRejected = e => {
      throw e;
    });

    const self = _.get(this);

    if (self.status === EVALUATION_PENDING) {
      // Resolve for the very first time
      self.status = EVALUATION_ONGOING;

      try {
        self.resolver.call(null, EVALUATION_FULFILL.bind(this), EVALUATION_REJECT.bind(this));
      } catch (reason) {
        EVALUATION_REJECT.call(this, reason);
      } finally {
        self.async = !self.done;
      }
    }

    if (self.status === EVALUATION_RESOLVED) {
      onFulfilled.call(null, self.value);
    } else if (self.status === EVALUATION_REJECTED) {
      onRejected.call(null, self.reason);
    } else if (self.status === EVALUATION_ONGOING) {
      // Queue this instance listeners
      self.queue.listen(fn => fn(onFulfilled, onRejected));
    }
  } // then(...) resolver is synch, listener is async
  // .ona(...) both resolver and listener is async


  ona(onFulfilled, onRejected) {
    Promise.resolve().then(_ => {
      this.on(onFulfilled, onRejected);
    });
  }

  get status() {
    return _.get(this).status;
  }

  get async() {
    const _$get3 = _.get(this),
          status = _$get3.status,
          async = _$get3.async;

    if (status === EVALUATION_PENDING) throw new Error(".async does not exist for [" + status + "] status");
    return !!async;
  }

  get value() {
    const _$get4 = _.get(this),
          status = _$get4.status,
          value = _$get4.value;

    if (status !== EVALUATION_RESOLVED) throw new Error(".value does not exist for [" + status + "] status");
    return value;
  }

  get reason() {
    const _$get5 = _.get(this),
          status = _$get5.status,
          reason = _$get5.reason;

    if (status !== EVALUATION_REJECTED) throw new Error(".reason does not exist for [" + status + "] status");
    return reason;
  }

  toString() {
    const _$get6 = _.get(this),
          status = _$get6.status,
          reason = _$get6.reason,
          value = _$get6.value;

    const info = status === EVALUATION_RESOLVED ? value : status === EVALUATION_REJECTED ? reason : "";
    return `<${status}>${info}`;
  }

  toPromise() {
    // Breaks lazyness
    return new Promise(this.on.bind(this));
  }

  then(onFulfilled, onRejected) {
    return this.toPromise().then(onFulfilled, onRejected);
  } // [util.inspect.custom] (depth, options) needs handling for browserify


  get [Symbol.toStringTag]() {
    return this.toString();
  }

} // Base class


class Condition {
  constructor(members = {}) {
    _.set(this, Object.assign({}, members));
  }

  test() {
    return Evaluation.reject(new Error(this.constructor.name + ".test() must be implemented on a derived class"));
  }

  toPromise(initialValue) {
    return new Promise((resolve, reject) => this.test(initialValue).on(resolve, reject));
  }

}

class StaticCondition extends Condition {
  constructor(value) {
    super({
      value
    });
  }

  get value() {
    return _.get(this).value;
  }

  test() {
    return Evaluation.resolve(_.get(this).value);
  }

  toString() {
    const _$get7 = _.get(this),
          value = _$get7.value;

    return typeof value === "string" ? `("${value}")` : `(${String(value)})`;
  }

}

class TrueCondition extends StaticCondition {
  constructor() {
    if (_.has(TrueCondition)) return _.get(TrueCondition);
    super(true);

    _.set(TrueCondition, this);
  }

}

class FalseCondition extends StaticCondition {
  constructor() {
    if (_.has(FalseCondition)) return _.get(FalseCondition);
    super(false);

    _.set(FalseCondition, this);
  }

}

const TRUE = new TrueCondition();
const FALSE = new FalseCondition(); // Useful for debug

class ErrorCondition extends Condition {
  constructor(reason) {
    super({
      reason
    });
  }

  get reason() {
    return _.get(this).reason;
  }

  test() {
    return Evaluation.reject(_.get(this).reason);
  }

  toString() {
    return "(throw " + String(_.get(this).reason) + ")";
  }

} // A never-resolving condition


class EternalCondition extends Condition {
  test() {
    return new Evaluation(() => undefined);
  }

  toString() {
    return "(∞)";
  }

} // A function that either:
// returns a value (behave as StaticCondition)
// throws an error (behave as ErrorCondition)
// returns a Promise (behave as PromiseCondition)
// returns either a Condition/Chainable object (resolve recursively)


class FunctionalCondition extends Condition {
  constructor(fn) {
    super({
      fn
    });
    if (typeof fn !== "function") throw new Error(this.constructor.name + " must be constructed from a function");
  }

  get fn() {
    return _.get(this).fn;
  }

  test(initialValue, scope) {
    const _$get8 = _.get(this),
          fn = _$get8.fn;

    return new Evaluation((resolve, reject) => {
      try {
        const result = fn.call(null, initialValue);

        if (isChainable(result)) {
          result.condition.test(initialValue, scope).on(resolve, reject);
        } else if (result instanceof Condition) {
          result.test(initialValue, scope).on(resolve, reject);
        } else if (result instanceof Promise) {
          new PromiseCondition(result).test(initialValue, scope).on(resolve, reject);
        } else {
          resolve(result);
        }
      } catch (e) {
        reject(e);
      }
    });
  }

  toString() {
    const _$get9 = _.get(this),
          fn = _$get9.fn;

    return "ƒ(" + String(fn) + ")";
  }

}

class PromiseCondition extends Condition {
  constructor(promise) {
    super({
      promise
    });
    if (!(promise instanceof Promise)) throw new Error(this.constructor.name + " must be constructed from a Promise");
  }

  get promise() {
    return _.get(this).promise;
  }

  test() {
    return new Evaluation((resolve, reject) => _.get(this).promise.then(resolve, reject));
  }

  toString() {
    return "(" + String(_.get(this).promise) + ")";
  }

} // Base class for MultyProxy


class ConditionList extends Condition {
  constructor(...conditions) {
    super({
      conditions
    });
    if (conditions.some(condition => !(condition instanceof Condition))) throw new Error(this.constructor.name + " must be constructed from Condition objects only");
    if (conditions.length < 2) throw new Error(this.constructor.name + " must be constructed from at least two Condition objects");
  }

  get conditions() {
    return _.get(this).conditions.slice();
  }

  get length() {
    return _.get(this).conditions.length;
  }

  toString() {
    return "[" + _.get(this).conditions.map(String).join() + "]";
  }

} // MixIn


const Sequential = operator => class extends ConditionList {
  test(initialValue) {
    const _$get10 = _.get(this),
          conditions = _$get10.conditions;

    let aborted, subEvaluation;

    const resolver = (resolve, reject) => {
      let result;

      const testOne = (index = 0) => {
        if (aborted) return;

        if (index >= conditions.length) {
          resolve(result);
          return;
        }

        subEvaluation = conditions[index].test(index ? result : initialValue);
        subEvaluation.on(value => {
          const ref = {
            value,
            isFirst: !index,
            isLast: index + 1 >= conditions.length,
            result,
            shouldBreak: false
          };

          try {
            operator.call(null, ref);
            result = ref.result;
          } catch (reason) {
            reject(reason);
            return;
          }

          testOne(ref.shouldBreak ? Infinity : ++index);
        }, reject);
      };

      testOne(0);
    };

    return new Evaluation(resolver, () => {
      aborted = true;
      if (subEvaluation) subEvaluation.abort();
    });
  }

  toString() {
    return "[" + _.get(this).conditions.map(String).join(operator.name) + "]";
  }

}; // MixIn


const Parallel = operator => class extends ConditionList {
  test(...params) {
    const _$get11 = _.get(this),
          conditions = _$get11.conditions;

    const length = conditions.length;
    let aborted, subEvaluations;

    const aborter = () => {
      aborted = true;
      if (subEvaluations) subEvaluations.forEach(subEvaluation => subEvaluation.abort());
    };

    const resolver = (resolve, reject) => {
      let result, done;
      let executed = 0;

      const shouldResolve = () => {
        if (done || aborted) return;
        resolve(result);
        done = true;
      };

      const shouldReject = reason => {
        if (done || aborted) return;
        reject(reason);
        done = true;
      };

      const onResolvedOne = value => {
        const isFirst = !executed;
        const isLast = ++executed >= length;
        const ref = {
          value,
          isFirst,
          isLast,
          result,
          shouldBreak: false
        };

        try {
          operator.call(null, ref);
          result = ref.result;
          if (ref.shouldBreak || isLast) shouldResolve();
        } catch (reason) {
          shouldReject(reason);
        }
      };

      subEvaluations = conditions.map(condition => {
        const subEvaluation = condition.test(...params);
        subEvaluation.ona(onResolvedOne, shouldReject);
        return subEvaluation;
      });
    };

    return new Evaluation(resolver, aborter);
  }

  toString() {
    return "[" + _.get(this).conditions.map(String).join("⋕" + operator.name + "⋕") + "]";
  }

};
/*  OPERATORS:
    +  must be SYNCHRONOUS
    +  op({result, value, isFirst, isLast, shouldBreak}) {...}
    +  isFirst, isLast: is not related to index (in parallel mode, in sequential coincides)
    +  if shouldBreak is set true, testing sequence is interrupted.
    +  in case it throws an error, .test() returns a rejected Evaluation */


const OR = r => {
  r.result = r.result || r.value;
  r.shouldBreak = r.result;
};

const AND = r => {
  r.result = r.isFirst ? r.value : r.result && r.value;
  r.shouldBreak = !r.result;
};

const NOR = r => {
  r.result = r.isFirst ? !r.value : r.result && !r.value;
  r.shouldBreak = r.value;
};

const NAND = r => {
  r.result = r.result || !r.value;
  r.shouldBreak = r.result;
};

const XOR = r => {
  r.result = r.isFirst ? r.value : !r.result && r.value || !r.value && r.result;
};

const XNOR = r => {
  r.result = r.isFirst ? r.value : !r.result && !r.value || r.result && r.value;
};

const LINK = r => {
  r.result = r.value;
};

class SequentialOr extends Sequential(OR) {}

class SequentialAnd extends Sequential(AND) {}

class SequentialNor extends Sequential(NOR) {}

class SequentialNand extends Sequential(NAND) {}

class SequentialXor extends Sequential(XOR) {}

class SequentialXnor extends Sequential(XNOR) {}

class SequentialLink extends Sequential(LINK) {}

class ParallelOr extends Parallel(OR) {}

class ParallelAnd extends Parallel(AND) {}

class ParallelNor extends Parallel(NOR) {}

class ParallelNand extends Parallel(NAND) {}

class ParallelXor extends Parallel(XOR) {}

class ParallelXnor extends Parallel(XNOR) {}

class ParallelLink extends Parallel(LINK) {} // A base for single Condition Proxy


class UnaryProxyCondition extends Condition {
  constructor(source, members = {}) {
    super(Object.assign({}, members, {
      source
    }));
    if (!(source instanceof Condition)) throw new Error(this.constructor.name + " must be constructed from a Condition object");
  }

  get source() {
    return _.get(this).source;
  }

  toString() {
    return "(Proxy: " + _.get(this).source.toString() + ")";
  } // test () {...} should be overriden by subclass


}

class DelayedCondition extends UnaryProxyCondition {
  constructor(source, delay = 0) {
    super(source);
    delay = +delay;
    if (Number.isNaN(delay)) throw new Error(this.constructor.name + "(..., delay) requires a numeric value or it can be omitted");
    if (delay < 0) delay = 0;
    if (delay > MAX_TIMEOUT) return new EternalCondition();
    _.get(this).delay = delay;
  }

  test(...params) {
    const _$get12 = _.get(this),
          source = _$get12.source,
          delay = _$get12.delay;

    let handle, subEvaluation;
    return new Evaluation((resolve, reject) => handle = setTimeout(() => {
      handle = null;
      subEvaluation = source.test(...params);
      subEvaluation.on(resolve, reject);
    }, delay), () => {
      /* aborter */
      if (handle) {
        clearTimeout(handle);
        handle = null;
      }

      if (subEvaluation) subEvaluation.abort();
    });
  }

  get delay() {
    return _.get(this).delay;
  }

  toString() {
    const _$get13 = _.get(this),
          source = _$get13.source,
          delay = _$get13.delay;

    return `{${delay}ms↗${source.toString()}}`;
  }

}

class DurableCondition extends UnaryProxyCondition {
  constructor(source, duration = 0) {
    super(source);
    duration = +duration;
    if (Number.isNaN(duration)) throw new Error(this.constructor.name + " expects a numeric duration or it can be omitted");
    if (duration < 0) return FALSE;
    if (!duration) return source;
    if (duration > MAX_TIMEOUT) duration = +Infinity;
    _.get(this).duration = duration;
  }

  get duration() {
    return _.get(this).duration;
  }

  test(...params) {
    const _$get14 = _.get(this),
          source = _$get14.source,
          duration = _$get14.duration;

    const t0 = now();
    let aborted;
    let subEvaluation;
    return new Evaluation((resolve, reject) => {
      const attempt = () => {
        subEvaluation = source.test(...params);
        subEvaluation.on(value => {
          if (aborted) return;else if (!value || now() - t0 >= duration) {
            resolve(value);
          } else {
            setTimeout(attempt, 0); // Average: 4.318518785088027
            // Promise.resolve({then: attempt}); // Average: 0.007504767491017662
          }
        }, reject);
      };

      attempt();
    }, () => {
      /* aborter */
      aborted = true;
      if (subEvaluation) subEvaluation.abort();
    });
  }

  toString() {
    return _.get(this).source.toString();
  }

}

class TimeoutCondition extends UnaryProxyCondition {
  constructor(source, duration = Infinity) {
    super(source);
    duration = +duration;
    if (Number.isNaN(duration)) throw new Error(this.constructor.name + " expects a numeric duration or it can be omitted");
    if (duration > MAX_TIMEOUT) return source;
    if (duration <= 0) return FALSE;
    _.get(this).duration = duration;
  }

  get duration() {
    return _.get(this).duration;
  }

  test(...params) {
    const _$get15 = _.get(this),
          source = _$get15.source,
          duration = _$get15.duration;

    let done, handle, subEvaluation;

    const clear = () => {
      if (!handle) return;
      clearTimeout(handle);
      handle = null;
    };

    const aborter = () => {
      done = true;
      clear();
      if (subEvaluation) subEvaluation.abort();
    };

    const resolver = (resolve, reject) => {
      const shouldReject = reason => {
        if (done) return;
        done = true;
        clear();
        reject(reason);
      };

      const shouldResolve = value => {
        if (done) return;
        done = true;
        clear();
        resolve(value);
      };

      subEvaluation = source.test(...params);
      handle = setTimeout(() => {
        handle = null;
        shouldResolve(false);
        subEvaluation.abort();
      }, duration);
      subEvaluation.ona(shouldResolve, shouldReject);
    };

    return new Evaluation(resolver, aborter);
  }

  toString() {
    return _.get(this).source.toString();
  }

} // Try to confirm the conjecture by repeating test
// on the condition until it results true


class CycleCondition extends UnaryProxyCondition {
  constructor(source, attempts = 1) {
    super(source);
    attempts = +attempts;
    if (Number.isNaN(attempts)) throw new Error(this.constructor.name + " requires an integer for attempts or it can be omitted");
    if (attempts < 1) return FALSE;
    attempts = Math.floor(attempts);
    _.get(this).attempts = attempts;
  }

  get attempts() {
    return _.get(this).attempts;
  }

  test(...params) {
    const _$get16 = _.get(this),
          source = _$get16.source,
          attempts = _$get16.attempts;

    let subEvaluation;
    let aborted;
    let countdown = attempts;

    const aborter = () => {
      aborted = true;
      if (subEvaluation) subEvaluation.abort();
    };

    const resolver = (resolve, reject) => {
      const attempt = () => {
        if (aborted) return;
        subEvaluation = source.test(...params);
        subEvaluation.on(value => {
          if (aborted) return;else if (value || --countdown < 1) {
            resolve(value);
          } else {
            setTimeout(attempt, 0);
          }
        }, reject);
      };

      attempt();
    };

    return new Evaluation(resolver, aborter);
  }

} // Resolves in !value


class NegativeCondition extends UnaryProxyCondition {
  constructor(source) {
    super(source); // (!(! x)) => Bool(x)

    if (source instanceof NegativeCondition) return new BooleanCondition(source.source); // (!(Bool(x)) => (!x)

    if (source instanceof BooleanCondition) return new NegativeCondition(source.source);
  }

  test(...params) {
    const _$get17 = _.get(this),
          source = _$get17.source;

    let subEvaluation;
    return new Evaluation((resolve, reject) => {
      subEvaluation = source.test(...params);
      subEvaluation.on(result => resolve(!result), reject);
    }, () => subEvaluation && subEvaluation.abort());
  }

  toString() {
    return "!" + _.get(this).source.toString();
  }

} // Resolves in !!value or Boolean(value)


class BooleanCondition extends UnaryProxyCondition {
  constructor(source) {
    super(source); // Boolean(Boolean(x)) = Boolean(x);  Boolean(!(x)) = !(x)

    if (source instanceof BooleanCondition || source instanceof NegativeCondition) return source;
  }

  test(...params) {
    const _$get18 = _.get(this),
          source = _$get18.source;

    let subEvaluation;
    return new Evaluation((resolve, reject) => {
      subEvaluation = source.test(...params);
      subEvaluation.on(result => resolve(!!result), reject);
    }, () => subEvaluation && subEvaluation.abort());
  }

  toString() {
    return "Boolean" + _.get(this).source.toString();
  }

}

class EventCondition extends UnaryProxyCondition {
  constructor(source, onResolve, onReject) {
    super(source);
    _.get(this).onResolve = typeof onResolve === "function" ? onResolve : _ => undefined;
    _.get(this).onReject = typeof onReject === "function" ? onReject : _ => undefined;
  }

  test(...params) {
    const _$get19 = _.get(this),
          source = _$get19.source,
          onResolve = _$get19.onResolve,
          onReject = _$get19.onReject;

    let subEvaluation;
    return new Evaluation((resolve, reject) => {
      subEvaluation = source.test(...params);
      subEvaluation.on(value => {
        onResolve.call(null, value);
        resolve(value);
      }, reason => {
        onReject.call(null, reason);
        reject(reason);
      });
    }, () => {
      /* aborter */
      if (subEvaluation) subEvaluation.abort();
    });
  }

  toString() {
    return _.get(this).source.toString();
  }

}

class TrueEventCondition extends EventCondition {
  constructor(source, handler) {
    const onResolve = value => value && handler.call(null, value);

    super(source, onResolve);
    if (typeof handler !== "function") throw new Error(this.constructor.name + " needs a function as handler");
  }

}

class FalseEventCondition extends EventCondition {
  constructor(source, handler) {
    const onResolve = value => value || handler.call(null, value);

    super(source, onResolve);
    if (typeof handler !== "function") throw new Error(this.constructor.name + " needs a function as handler");
  }

}

class ErrorEventCondition extends EventCondition {
  constructor(source, handler) {
    super(source, undefined, handler);
    if (typeof handler !== "function") throw new Error(this.constructor.name + " needs a function as handler");
  }

} // Colors for console


const FG_GB_RESET = "\x1b[0m";
const FG_BRIGHT = "\x1b[1m";
const FG_DIM = "\x1b[2m";
const FG_UNDERSCORE = "\x1b[4m"; // const FG_BLINK = "\x1b[5m";
// const FG_GB_REVERSE = "\x1b[7m";
// const FG_GB_HIDDEN = "\x1b[8m";
// const FG_BLACK = "\x1b[30m";
// const FG_RED = "\x1b[31m";

const FG_GREEN = "\x1b[32m";
const FG_YELLOW = "\x1b[33m"; // const FG_BLUE = "\x1b[34m";
// const FG_MAGENTA = "\x1b[35m";

const FG_CYAN = "\x1b[36m";
const FG_WHITE = "\x1b[37m"; // const BG_BLACK = "\x1b[40m";

const BG_RED = "\x1b[41m"; // const BG_GREEN = "\x1b[42m";
// const BG_YELLOW = "\x1b[43m";
// const BG_BLUE = "\x1b[44m";
// const BG_MAGENTA = "\x1b[45m";

const BG_CYAN = "\x1b[46m"; // const BG_WHITE = "\x1b[47m";

const CHAINABLE_PROTOTYPE = {
  toString: function toString() {
    return "C" + _.get(this).chain.map(link => `.${link.method.name}(${link.params.map(String).join(", ")})`).join("");
  },

  get condition() {
    const _$get20 = _.get(this),
          chain = _$get20.chain;

    return chain.length && chain[chain.length - 1].condition || FALSE;
  },

  toPromise: function toPromise(initialValue) {
    return this.condition.toPromise(initialValue);
  },
  run: function run(initialValue) {
    if (DEBUG_MODE) return this.debug(initialValue); // unstable feature

    const evaluation = this.condition.test(initialValue);
    evaluation.on();
    return evaluation;
  },
  debug: function debug(initialValue) {
    const evaluation = this.condition.test(initialValue);
    const handle = "#" + ++DEBUG_COUNTER;
    console.log(`${FG_BRIGHT}${FG_WHITE}${BG_CYAN}TEST ${handle} runs${FG_GB_RESET}${FG_BRIGHT}${FG_CYAN} C${this.toString()}${FG_GB_RESET}`);
    evaluation.on(value => {
      const valueColor = `${FG_BRIGHT}${value ? FG_GREEN : FG_YELLOW}`;
      console.log(`TEST ${handle}: [${valueColor}${!!value}${FG_GB_RESET}]${valueColor}`, value, `${FG_GB_RESET}`);
    }, reason => {
      console.error(`${FG_BRIGHT}${FG_WHITE}${BG_RED}TEST ${handle} rejects the evaluation,`, reason, `${FG_GB_RESET}`);
    });

    if (evaluation.async) {
      console.log(`${FG_DIM}${FG_UNDERSCORE}${FG_YELLOW}TEST ${handle} is running asynchronously${FG_GB_RESET}`);
    } else {
      console.log(`${FG_DIM}${FG_CYAN}TEST ${handle} has run synchronously${FG_GB_RESET}`);
    }

    return evaluation;
  },

  get _chain() {
    // TODO can be removed
    return _.get(this).chain.map(link => Object.assign({}, link));
  }

}; // Differently from Object.assign, this works with getters and setters as well

const propertyAssign = (dest, source) => {
  for (let key in source) {
    const descriptor = Object.getOwnPropertyDescriptor(source, key);
    Object.defineProperty(dest, key, descriptor);
  }

  return dest;
};

const isChainable = what => (what = _.get(what)) && typeof what === "object" && Array.isArray(what.chain);
/*
  Original approch was to inherit from Function. It works okay with native ES6 engines,
  but if transpiled DON'T work properly (it degenerates into an anonymous function).
  The workaround is to return a function and attach methods on its object.
  CONS: loosing instanceOf Chainable (unless using Symbols)
  PROS: it's extremely faster
   class Chainable extends Function {
    constructor(source) {
      super("return arguments.callee.run.apply(arguments.callee, arguments);");
      ...
    }
    ...
  }
*/


class Chainable
/* extends Function */
{
  constructor(source) {
    const ChainableInstance = function ChainableInstance(...params) {
      return ChainableInstance.run(...params);
    };

    const chain = isChainable(source) ? _.get(source).chain.slice() : [];

    _.set(ChainableInstance, {
      chain
    });

    return propertyAssign(ChainableInstance, CHAINABLE_PROTOTYPE);
  }

}

const matryoshkingMethods = [{
  starter: true,
  name: "if",
  //      constructor: SequentialAnd, // .if(c0).if(c1) === if(c0).and(c1)
  compile: (root, ...params) => {
    if (params.length !== 1) throw new Error(".if accepts only one Condition as parameter");
    if (root) throw new Error(".if can be used only as first method in the chain. Use .and, .or, ... instead");
    return fromAny(params[0]);
  }
}, ...
/* .fx(c0, c1, ...) with Conditions only */
[{
  starter: true,
  name: "and",
  constructor: SequentialAnd
}, {
  starter: true,
  name: "or",
  constructor: SequentialOr
}, {
  starter: true,
  name: "xor",
  constructor: SequentialXor
}, {
  starter: true,
  name: "nor",
  constructor: SequentialNor
}, {
  starter: true,
  name: "nand",
  constructor: SequentialNand
}, {
  starter: true,
  name: "xnor",
  constructor: SequentialXnor
}, {
  starter: true,
  name: "anda",
  constructor: ParallelAnd
}, {
  starter: true,
  name: "ora",
  constructor: ParallelOr
}, {
  starter: true,
  name: "xora",
  constructor: ParallelXor
}, {
  starter: true,
  name: "nora",
  constructor: ParallelNor
}, {
  starter: true,
  name: "nanda",
  constructor: ParallelNand
}, {
  starter: true,
  name: "xnora",
  constructor: ParallelXnor
}].map(method => Object.assign(method, {
  compile: (root, ...params) => {
    if (params.length - !root < 1) throw new Error(`.${method.name}() needs two or more Condition operands`);
    const parsed = params.map(fromAny);
    if (root) parsed.unshift(root);
    return new method.constructor(...parsed);
  }
})), ...
/* .fx() with zero parameters */
[{
  name: "not",
  constructor: NegativeCondition
}, {
  name: "bool",
  constructor: BooleanCondition
}].map(method => Object.assign(method, {
  compile: (root, ...params) => {
    if (params.length) throw new Error(`.${method.name}() doesn't need any parameter`);
    return new method.constructor(root);
  }
})), ...
/* .fx(single_parameter) */
[{
  name: "in",
  constructor: DelayedCondition
}, {
  name: "out",
  constructor: TimeoutCondition
}, {
  name: "during",
  constructor: DurableCondition
}, {
  name: "atmost",
  constructor: CycleCondition
}].map(method => Object.assign(method, {
  compile: (root, ...params) => {
    return new method.constructor(root, params[0]);
  }
})), {
  name: "throw",
  starter: true,
  compile: (root, ...params) => {
    const error = new ErrorCondition(params[0]);
    return root ? new SequentialLink(root, error) : error;
  }
}, ...
/* .onevent(fn | arg0) */
[{
  name: "onTrue",
  constructor: TrueEventCondition,
  defaultHandler: console.log
}, {
  name: "onFalse",
  constructor: FalseEventCondition,
  defaultHandler: console.warn
}, {
  name: "onError",
  constructor: ErrorEventCondition,
  defaultHandler: console.error
}].map(method => Object.assign(method, {
  compile: (root, ...params) => {
    return new method.constructor(root, typeof params[0] === "function" ? params[0] : method.defaultHandler.bind(null, ...params));
  }
}))];
matryoshkingMethods.forEach(method => {
  const name = method.name,
        compile = method.compile,
        starter = method.starter;

  CHAINABLE_PROTOTYPE[name] = function (...params) {
    // Push a new condition into the chain.
    const clone = new Chainable(this);

    const _$get21 = _.get(clone),
          chain = _$get21.chain; // root is the most external Condition


    const root = chain.length && chain[chain.length - 1].condition;
    if (!root && !starter) throw new Error(`.${name}() cannot be a first condition`);
    const condition = compile(root, ...params);
    chain.push({
      method,
      params,
      condition
    });
    return clone;
  };
});

const fromValue = value => new StaticCondition(value);

const fromFunction = fn => new FunctionalCondition(fn);

const fromPromise = promise => new PromiseCondition(promise);

const fromAny = any => {
  if (any instanceof Condition) {
    return any;
  } else if (isChainable(any)) {
    return any.condition;
  } else if (any instanceof Promise) {
    return new PromiseCondition(any);
  } else if (typeof any === "function") {
    return new FunctionalCondition(any);
  } else {
    return new StaticCondition(any);
  }
};

let DEBUG_COUNTER = 0;
let DEBUG_MODE = true;
const C = {
  Evaluation,
  Chainable,

  get DEBUG() {
    return DEBUG_MODE;
  },

  set DEBUG(value) {
    DEBUG_MODE = !!value;
  }

}; // Export some classes of the lower lever

C.condition = {
  /* Condition, (A) */
  StaticCondition,
  TrueCondition,
  FalseCondition,
  FunctionalCondition,
  PromiseCondition,
  ErrorCondition,
  EternalCondition,

  /* ConditionList, */
  SequentialAnd,
  SequentialOr,
  SequentialXor,
  SequentialNor,
  SequentialNand,
  SequentialXnor,
  SequentialLink,
  ParallelAnd,
  ParallelOr,
  ParallelXor,
  ParallelNor,
  ParallelNand,
  ParallelXnor,
  ParallelLink,

  /* UnaryProxyCondition, (A) */
  NegativeCondition,
  DelayedCondition,
  CycleCondition,
  DurableCondition,
  TimeoutCondition,
  EventCondition,
  TrueEventCondition,
  FalseEventCondition,
  ErrorEventCondition,
  // fromXs help instantiate a Condition object
  fromValue,
  fromFunction,
  fromPromise,
  fromAny,
  // ready-to-use Condition objects
  TRUE,
  FALSE
}; // Help construct a new Chainable object from .if, .and, ...
// C.if: (...params) => (new Chainable()).if(...params)

matryoshkingMethods.filter(method => method.starter).forEach(method => C[method.name] = (...params) => new Chainable()[method.name](...params));
var _default = C;
exports.default = _default;
module.exports = exports.default;