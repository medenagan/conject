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