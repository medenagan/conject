var assert = require("assert");
var os = require("os");
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

var starters = ["if", "and", "or", "xor", "nand", "nor", "xnor",
  "anda", "ora", "xora", "nanda", "nora", "xnora",
  "throw"];

var operators = starters.concat(["in", "out", "atmost", "during"]);

var truthy = ["Hello", 123.45, true, {yes: 1}, new Date()];
var falsy = [false, null, 0, "", undefined, NaN];

var truthyAndFalsy = [].concat(truthy).concat(falsy);

describe("C {} should be loaded", function() {
  it("C should be an object", function() {
    assert.deepStrictEqual(typeof C, "object");
  });

  it("C.Chainable should be a constructor", function() {
    assert.deepStrictEqual(typeof C.Chainable, "function");
  });
});

describe("C should include starters", function() {
  starters.forEach(function (operator) {
    it("C." + operator + " is a Function", function() {
      assert.deepStrictEqual(typeof C[operator], "function");
    });
  });
});

describe("new Chainable should have all methods", function() {
  operators.forEach(function (operator) {
    it("(new Chainable())." + operator + " is a Function", function() {
      assert.deepStrictEqual(typeof (new C.Chainable ())[operator], "function");
    });
  });
});

function testValue(description, getterC, value, async) {
  describe(description, function() {

    it(".value === " + getString(value), function(done) {

      var evaluation = getterC().run();

      evaluation.on(
        function (value) {
          if (typeof value === "number" && isNaN(value)) {
            assert.ok(isNaN(evaluation.value));
          }
          else {
            assert.deepStrictEqual(evaluation.value, value);
          }
          done();
        },

        function (reason) {
          done(reason);
        }
      );

    });

    testOnTrue(getterC, !!value);
    testOnFalse(getterC, !value);
    testOnError(getterC, false);
    testOnAsynch(getterC, !!async)
  });
}

function testReason(description, getterC, reason) {
  describe(description, function() {
    it(".run() gives an error" , function() {
      assert.throws(
        function () {
          getterC().run();
        },

        function (error) {
          return error === reason;
        }
      );
    });

  });
}

function testOnTrue(getterC, shouldOnTrue) {
  it(".onTrue() was " + (shouldOnTrue ? "CALLED" : "NOT called"), function(done) {
    var wasCalled = false;
    getterC().onTrue(function () {wasCalled = true}).run().on(
      function () {
        assert.ok(wasCalled === shouldOnTrue);
        done();
      },
      function () {
        assert.ok(wasCalled === shouldOnTrue);
        done();
      }
    );
  });
}

function testOnFalse(getterC, shouldOnFalse) {
  it(".onFalse() was " + (shouldOnFalse ? "CALLED" : "NOT called"), function(done) {
    var wasCalled = false;
    getterC().onFalse(function () {wasCalled = true}).run().on(
      function () {
        assert.ok(wasCalled === shouldOnFalse);
        done();
      },
      function () {
        assert.ok(wasCalled === shouldOnFalse);
        done();
      }
    );
  });
}

function testOnError(getterC, shouldOnError) {
  it(".onError() was " + (shouldOnError ? "CALLED" : "NOT called"), function(done) {
    var wasCalled = false;
    getterC().onError(function () {wasCalled = true}).run().on(
      function () {
        assert.ok(wasCalled === shouldOnError);
        done();
      },
      function () {
        assert.ok(wasCalled === shouldOnError);
        done();
      }
    );
  });
}

function testOnAsynch(getterC, shouldBeAsync) {
  it("().async should be " + shouldBeAsync, function() {
    assert.ok(getterC().run().async === shouldBeAsync);
  });
}

describe("Static", function() {
  truthyAndFalsy.forEach(function (value) {
    testValue(
      "C.if(" + getString(value) + ")",
      function () {
        return C.if(value);
      },
      value
    );
  });
});

describe("Promise", function() {
  truthyAndFalsy.forEach(function (value) {
    testValue(
      "C.if(Promise.resolve(" + getString(value) + "))",
      function () {
        return C.if(Promise.resolve(value));
      },
      value,
      true
    );
  });
});

describe("Nested", function() {
  truthyAndFalsy.forEach(function (value) {
    testValue(
      "C.if(C.if(" + getString(value) + "))",
      function () {
        return C.if(C.if(value));
      },
      value
    );
  });
});

describe("Synch Function", function() {
  truthyAndFalsy.forEach(function (value) {
    testValue(
      "C.if(function () {} return " + getString(value) + ")",
      function () {
        return C.if(function () {return value;});
      },
      value
    );
  });
});

describe("ASYNC Function", function() {
  truthyAndFalsy.forEach(function (value) {
    testValue(
      "C.if(function () {} return Promise.resolve(" + getString(value) + "))",
      function () {
        return C.if(function () {return Promise.resolve(value);});
      },
      value,
      true
    );
  });
});

describe("Function-C", function() {
  truthyAndFalsy.forEach(function (value) {
    testValue(
      "C.if(function () {} return C.if(" + getString(value) + "))",
      function () {
        return C.if(function () {return C.if(value);});
      },
      value
    );
  });
});

describe("rejecting the evaluation", function () {
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

describe(".in()", function() {
  it("executes in 250ms", function (done) {
    var match = "lion";
    var t0 = Date.now();
    C.if(function () {return Date.now()}).in(250).run().on(
      function (value) {
        var t1 = value;
        var t2 = Date.now();
        var deltaIf = t1 - t0;
        var deltaOn = t2 - t1;
        var absoluteError = deltaIf - 250;
        // darwin: tolerance need being at least 10% linux/window no need
        var tolerance = (os.platform() === "darwin") ? (250 * .3) : (250 * .05);
        console.log("   >  if executing in: (ms)", deltaIf);
        console.log("   >  on executing in: (ms)", deltaOn);
        console.log("   >  absolute error: (ms)", absoluteError);
        console.log("   >  tolerance accepted in " +  os.platform() + ": (ms)", tolerance);
        assert.ok(Math.abs(absoluteError) < tolerance, "+/- " + tolerance + " ms");
        done();
      },
      function (reason) {
        done(reason);
      }
    );
  });
});

describe(".out()", function() {
  var match = "zebra";
  testValue(
    "C.if(" + getString(match) + ").in(15).out(20)",
    function () {
      return C.if(match).in(15).out(20);
    },
    "zebra",
    true
  );

  testValue(
    "C.if(" + getString(match) + ").in(20).out(15)",
    function () {
      return C.if(match).in(20).out(15);
    },
    false,
    true
  );
});


describe("C.if(null).atmost(7)", function() {
  it("It's evaluated 7 times", function (done) {
    var counter = 0;
    C.if(function () {
      counter++;
      return null;
    })
    .atmost(7).run()
    .on(
      function (value) {
        assert.deepStrictEqual(counter, 7);
        done();
      },
      function (reason) {
        done(reason);
      }
    );
  });

  testValue(
    "",
    function () {
      return C.if(null).atmost(7);
    },
    null,
    true
  );
});


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






console.log("PERSONAL")

C.if( (val, scope) => {
  console.log(val, scope);
  scope.loaker = true;
 })
 .or( (val, scope) => console.log(val, scope) )
 .debug(13, {ciaul: "29392020"});
*/
