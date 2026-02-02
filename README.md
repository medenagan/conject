conject
=======================================

A mini-script for lazy sync / async conditional evaluation for node and browser

[![CI](https://github.com/medenagan/conject/actions/workflows/ci.yml/badge.svg)](https://github.com/medenagan/conject/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/conject.svg?label=npm)](https://www.npmjs.com/package/conject)
[![license](https://img.shields.io/npm/l/conject.svg?label=license)](https://github.com/medenagan/conject/blob/master/LICENSE)
[![downloads](https://img.shields.io/npm/dm/conject.svg?label=downloads)](https://www.npmjs.com/package/conject)
[![dependencies](https://img.shields.io/librariesio/release/npm/conject.svg?label=dependencies)](https://libraries.io/npm/conject)
[![install size](https://packagephobia.com/badge?p=conject)](https://packagephobia.com/result?p=conject)

* * *

### Main features

*   Lazy conditionals
*   Chainable intuitive syntax
*   Both synchronous and asynchronous behavior


### Download & Installation

```shell
$ npm install conject
```

### Quick Start

`conject` exports an object containing methods and constructors.

```javascript
const C = require("conject");
```

The `C.if()` method creates a new `Chainable` object:
```javascript
// From a value
let ok = C.if(true);
let ohoh = C.if(null);

// From a Promise
let promise = new Promise(
  resolve => setTimeout(() => resolve("something"), 1000 )
);
let willGetSomething = C.if(promise);

// From another Chainable object
let nested = C.if(C.if(1 + 1));

// Or from a Function: it can return any data above
let maybe = C.if(_=> Math.random() < .35);

// Function are passed the current value along the pipe
let beer = C.if(age => age > 20 || maybe)
```

#### Invoking the `Chainable` object
The `Chainable` object can be called: invoking`Chainable(initialValue)` is the same as calling `Chainable.run(initialValue)`.
The returned value is an `Evaluation` which can be converted into a promise.

```javascript
const zero = C.if(0);
// It will execute console.warn(0)
zero().then(console.warn);
```

#### Linear event handlers
You can rely on the inline event handlers `onTrue(value)`, `onFalse(value)`, `onError(reason)` to intervene with some action as long as the condition gets evaluated. Handlers are called synchronously:

```javascript
// Inline events can be more readable
C.if(3.141).onTrue(
  value => console.log("Eureka, got " + value)
)();
```

If an event handler is not passed a function, it will assume you want to output the value returned onto the console (it uses `console.log()` for truthy values, `console.warn()` for falsy ones).

```javascript
// It will show a warning on the console
C.if(_=> 1 - 1).onFalse("That's sad")();
```

#### Converting to a `Promise`
You can transform a `Chainable` into a `Promise` with the method `Chainable.toPromise(initialValue)`. In this case, `.run()` will be called immediately and the promise either resolved or rejected.

```javascript
// outputs true
beer.toPromise(30).then(value => console.log(value));
```

If you don't need to run it again, you can use memoize the `Evaluation` returned by `Chainable.run(initialValue)` and call `Evaluation.toPromise(void)`
##### Immutability of the Evaluation

Once an `Evaluation` is resolved, it will never change its value. For this reason, `Chainable.run()` always returns a new `Evaluation`.
```javascript
let counter = 0;
const id = C.if( () => ++counter );

let a = id.toPromise(); // 1  a = id.run().toPromise()
let b = id.toPromise(); // 2

const evaluation = id(); // id.run()

let c = evaluation.toPromise(); // 3
let d = evaluation.toPromise(); // 3
```

#### Evaluating in a synchronous way
When invoked, `Chainable.run(initialValue)` returns an `Evaluation` object.
The `Evaluation` object differs from a `Promise` in many ways and as such does not have symmetrical features. However, `Evaluation.toPromise(void)` and the shortcut `Evaluation.then()` are easy ways to obtain one.

Instead, `Evaluation.on(resolve, reject)` calls the listener synchronously if the condition can be evaluated without any asynchronous code. Otherwise, it will trigger it it asynchronously.

```javascript
const hail = C.if(name => name && "Hello " + name);

// outputs "Hello Fabio", "Hey!": all is running synchronously
hail.run("Fabio").on(greeting => console.log(greeting));
console.log("Hey!");

// outputs "Hey", "Hello Fabio", as the first handler is asynchronous
hail.run("Fabio").then(console.log);
console.log("Hey");
```

#### Inline evaluation

When you invoke `run()` or call `Chainable()`, the method will return after evaluating the condition, in case it's synchronous.
A condition si asynchronous:
1. if you construct it from a `Promise`
2. if you use the parallel logical operators(`.anda`, `.ora`, ...)
3. if you use the modifiers `.in()`, `.out()`, `.during()` and `atmost` in some cases.

The property `Evaluation.async` is set to `true` in all these cases.

```javascript
C.if(true).run().async // false
C.if(true).in(20).run().async // true
```

If you're using synchronous conditions, you can obtain the result of the evaluation inline through the `.value` property
```javascript
let years = C.if(months => Math.ceil(months / 12))(3).value; // 1
```
If the condition is evaluated in an asynchronous way, accessing the property `Evaluation.value` before it's resolved will cause an error.

#### Passing a value
Each evaluation either resolves the condition with a boolean value or rejects it.
`conject` determines a boolean in loose mode `!!value` and pass the original value on through the chain.

```javascript
// It will log the passed value
const log = value => console.log(value);
C.if(50).onTrue(log)();
C.if("I am just a little string").onTrue(log)();
C.if(true).onTrue(log)();
```

##### Passing objects

All objects are truthy for definition. Sometimes, you need to convalidate some property first.
If you want to determine some condition of the object before passing it on, you could append `&& {...}` to the specific condition:

```javascript
C.if(_=> $("div.myCoolClass"))
  .and($div => $div.length && $div)
  .and($div => ...);
```

Or, while less readable, you can recycle an unused parameter:

```javascript
C.if(elem => (
  elem = document.getElementById("search"),
  elem.value.startsWith("p") && elem
))
 .and(elem => ...);
```
##### Passing multiple data
If you need to work on more variables, you can pack them together
```javascript
C.if(person => {

  if (typeof person !== "object")
    throw new Error("Invalid person object");

  if (! person.userid)
    throw new Error("Invalid userid");

  const today = new Date();
  const fullname = `${person.name} ${person.surname}`;
  const msg = `Hello, ${person.name},` +
              ` you have just logged in!` +
              ` ${today.toLocaleString()}`;

  const divUserMessage = document.getElementById("usermsg");

  return Object.assign(person, {divUserMessage, fullname});
})
.and(combinedObject => ...)
({userid: "medenagan", name: "Fabio", surname: "Mereu"}) // run with an input
```

#### Scoping
> *Since 0.2*

The `scope` paramater allows transfering an object along the chain:

```javascript
// Show the current time on console
C
.if(
  (value, scope) => scope.today = new Date()
)
.and(
  (value, scope) => scope.today.toLocaleTimeString()
)
.onTrue()
();
```

To set an initial scope, you can explicit the second parameter of `Chainable.run(initialValue, initialScope)`:

```javascript
C
.and(
  (value, scope) => scope.enabled,
  (value, scope) => !scope.hidden,
)
.run(0, {enabled = true, hidden = false});
```
##### `scope` is a shallow copy
If some part of the evaluation needs being repeated under the intervention of a modifier such as `Chainable.atmost()` or `Chainable.during()`, changes on the `scope` object will not propagate backwards.
```javascript
// output:
// { count: 0 }
// { count: 1 }
// { count: 0 }
// { count: 1 }
// { count: 0 }
// { count: 1 }
C.or(
  (value, scope) => {
    scope.count = scope.count || 0;
    console.log(scope);
  },
  (value, scope) => {
    scope.count += 1;
    console.log(scope);
    // both return undefined
  }
).atmost(3)();
```

##### `scope` is a shallow copy
The `scope` object is copied in a shallow way through each step. Thus second level objects as `scope.customObject = {}` are not protected against alteration.

```javascript
// output:
// { global: { count: 0 } }
// { global: { count: 1 } }
// { global: { count: 2 } }
// { global: { count: 3 } }
// { global: { count: 4 } }
// { global: { count: 5 } }

const global = {
  count: 0
};

C.if(
  (value, scope) => {
    console.log(scope);
    scope.global.count += 1;
  }
).atmost(6).run(null, {global});
```

### Logical operators
Simpler conditions can be combined into the chain with logical operators.

#### Sequential operators

Logical operators can be . `Chainable.and()`, `.or()`, `.xor()` and the more exotic `.nand()`, `nor()`, `.xnor()`:

```javascript
// It will output the last string on the console
C.if(false)
 .or(0, null, () => !true, "Here we go!")
 .onTrue()
 ();
```
#### Parallel operators
Normally, logical operators are sequential and abide by the lazy behavior you would expect with `&&` or `||`.
However, in some case you may need some parallel evaluation, that means, all operands are scheduled for an asynchronous evaluation.

Each sequential operator has its own alter ego ending in -a, which behaves in a pseudo-parallel way: `Chainable.anda`, `.ora`, `.xora`, `.nanda`, `nora`, `.xnora`:

```javascript
const p0 = new Promise(resolve => ...resolve(true));
const p1 = new Promise(...);
const p2 = new Promise(...);

// In a parallel condition, p1 may answer before p0:
// order doesn't matter in this case
C.anda(p0, p1, p2).onTrue("all responded with a truthy value")();
```

In case the conditions are synchronous, a parallel operator will force them to be run asynchronously.
This behavior is mostly unwanted, especially for dependent conditions like `if (obj) && obj.method()`

```javascript
// .anda will cause the console to show all three statements,
// whereas .and would stop after the first function

C.anda(
 () => console.log("1st function"), // returns undefined
 () => console.log("2st function"),
 () => console.log("3st function")
).debug();
```
##### Testing a condition in development
For development purposes `Chainable.debug()` method behaves as `.run()`, but it shows on the console the value (or error) obtained and if the condition runs in synchronous or asynchronous way.

#### Extending the chain
Every method used on a `Chainable` object will create an independent object. This allows extending an existing object without any side effect:

```javascript
const a = C.if(x => x * 2).and(x => x - 6);
const b = a.or(Infinity);

a.debug(+3); // Test gives 0
b.debug(+3); // Test gives Infinity;
```

#### Modifiers
Modifiers affect the way a certain condition is evaluated. You can postpone an evaluation, set a timeout, require that it's maintained (=resolves to true) for an amount of time or attempt multiple times in order to verify it.

#### `Chainable.in(delay)`

To postpone an evaluation, you can use `Chainable.in(delay)` which will evaluate the preceding condition after `delay` milliseconds:
```javascript
const popup = C
   // We're using the first parameter of .run(true|false)
  .if(show => show)
  .onTrue(_=> $("#popup").show() )
   // wait 2 seconds before showing it
  .in(2000);

// Show this popup
popup(true);
// Or check if the popup is hidden in half second, then show it
popup(C.if(_=> !$("#popup:visible").length).in(500));
```

#### `Chainable.out(duration)`
In order to set a timeout, you can call `Chainable.out(duration)`. It will force the preceding condition to return false if it is not resolved in `duration` milliseconds
```javascript
// Log a warning message on console
C.if(
  C.if(true).in(600)
).out(200).onFalse("Test not passed")();
```

#### `Chainable.during(period)`
In case you have a mutating condition, such as some property in the DOM, you can test it multiple in an asyncrhonours loop and define the minimum period of time it must be verified.
The condition to which `.during(milliseconds)` is applied to must resolve to true for `period` milliseconds.
If it returns false at least once during this period (included the very first time it's evaluated), the overall condition is assumed to be false.
```javascript
// A static truthy value is verified for any amount of time
C.if(1).during(10).onTrue();

// It will output null (only 1 attempt)
C.if(null).during(2000).onFalse();
```



#### `Chainable.atmost(attempts)`
To test a condition more than once until it gets true, you can call `Chainable.atmost(attempts)`. It will try resolving the preceding condition up to `attempts` times and it will return true as soon as one attempt is verified.

```javascript
C.if(solution => new Promise(
   resolve => resolve(solution == prompt("Guess a number 0-9 guess", "..."))
 ))
 .onTrue(_=> alert("You win"))
 .onFalse("wrong attempt") // failing single attempt, on console
  .atmost(3) // lives
  .onFalse(_=> alert("Sorry, you lost all your lives")) // failing all attempts
  (Math.floor(Math.random() * 10));
```

You can pass `Infinity` if you're sure the condition will return true at a certain point.
```javascript
/*
Typical output:

>  0.22714753239346042
>  fail false
>  0.378612479186758
>  fail false
>  0.6449043749939198
>  OK true  */

C.if(_=> Math.random()) // A new random number at each evaluation
 .onTrue()
 .and(num => num > .5)
 .onTrue("OK")
 .onFalse("fail")
 .in(50)
 .atmost(Infinity)();
```


if you want to create a loop, you can prepend `.and(false)` to force `atmost` running again even if the last result was truthy.

```javascript
C.if( document.getElementById("myTextArea") )
.and(element => element.value === "this box is empty")
.during(3000)
.onTrue(_=> document.getElementById("easteregg").style.display = "block") // Show a surprise if the match message has persisted for 3 seconds
.onFalse(_=>  document.getElementById("easteregg").style.display = "none")
.in(500) // reduce cpu intensity in between false results
.and(false) // retrigger when the condition is met, forcing atmost to act like an interval
.atmost(Infinity)
();
```

New attempts are schedululed asyncrhonously and you can use `.in(ms)` to reduce the frequency of each evaluation. To set a timeout, you can append `.out()`.

If `attempts` is less than one, the condition resolves to false by definition.

### Using `conject` on a browser
You can transpile and bundle `conject` for the browsers you need or pick one of the ready-to-use builds in the git repo.

```html
<!-- Optimized for most recent browsers -->
<script src="conject-browser.js"></script>
```
or
```html
<!-- Runs the Babel polyfill for Promise, Weakmaps, etc -->
<script src="conject-ie.js"></script>
```

The script creates a global object named `conject` which has the same properties you would get by requiring it on node.

```html
<script>
  var C = conject;
  C.if("meow").onTrue("Cat found")();
</script>
```
You can also add it as a **content or background script** in Browser Extension. In this case, you can add it to the manifest.json.

If you have a complex combination of content scripts and injected code, it's recommendable to check if you're attaching `conject` more than once, as this may create conflicts between older and new `C` objects

```javascript
var C = C || conject;
```


### Building & development
`conject` is written in ES6, but it's transpiled with Babbel and bundled wth Browserify in case the target is not Node. If you clone the git repo, you can build your own version or use some preconfigured commands:

```shell
$ npm run build-node #transpile for the node version installed on your machine
$ npm run build-node6 #transpile for node 6 (default)
$ npm run build-node4 #transpile for node 4 (will create longer code))
$ npm run build-browser #transpile and bundle for modern browsers
$ npm run build-ie #transpile and bundle for old browsers adding a polyfill
```


### License

`conject` is licensed under the MIT License
