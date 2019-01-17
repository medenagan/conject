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
  } // After getChildContext is called, previous objects are detatched  


  getChildContext() {
    const self = _.get(this); // const childContext = Object.create(contextes[contextes.length - 1]);


    const childContext = Object.assign({}, self.context);
    self.context = childContext;
    return childContext;
  } // Create a clone of the Scope object


  fork() {
    return new Scope(_.get(this).context);
  } // Save a copy of the current context


  commit(description) {
    const _$get = _.get(this),
          context = _$get.context,
          commits = _$get.commits;

    const symbol = Symbol(description);
    commits.set(symbol, Object.assign({}, context));
    return symbol;
  } // Restore a saved context and return this Scope


  checkout(symbol) {
    const self = _.get(this);

    const commits = self.commits;
    if (!commits.has(symbol)) throw new Error(`${this.constructor.name}.checkout() can't find this commit`);
    self.context = Object.assign({}, commits.get(symbol));
    return this;
  } // Delete a previously stored context


  deleteCommit(symbol) {
    return _.get(this).commits.delete(symbol);
  }

}

var _default = Scope;
exports.default = _default;
module.exports = exports.default;