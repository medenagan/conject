var assert = require("assert");
var C = require("../lib/conject");

function getString(variable) {

  if (variable === null)
    return "[null]";

  if (typeof variable === "undefined")
    return "[undefined]";

  if (typeof value === "number" && isNaN(value))
    return "[NaN]";

  if (typeof variable === "string")
        return "[string] '" + variable + "'";

  if (typeof variable === "object" && variable.constructor.name === "Object")
    return "[object] " + JSON.stringify(variable);

  if (typeof variable === "object")
    return "[" + variable.constructor.name + "] " + String(variable);

  return  "[" + typeof variable + "] " + String(variable);
}

describe("C {} should be loaded", function() {
  it("C should be an object", function() {
    assert.deepStrictEqual(typeof C, "object");
  });

  it("C.Chainable should be a constructor", function() {
    assert.deepStrictEqual(typeof C.Chainable, "function");
  });
});

var starters = ["if", "and", "or", "xor", "nand", "nor", "xnor",
  "anda", "ora", "xora", "nanda", "nora", "xnora",
  "throw"];

describe("C should include starters", function() {
  starters.forEach(function (operator) {
    it("C." + operator + " is a Function", function() {
      assert.deepStrictEqual(typeof C[operator], "function");
    });
  });
});

var operators = starters.concat(["in", "out", "atmost", "during"]);

describe("new Chainable should have all methods", function() {
  operators.forEach(function (operator) {
    it("(new Chainable())." + operator + " is a Function", function() {
      assert.deepStrictEqual(typeof (new C.Chainable ())[operator], "function");
    });
  });
});


function testValue(description, getterC, value) {
  describe(description, function() {

    it(".value === " + getString(value), function() {

      var evaluation = getterC().run();

      if (typeof value === "number" && isNaN(value)) {
        assert.ok(isNaN(evaluation.value));
      }
      else {
        assert.deepStrictEqual(evaluation.value, value);
      }
    });

    testOnTrue(getterC, !!value);
    testOnFalse(getterC, !value);
    testOnError(getterC, false);
  });
}

function testReason(description, getterC, reason) {
  describe(description, function() {
    it(".run()" , function() {
      assert.throws(
        function () {
          getterC().run();
        },

        function (error) {
          return error === reason;
        }
      );
    });

  //  testOnTrue(getterC, !!value);
  //  testOnFalse(getterC, !value);
  //testOnError(getterC, false);
  });
}

function testOnTrue(getterC, shouldOnTrue) {
  it(".onTrue() was" + (shouldOnTrue ? " " : " NOT ") + "called", function() {
    var wasCalled = false;
    getterC().onTrue(function () {wasCalled = true}).run();
    assert.deepStrictEqual(wasCalled, !!shouldOnTrue);
  });
}

function testOnFalse(getterC, shouldOnFalse) {
  it(".onFalse() was" + (shouldOnFalse ? " " : " NOT ") + "called", function() {
    var wasCalled = false;
    getterC().onFalse(function () {wasCalled = true}).run();
    assert.deepStrictEqual(wasCalled, !!shouldOnFalse);
  });
}

function testOnError(getterC, shouldOnError) {
  it(".onError() was" + (shouldOnError ? " " : " NOT ") + "called", function() {
    var wasCalled = false;
    getterC().onError(function () {wasCalled = true}).run();
    assert.deepStrictEqual(wasCalled, !!shouldOnError);
  });
}


describe("Basic syncrhonous evaluation", function() {

  var truthy = ["Hello", 123.45, true, {yes: 1}, new Date()];
  var falsy = [false, null, 0, "", undefined, NaN];

  truthy.concat(falsy).forEach(function (value) {
    var description = "C.if(" + getString(value) + ")";

    testValue(
      description,

      function () {
        return C.if(value);
      },

      value
    );

  });

  describe("rejecting the evaluation - expects an error", function () {

    var throwns = ["Failure", new Error("What's happened"), .0001];

    throwns.forEach(function (reason) {
      var description = "C.throw(" + getString(reason) + ")";

      testReason(
        description,

        function () {
          return C.throw(reason);
        },
        reason
      );
    });
  });





//  throwns.forEach(testSingle);

});





// https://shields.io/#/examples/platform-support


/*


console.log("");
console.log("*** Simulating an error! You should expect undeclared is not define
try {
  C.if(() => /*oops undeclared = "hi").onTrue("FAILED").onFalse("FAILED").onError(() => console.log("OK"))();
}
catch (e) {}

console.log("");
console.log("4) Should be 40");
C.if(12).and(n => n + 9, n => n - 1, n => n * 2).or(2000).onFalse("FAILED")
 .onTrue(x => (x === 40) ? console.log("OK", x) : console.error("FAILED", x))();

console.log("");
let now = Date.now();
console.log("5) .out() tested for 1/4 second");
C.if(null).atmost(Infinity).out(250).onFalse(_ => {
  const diff = Date.now() - now;
  const tolerance = diff / 250;
  const answer = ((tolerance > .8) && (tolerance < 1.2)) ? "OK" : "FAILED";
  console.log(answer, (diff / 1e3) + "s", "tolerance " + (tolerance * 1e2) + "%");
}).run();
*/
