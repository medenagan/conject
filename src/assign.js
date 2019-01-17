"use strict";

// Differently from Object.assign, this works with getters and setters as well
const propertyAssign = (dest, source) => {

  for (let key in source) {
    const descriptor = Object.getOwnPropertyDescriptor(source, key);
    Object.defineProperty(dest, key, descriptor);
  }

  return dest;
};

export default propertyAssign;
