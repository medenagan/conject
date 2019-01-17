"use strict"; // Differently from Object.assign, this works with getters and setters as well

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

var _default = propertyAssign;
exports.default = _default;
module.exports = exports.default;