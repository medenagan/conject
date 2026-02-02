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