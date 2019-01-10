"use strict";

const C = require("./conject");

C.DEBUG = true;
console.log("");
console.log("0a) Is C loaded?", typeof C === "object");
console.log("");
console.log("0b) C object composition");
console.dir(C);
console.log("");
console.log("1) 44.12 is truthy");
C.if(44.12).onTrue("OK").onFalse("FAILED").onError("FAILED")();
console.log("");
console.log("2) null is falsy");
C.if(null).onTrue("FAILED").onFalse("OK").onError("FAILED")();
console.log("");
console.log("*** Simulating an error! You should expect undeclared is not defined ***");

try {
  C.if(() =>
  /*oops*/
  undeclared = "hi").onTrue("FAILED").onFalse("FAILED").onError(() => console.log("OK"))();
} catch (e) {}

console.log("");
console.log("4) Should be 40");
C.if(12).and(n => n + 9, n => n - 1, n => n * 2).or(2000).onFalse("FAILED").onTrue(x => x === 40 ? console.log("OK", x) : console.error("FAILED", x))();
console.log("");
let now = Date.now();
console.log("5) .out() tested for 1/4 second");
C.if(null).atmost(Infinity).out(250).onFalse(_ => {
  const diff = Date.now() - now;
  const tolerance = diff / 250;
  const answer = tolerance > .8 && tolerance < 1.2 ? "OK" : "FAILED";
  console.log(answer, diff / 1e3 + "s", "tolerance " + tolerance * 1e2 + "%");
}).run();