"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _evaluation = _interopRequireDefault(require("./evaluation"));
var _scope = _interopRequireDefault(require("./scope"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
const _ = new WeakMap();
const MAX_TIMEOUT = 1e17;

// Node / Browser timing function
const now = typeof process === "object" && typeof process.hrtime === "function" ? (a, b) => ([a, b] = process.hrtime(), a * 1e3 + b * 1e-6) : typeof performance === "object" && typeof performance.now === "function" ? performance.now.bind(performance) : Date.now;

// Base class
class Condition {
  constructor(members = {}) {
    _.set(this, Object.assign({}, members));
  }
  test() {
    return _evaluation.default.reject(new Error(this.constructor.name + ".test() must be implemented on a derived class"));
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
    return _evaluation.default.resolve(_.get(this).value);
  }
  toString() {
    const {
      value
    } = _.get(this);
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
const FALSE = new FalseCondition();

// Useful for debug
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
    return _evaluation.default.reject(_.get(this).reason);
  }
  toString() {
    return "(throw " + String(_.get(this).reason) + ")";
  }
}

// A never-resolving condition
class EternalCondition extends Condition {
  test() {
    return new _evaluation.default(() => undefined);
  }
  toString() {
    return "(∞)";
  }
}

// A function that either:
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
  test(initialValue, initialScope) {
    const {
      fn
    } = _.get(this);
    const scope = new _scope.default(initialScope);
    return new _evaluation.default((resolve, reject) => {
      try {
        const result = fn.call(null, initialValue, scope.getChildContext());

        // if (isChainable(result))  {
        if (typeof result === "function" && result.condition instanceof Condition) {
          result.condition.test(initialValue).on(resolve, reject);
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
    const {
      fn
    } = _.get(this);
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
    return new _evaluation.default((resolve, reject) => _.get(this).promise.then(resolve, reject));
  }
  toString() {
    return "(" + String(_.get(this).promise) + ")";
  }
}

// Base class for MultyProxy
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
}

// MixIn
const Sequential = operator => class extends ConditionList {
  test(initialValue, initialScope) {
    const scope = new _scope.default(initialScope);
    const {
      conditions
    } = _.get(this);
    let aborted, subEvaluation;
    const resolver = (resolve, reject) => {
      let result;
      const testOne = (index = 0) => {
        if (aborted) return;
        if (index >= conditions.length) {
          resolve(result);
          return;
        }
        subEvaluation = conditions[index].test(index ? result : initialValue, scope);
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
    return new _evaluation.default(resolver, () => {
      aborted = true;
      if (subEvaluation) subEvaluation.abort();
    });
  }
  toString() {
    return "[" + _.get(this).conditions.map(String).join(operator.name) + "]";
  }
};

// MixIn
const Parallel = operator => class extends ConditionList {
  test(initialValue, initialScope) {
    const {
      conditions
    } = _.get(this);
    const {
      length
    } = conditions;
    const scope = new _scope.default(initialScope);
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
        const subEvaluation = condition.test(initialValue, scope.fork());
        subEvaluation.ona(onResolvedOne, shouldReject);
        return subEvaluation;
      });
    };
    return new _evaluation.default(resolver, aborter);
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
class ParallelLink extends Parallel(LINK) {}

// A base for single Condition Proxy
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
  }

  // test () {...} should be overriden by subclass
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
    const {
      source,
      delay
    } = _.get(this);
    let handle, subEvaluation;
    return new _evaluation.default((resolve, reject) => handle = setTimeout(() => {
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
    const {
      source,
      delay
    } = _.get(this);
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
  test(initialValue, initialScope) {
    const {
      source,
      duration
    } = _.get(this);
    const scope = new _scope.default(initialScope);
    const commit = scope.commit();
    const t0 = now();
    let aborted;
    let subEvaluation;
    return new _evaluation.default((resolve, reject) => {
      const attempt = () => {
        subEvaluation = source.test(initialValue, scope.checkout(commit));
        subEvaluation.on(value => {
          if (aborted) return;else if (!value || now() - t0 >= duration) {
            resolve(value);
            scope.deleteCommit(commit);
          } else {
            setTimeout(attempt, 0); // Average: 4.318518785088027
            // Promise.resolve({then: attempt}); // Average: 0.007504767491017662
          }
        }, reject); // FIXME
      };
      attempt();
    }, () => {
      /* aborter */
      aborted = true;
      if (subEvaluation) subEvaluation.abort();
      commit.deleteCommit(commit);
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
    const {
      source,
      duration
    } = _.get(this);
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
    return new _evaluation.default(resolver, aborter);
  }
  toString() {
    return _.get(this).source.toString();
  }
}

// Try to confirm the conjecture by repeating test
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
  test(initialValue, initialScope) {
    const {
      source,
      attempts
    } = _.get(this);
    const scope = new _scope.default(initialScope);
    const commit = scope.commit();
    let subEvaluation;
    let aborted;
    let countdown = attempts;
    const aborter = () => {
      aborted = true;
      if (subEvaluation) subEvaluation.abort();
      scope.deleteCommit(commit);
    };
    const resolver = (resolve, reject) => {
      const attempt = () => {
        if (aborted) return;
        subEvaluation = source.test(initialValue, scope.checkout(commit));
        subEvaluation.on(value => {
          if (aborted) return;else if (value || --countdown < 1) {
            resolve(value);
            scope.deleteCommit(commit);
          } else {
            setTimeout(attempt, 0);
          }
        }, reject);
      };
      attempt();
    };
    return new _evaluation.default(resolver, aborter);
  }
}

// Resolves in !value
class NegativeCondition extends UnaryProxyCondition {
  constructor(source) {
    super(source);

    // (!(! x)) => Bool(x)
    if (source instanceof NegativeCondition) return new BooleanCondition(source.source);

    // (!(Bool(x)) => (!x)
    if (source instanceof BooleanCondition) return new NegativeCondition(source.source);
  }
  test(...params) {
    const {
      source
    } = _.get(this);
    let subEvaluation;
    return new _evaluation.default((resolve, reject) => {
      subEvaluation = source.test(...params);
      subEvaluation.on(result => resolve(!result), reject);
    }, () => subEvaluation && subEvaluation.abort());
  }
  toString() {
    return "!" + _.get(this).source.toString();
  }
}

// Resolves in !!value or Boolean(value)
class BooleanCondition extends UnaryProxyCondition {
  constructor(source) {
    super(source);

    // Boolean(Boolean(x)) = Boolean(x);  Boolean(!(x)) = !(x)
    if (source instanceof BooleanCondition || source instanceof NegativeCondition) return source;
  }
  test(...params) {
    const {
      source
    } = _.get(this);
    let subEvaluation;
    return new _evaluation.default((resolve, reject) => {
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
    const {
      source,
      onResolve,
      onReject
    } = _.get(this);
    let subEvaluation;
    return new _evaluation.default((resolve, reject) => {
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
}
var _default = exports.default = {
  Condition,
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
  BooleanCondition,
  DelayedCondition,
  CycleCondition,
  DurableCondition,
  TimeoutCondition,
  EventCondition,
  TrueEventCondition,
  FalseEventCondition,
  ErrorEventCondition,
  // ready-to-use Condition objects
  TRUE,
  FALSE
};
module.exports = exports.default;