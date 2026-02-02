/* conject 0.2.2 | (c) Fabio Mereu | MIT license | https://github.com/medenagan/conject | 2026-02-02T11:55+01:00 */
(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.conject = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
"use strict";

// Differently from Object.assign, this works with getters and setters as well
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
const propertyAssign = (dest, source) => {
  for (let key in source) {
    const descriptor = Object.getOwnPropertyDescriptor(source, key);
    Object.defineProperty(dest, key, descriptor);
  }
  return dest;
};
var _default = exports.default = propertyAssign;
module.exports = exports.default;
},{}],2:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _evaluation = _interopRequireDefault(require("./evaluation"));
var _condition = _interopRequireDefault(require("./condition"));
var _assign = _interopRequireDefault(require("./assign"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
const _ = new WeakMap();
let DEBUG_COUNTER = 0;

// Colors for console
const FG_GB_RESET = "\x1b[0m";
const FG_BRIGHT = "\x1b[1m";
const FG_DIM = "\x1b[2m";
const FG_UNDERSCORE = "\x1b[4m";
// const FG_BLINK = "\x1b[5m";
// const FG_GB_REVERSE = "\x1b[7m";
// const FG_GB_HIDDEN = "\x1b[8m";

// const FG_BLACK = "\x1b[30m";
// const FG_RED = "\x1b[31m";
const FG_GREEN = "\x1b[32m";
const FG_YELLOW = "\x1b[33m";
// const FG_BLUE = "\x1b[34m";
// const FG_MAGENTA = "\x1b[35m";
const FG_CYAN = "\x1b[36m";
const FG_WHITE = "\x1b[37m";

// const BG_BLACK = "\x1b[40m";
const BG_RED = "\x1b[41m";
// const BG_GREEN = "\x1b[42m";
// const BG_YELLOW = "\x1b[43m";
// const BG_BLUE = "\x1b[44m";
// const BG_MAGENTA = "\x1b[45m";
const BG_CYAN = "\x1b[46m";
// const BG_WHITE = "\x1b[47m";

const CHAINABLE_PROTOTYPE = {
  toString: function () {
    return "C" + _.get(this).chain.map(link => `.${link.method.name}(${link.params.map(String).join(", ")})`).join("");
  },
  get condition() {
    const {
      chain
    } = _.get(this);
    return chain.length && chain[chain.length - 1].condition || FALSE;
  },
  toPromise: function (initialValue) {
    return this.condition.toPromise(initialValue);
  },
  run: function (initialValue, scope) {
    const evaluation = this.condition.test(initialValue, scope);
    evaluation.on();
    return evaluation;
  },
  debug: function (initialValue, scope) {
    const evaluation = this.condition.test(initialValue, scope);
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
};
const _isChainable = what => (what = _.get(what)) && typeof what === "object" && Array.isArray(what.chain);

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

class Chainable /* extends Function */ {
  constructor(source) {
    const ChainableInstance = function (...params) {
      return ChainableInstance.run(...params);
    };
    const chain = _isChainable(source) ? _.get(source).chain.slice() : [];
    _.set(ChainableInstance, {
      chain
    });
    return (0, _assign.default)(ChainableInstance, CHAINABLE_PROTOTYPE);
  }
}
Chainable.isChainable = _isChainable;
const matryoshkingMethods = [{
  starter: true,
  name: "if",
  //      constructor: SequentialAnd, // .if(c0).if(c1) === if(c0).and(c1)
  compile: (root, ...params) => {
    if (params.length !== 1) throw new Error(".if accepts only one Condition as parameter");
    if (root) throw new Error(".if can be used only as first method in the chain. Use .and, .or, ... instead");
    return fromAny(params[0]);
  }
}, ... /* .fx(c0, c1, ...) with Conditions only */
[{
  starter: true,
  name: "and",
  constructor: _condition.default.SequentialAnd
}, {
  starter: true,
  name: "or",
  constructor: _condition.default.SequentialOr
}, {
  starter: true,
  name: "xor",
  constructor: _condition.default.SequentialXor
}, {
  starter: true,
  name: "nor",
  constructor: _condition.default.SequentialNor
}, {
  starter: true,
  name: "nand",
  constructor: _condition.default.SequentialNand
}, {
  starter: true,
  name: "xnor",
  constructor: _condition.default.SequentialXnor
}, {
  starter: true,
  name: "anda",
  constructor: _condition.default.ParallelAnd
}, {
  starter: true,
  name: "ora",
  constructor: _condition.default.ParallelOr
}, {
  starter: true,
  name: "xora",
  constructor: _condition.default.ParallelXor
}, {
  starter: true,
  name: "nora",
  constructor: _condition.default.ParallelNor
}, {
  starter: true,
  name: "nanda",
  constructor: _condition.default.ParallelNand
}, {
  starter: true,
  name: "xnora",
  constructor: _condition.default.ParallelXnor
}].map(method => Object.assign(method, {
  compile: (root, ...params) => {
    if (params.length - !root < 1) throw new Error(`.${method.name}() needs two or more Condition operands`);
    const parsed = params.map(fromAny);
    if (root) parsed.unshift(root);
    return new method.constructor(...parsed);
  }
})), ... /* .fx() with zero parameters */
[{
  name: "not",
  constructor: _condition.default.NegativeCondition
}, {
  name: "bool",
  constructor: _condition.default.BooleanCondition
}].map(method => Object.assign(method, {
  compile: (root, ...params) => {
    if (params.length) throw new Error(`.${method.name}() doesn't need any parameter`);
    return new method.constructor(root);
  }
})), ... /* .fx(single_parameter) */
[{
  name: "in",
  constructor: _condition.default.DelayedCondition
}, {
  name: "out",
  constructor: _condition.default.TimeoutCondition
}, {
  name: "during",
  constructor: _condition.default.DurableCondition
}, {
  name: "atmost",
  constructor: _condition.default.CycleCondition
}].map(method => Object.assign(method, {
  compile: (root, ...params) => {
    return new method.constructor(root, params[0]);
  }
})), {
  name: "throw",
  starter: true,
  compile: (root, ...params) => {
    const error = new _condition.default.ErrorCondition(params[0]);
    return root ? new _condition.default.SequentialLink(root, error) : error;
  }
}, ... /* .onevent(fn | arg0) */
[{
  name: "onTrue",
  constructor: _condition.default.TrueEventCondition,
  defaultHandler: console.log
}, {
  name: "onFalse",
  constructor: _condition.default.FalseEventCondition,
  defaultHandler: console.warn
}, {
  name: "onError",
  constructor: _condition.default.ErrorEventCondition,
  defaultHandler: console.error
}].map(method => Object.assign(method, {
  compile: (root, ...params) => {
    return new method.constructor(root, typeof params[0] === "function" ? params[0] : method.defaultHandler.bind(null, ...params));
  }
}))];
matryoshkingMethods.forEach(method => {
  const {
    name,
    compile,
    starter
  } = method;
  CHAINABLE_PROTOTYPE[name] = function (...params) {
    // Push a new condition into the chain.

    const clone = new Chainable(this);
    const {
      chain
    } = _.get(clone);

    // root is the most external Condition
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
const fromValue = value => new _condition.default.StaticCondition(value);
const fromFunction = fn => new _condition.default.FunctionalCondition(fn);
const fromPromise = promise => new _condition.default.PromiseCondition(promise);
const fromAny = any => {
  if (any instanceof _condition.default.Condition) {
    return any;
  } else if (_isChainable(any)) {
    return any.condition;
  } else if (any instanceof Promise) {
    return new _condition.default.PromiseCondition(any);
  } else if (typeof any === "function") {
    return new _condition.default.FunctionalCondition(any);
  } else {
    return new _condition.default.StaticCondition(any);
  }
};

// Help construct a new Condition

const conditionFrom = {
  fromValue,
  fromFunction,
  fromPromise,
  fromAny
};

// Help construct a new Chainable object from .if, .and, ...
// C.if: (...params) => (new Chainable()).if(...params)
const C = {};
matryoshkingMethods.filter(method => method.starter).forEach(method => C[method.name] = (...params) => new Chainable()[method.name](...params));
var _default = exports.default = {
  Chainable,
  C,
  conditionFrom
};
module.exports = exports.default;
},{"./assign":1,"./condition":3,"./evaluation":5}],3:[function(require,module,exports){
(function (process){(function (){
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
}).call(this)}).call(this,require('_process'))
},{"./evaluation":5,"./scope":6,"_process":7}],4:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _evaluation = _interopRequireDefault(require("./evaluation"));
var _chainable = require("./chainable");
var _condition = _interopRequireDefault(require("./condition"));
var _assign = _interopRequireDefault(require("./assign"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
(0, _assign.default)(_chainable.C, {
  Evaluation: _evaluation.default,
  Chainable: _chainable.Chainable,
  condition: (_condition.default, _chainable.conditionFrom)
});
var _default = exports.default = _chainable.C;
module.exports = exports.default;
},{"./assign":1,"./chainable":2,"./condition":3,"./evaluation":5}],5:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
const _ = new WeakMap();

// Helper to handle multiple callbacks listening to an event
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
    const {
      used,
      params,
      callbacks
    } = _.get(this);
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
const EVALUATION_FULFILL = function (value) {
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
const EVALUATION_REJECT = function (reason) {
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
    const {
      status,
      aborter
    } = _.get(this);
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
    }

    // Can't abort an already resolved / rejected Evaluation
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
  }

  // then(...) resolver is synch, listener is async
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
    const {
      status,
      async
    } = _.get(this);
    if (status === EVALUATION_PENDING) throw new Error(".async does not exist for [" + status + "] status");
    return !!async;
  }
  get value() {
    const {
      status,
      value
    } = _.get(this);
    if (status !== EVALUATION_RESOLVED) throw new Error(".value does not exist for [" + status + "] status");
    return value;
  }
  get reason() {
    const {
      status,
      reason
    } = _.get(this);
    if (status !== EVALUATION_REJECTED) throw new Error(".reason does not exist for [" + status + "] status");
    return reason;
  }
  toString() {
    const {
      status,
      reason,
      value
    } = _.get(this);
    const info = status === EVALUATION_RESOLVED ? value : status === EVALUATION_REJECTED ? reason : "";
    return `<${status}>${info}`;
  }
  toPromise() {
    // Breaks lazyness
    return new Promise(this.on.bind(this));
  }
  then(onFulfilled, onRejected) {
    return this.toPromise().then(onFulfilled, onRejected);
  }

  // [util.inspect.custom] (depth, options) needs handling for browserify
  get [Symbol.toStringTag]() {
    return this.toString();
  }
}
var _default = exports.default = Evaluation;
module.exports = exports.default;
},{}],6:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
const _ = new WeakMap();
class Scope {
  constructor(source) {
    if (source instanceof Scope) return source;
    const context = Object.assign({}, source);
    _.set(this, {
      context,
      commits: new Map()
    });
  }

  // After getChildContext is called, previous objects are detatched  
  getChildContext() {
    const self = _.get(this);
    // const childContext = Object.create(contextes[contextes.length - 1]);
    const childContext = Object.assign({}, self.context);
    self.context = childContext;
    return childContext;
  }

  // Create a clone of the Scope object
  fork() {
    return new Scope(_.get(this).context);
  }

  // Save a copy of the current context
  commit(description) {
    const {
      context,
      commits
    } = _.get(this);
    const symbol = Symbol(description);
    commits.set(symbol, Object.assign({}, context));
    return symbol;
  }

  // Restore a saved context and return this Scope
  checkout(symbol) {
    const self = _.get(this);
    const {
      commits
    } = self;
    if (!commits.has(symbol)) throw new Error(`${this.constructor.name}.checkout() can't find this commit`);
    self.context = Object.assign({}, commits.get(symbol));
    return this;
  }

  // Delete a previously stored context
  deleteCommit(symbol) {
    return _.get(this).commits.delete(symbol);
  }
}
var _default = exports.default = Scope;
module.exports = exports.default;
},{}],7:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}]},{},[4])(4)
});
