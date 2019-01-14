var assert = require("assert");
var C = require("../lib/conject");

describe("C {} should be loaded", function() {

  it("C should be an object", function() {
    assert.deepStrictEqual(typeof C, "object");
  });

  it("C.Chainable should be a constructor", function() {
    assert.deepStrictEqual(typeof C.Chainable, "function");
  });

  var starters = ["if", "and", "or", "xor", "nand", "nor", "xnor",
    "anda", "ora", "xora", "nanda", "nora", "xnora"];

  starters.forEach(function (operator) {
    it("C." + operator + " is a Function", function() {
      assert.deepStrictEqual(typeof C[operator], "function");
    });
  });

  var operators = starters.concat(["in", "out", "atmost", "during"]);

  operators.forEach(function (operator) {
    it("(new Chainable())." + operator + " is a Function", function() {
      assert.deepStrictEqual(typeof (new C.Chainable ())[operator], "function");
    });
  });

});


describe("Basic syncrhonous evaluation", function() {

  function testSingle (value) {

    var strValue = typeof value === "object" ? JSON.stringify(value) : String(value);

    describe("C.if(" + strValue + ")", function() {

      var bool = !!value;
      var onTrue = false, onFalse = false, onError = false;

      var evaluation = C
        .if(value)
        .onTrue(function () {onTrue = true;})
        .onFalse(function () {onFalse = true;})
        .onError(function () {onError = true;})
        .run();

      it(".value === " + strValue, function() {
        if (isNaN(value)) {
          assert.ok(isNaN(evaluation.value));
        }

        else {
          assert.deepStrictEqual(evaluation.value, value);
        }
      });

      it(".onTrue() was" + (bool ? " " : " not ") + "called", function() {
        assert.deepStrictEqual(onTrue, bool);
      });

      it(".onFalse() was" + (bool ?  " not " : " ") + "called", function() {
        assert.deepStrictEqual(onFalse, !bool);
      });

      it(".onError() was never called", function() {
        assert.deepStrictEqual(onError, false);
      });

    });
  }

  var truthy = ["Hello", 123.45, true, {yes: 1}, new Date()];

  var falsy = [false, null, 0, "", undefined, NaN];

  truthy.forEach(testSingle);

  falsy.forEach(testSingle);

});


describe('Array', function() {
  describe('#indexOf()', function() {
    // pending test below
    it('should return -1 when the value is not present');
  });
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
