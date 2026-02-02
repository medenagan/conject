/**
 * Evaluation represents the result of a condition check.
 * It is similar to a Promise but optimized for synchronous execution when possible.
 *
 * Checks can be "lazy" (not evaluated until requested) or "eager".
 * Once resolved or rejected, an Evaluation is immutable.
 *
 * @template T The type of the resolved value.
 */
export class Evaluation<T = any> {
    /**
     * Creates a resolved Evaluation with the given value.
     * @param value The value to resolve with.
     */
    static resolve<U>(value: U): Evaluation<U>;

    /**
     * Creates a rejected Evaluation with the given reason.
     * @param reason The reason for rejection.
     */
    static reject(reason: any): Evaluation<any>;

    /**
     * Creates a new Evaluation.
     * @param resolver Function to resolve or reject the evaluation.
     * @param aborter Optional function to abort the evaluation if cancelled.
     */
    constructor(resolver: (resolve: (value: any) => void, reject: (reason: any) => void) => void, aborter?: () => void);

    /**
     * Aborts the evaluation if it is still ongoing or pending.
     * @param reason Optional reason for abortion.
     * @returns True if the evaluation was successfully aborted.
     */
    abort(reason?: string): boolean;

    /**
     * Attaches handlers for the resolution or rejection of the evaluation.
     * If the evaluation is synchronous and already resolved, these handlers are called immediately.
     *
     * @param onFulfilled Handler called when evaluation resolves successfully.
     * @param onRejected Handler called when evaluation is rejected.
     */
    on(onFulfilled?: Handler<any>, onRejected?: Handler<any>): void;

    /**
     * Attaches asynchronous handlers. Even if the evaluation is synchronous,
     * the handlers will be scheduled to run asynchronously in the next event loop tick.
     *
     * @param onFulfilled Handler called when evaluation resolves successfully.
     * @param onRejected Handler called when evaluation is rejected.
     */
    ona(onFulfilled?: Handler<any>, onRejected?: Handler<any>): void;

    /**
     * The current status of the evaluation.
     */
    readonly status: "pending" | "ongoing" | "resolved" | "rejected";

    /**
     * True if the evaluation is running asynchronously.
     * Throws if status is pending.
     */
    readonly async: boolean;

    /**
     * The resolved value.
     * Throws if not resolved.
     */
    readonly value: T;

    /**
     * The rejection reason.
     * Throws if not rejected.
     */
    readonly reason: any;

    /**
     * Converts the Evaluation to a standard Promise.
     * Warning: This breaks laziness and forces execution if not already running.
     *
     * @returns A Promise that resolves with the evaluation value or rejects with reason.
     */
    toPromise(): Promise<T>;

    /**
     * Shortcut for toPromise().then(...)
     * Connects this evaluation to a standard Promise chain.
     */
    then<TResult1 = any, TResult2 = never>(
        onfulfilled?: ((value: any) => TResult1 | PromiseLike<TResult1>) | null,
        onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
    ): Promise<TResult1 | TResult2>;
}

/**
 * Base class for all conditions.
 * A Condition is a potentially lazy testable unit that produces an Evaluation.
 *
 * @template T The type of value this condition resolves to.
 */
export class Condition<T = any> {
    constructor(members?: any);

    /**
     * Tests the condition.
     * @param initialValue Optional initial value to test against.
     * @param initialScope Optional scope object passed through the evaluation context.
     * @returns An Evaluation object representing the result.
     */
    test(initialValue?: T, initialScope?: any): Evaluation<T>;

    /**
     * Converts the condition test to a Promise.
     * @template V Default result type if T is unknown.
     * @returns A Promise that resolves with the condition result.
     */
    toPromise<V = any>(initialValue?: V): ResolvedPromise<T, V>;
}

export class StaticCondition<T = any> extends Condition<T> {
    constructor(value: T);
    readonly value: T;
}

export class FunctionalCondition<T = any, S = any> extends Condition<T> {
    constructor(fn: (value: T, scope?: S) => T);
    readonly fn: (value: T, scope?: S) => T;
}

export class PromiseCondition<T = any> extends Condition<T> {
    constructor(promise: Promise<T>);
    readonly promise: Promise<T>;
}

export type Primitive = string | number | boolean | null | undefined | symbol | bigint;

export type ConditionLike<S = any> = ((value: any, scope?: S) => any) | Condition | Promise<any> | Primitive;

export type Falsy = false | 0 | "" | null | undefined;

// --- Derived Conditions ---

// --- Derived Conditions ---

/**
 * Helper to infer value type from a ConditionLike object.
 * Extracts type T from Condition<T>, U from Promise<U>, or R from function/value.
 * @template P The type to infer from.
 */
export type InferConditionValue<P> =
    P extends null ? null :
    P extends undefined ? undefined :
    P extends Condition<infer T> ? T :
    P extends Promise<infer U> ? U :
    P extends (...args: any[]) => infer R ? R :
    P;

export type InferConditionValues<Ps extends readonly unknown[]> = {
    [K in keyof Ps]: InferConditionValue<Ps[K]>;
}[number];

// --- Type Helpers ---

/**
 * Function type for handling evaluation results.
 * @template T Type of the value being handled.
 */
export type Handler<T> = (value: T) => void;

/**
 * Type representing a Promise returned by toPromise().
 * Preserves the type T, or defaults to V if T is unknown.
 */
export type ResolvedPromise<T, V = any> = Promise<unknown extends T ? V : T>;

/** Alias for ChainableInstance to reduce verbosity in declarations */
export type Chain<T, S = any> = ChainableInstance<T, S>;
/** Alias for InferConditionValue */
export type InferVal<P> = InferConditionValue<P>;
/** Alias for InferConditionValues (array version) */
export type InferVals<P extends readonly unknown[]> = InferConditionValues<P>;

export class ConditionList extends Condition {
    readonly conditions: Condition[];
    readonly length: number;
}

export class SequentialCondition extends ConditionList {}
export class SequentialAnd extends SequentialCondition {}
export class SequentialOr extends SequentialCondition {}
export class SequentialNand extends SequentialCondition {}
export class SequentialNor extends SequentialCondition {}
export class SequentialXor extends SequentialCondition {}
export class SequentialXnor extends SequentialCondition {}

export class ParallelCondition extends ConditionList {}
export class ParallelAnd extends ParallelCondition {}
export class ParallelOr extends ParallelCondition {}
export class ParallelNand extends ParallelCondition {}
export class ParallelNor extends ParallelCondition {}
export class ParallelXor extends ParallelCondition {}
export class ParallelXnor extends ParallelCondition {}

export class UnaryProxyCondition extends Condition {
    readonly source: Condition;
}

export class NegativeCondition extends UnaryProxyCondition {}
export class BooleanCondition extends UnaryProxyCondition {}

export class DelayedCondition extends UnaryProxyCondition {
    readonly delay: number;
}

export class TimeoutCondition extends UnaryProxyCondition {
    readonly duration: number;
}

export class DurableCondition extends UnaryProxyCondition {
    readonly duration: number;
}

export class CycleCondition extends UnaryProxyCondition {
    readonly attempts: number;
}

export class ErrorCondition extends Condition {
    readonly reason: any;
}

export class EventCondition extends UnaryProxyCondition {}
export class TrueEventCondition extends EventCondition {}
export class FalseEventCondition extends EventCondition {}
export class ErrorEventCondition extends EventCondition {}

export class SequentialLink extends SequentialCondition {}
export class ParallelLink extends ParallelCondition {}


/**
 * Interface representing a chain of conditions.
 * It is callable, which triggers the execution of the chain (alias for .run()).
 *
 * @template T The type of the value that the condition chain resolves to (e.g., boolean, number).
 * @template S The type of the optional scope object passed through the evaluation context.
 *
 * @example
 * const chain = C.if(true);
 * chain(); // executes the chain
 */
export interface ChainableInstance<T = any, S = any> {
    /**
     * Runs the evaluation chain.
     * Equal to .run(initialValue, scope)
     * @param initialValue Optional initial value passed to the first condition.
     * @param scope Optional scope object passed through the chain.
     */
    (initialValue?: any, scope?: any): Evaluation<T>;

    toString(): string;
    readonly condition: Condition<T>;

    /**
     * Converts the chain execution to a Promise.
     * Starts execution immediately.
     *
     * @param initialValue Optional initial value.
     * @returns A Promise resolving to the chain result.
     * @example
     * await C.if(true).toPromise();
     */
    toPromise<V = any>(initialValue?: V): ResolvedPromise<T, V>;

    /**
     * Executes the condition chain.
     * @param initialValue The value to pass into the first condition.
     * @param scope An optional scope object passed along the chain.
     * @returns An Evaluation object.
     * @example
     * C.if(x => x > 5).run(10);
     */
    run(initialValue?: any, scope?: any): Evaluation<T>;

    /**
     * Runs the chain and logs debug information to the console.
     * Shows value/error and sync/async execution status.
     * @returns The Evaluation object.
     */
    debug(initialValue?: any, scope?: any): Evaluation<any>;

    // --- Sequential Operators ---

    /**
     * Appends a condition to the chain.
     * Note: .if() typically starts a chain via C.if(), but can be used here to restart/nest logic.
     * @param condition The condition to append.
     */
    if<P>(condition: P): Chain<T | InferVal<P>, S>;

    /**
     * Logically ANDs the current chain with the given condition(s).
     * Stops at the first falsy value (short-circuiting).
     *
     * @param conditions One or more conditions to evaluating.
     * @example
     * C.if(true).and("value"); // -> "value"
     * C.if(false).and("value"); // -> false
     */
    and<P extends readonly unknown[]>(...conditions: P): Chain<T | InferVals<P>, S>;

    /**
     * Logically ORs the current chain with the given condition(s).
     * Stops at the first truthy value (short-circuiting).
     *
     * @param conditions One or more conditions to evaluating.
     * @example
     * C.if(false).or("fallback"); // -> "fallback"
     */
    or<P extends readonly unknown[]>(...conditions: P): Chain<T | InferVals<P>, S>;

    /**
     * Logically XORs the current chain with the given condition(s).
     * Exclusive OR: true if inputs differ in truthiness.
     */
    xor<P extends readonly unknown[]>(...conditions: P): Chain<T | InferVals<P> | boolean, S>;

    /**
     * Logically NORs the current chain.
     * True only if all inputs are falsy.
     */
    nor<P extends readonly unknown[]>(...conditions: P): Chain<boolean, S>;

    /**
     * Logically NANDs the current chain.
     * False only if all inputs are truthy.
     */
    nand<P extends readonly unknown[]>(...conditions: P): Chain<boolean, S>;

    /**
     * Logically XNORs the current chain.
     * True if all inputs have the same truthiness.
     */
    xnor<P extends readonly unknown[]>(...conditions: P): Chain<T | InferVals<P> | boolean, S>;

    // --- Parallel Operators ---

    /**
     * Parallel AND. All operands are scheduled for evaluation concurrently.
     * Useful when tasks are independent and can run in parallel.
     *
     * @param conditions Conditions to evaluate in parallel.
     */
    anda<P extends readonly unknown[]>(...conditions: P): Chain<T | InferVals<P>, S>;

    /**
     * Parallel OR. All operands are scheduled for evaluation concurrently.
     * Appends concurrent logic to the chain.
     */
    ora<P extends readonly unknown[]>(...conditions: P): Chain<T | InferVals<P>, S>;

    /**
     * Parallel XOR.
     */
    xora<P extends readonly unknown[]>(...conditions: P): Chain<T | InferVals<P>, S>;

    /**
     * Parallel NOR.
     */
    nora<P extends readonly unknown[]>(...conditions: P): Chain<T | InferVals<P>, S>;

    /**
     * Parallel NAND.
     */
    nanda<P extends readonly unknown[]>(...conditions: P): Chain<T | InferVals<P>, S>;

    /**
     * Parallel XNOR.
     */
    xnora<P extends readonly unknown[]>(...conditions: P): Chain<T | InferVals<P>, S>;

    // --- Unary Operators ---

    /**
     * Negates the result of the preceding condition.
     * @example
     * C.if(true).not(); // -> false
     */
    not(): Chain<boolean, S>;

    /**
     * Casts the result to a boolean.
     * @example
     * C.if("text").bool(); // -> true
     */
    bool(): Chain<boolean, S>;

    // --- Modifiers ---

    /**
     * Delays the evaluation of the preceding condition by `delay` milliseconds.
     * @param delay Time in milliseconds to wait before resolving.
     * @example
     * C.if(true).in(1000).run(); // resolves after 1 second
     */
    in(delay: number): Chain<T, S>;

    /**
     * Sets a timeout. If the condition is not resolved within `duration` ms, it returns false.
     * @param duration Max time in milliseconds for the condition to resolve.
     * @example
     * C.if(slowPromise).out(500); // fails if slowPromise takes > 500ms
     */
    out(duration: number): Chain<T, S>;

    /**
     * Requires the condition to remain true for `period` milliseconds.
     * Repeatedly tests the condition during the period.
     * @param period Duration in milliseconds validation must persist.
     */
    during(period: number): Chain<T, S>;

    /**
     * Attempts to verify the condition up to `attempts` times.
     * Can pass Infinity for retrying indefinitely.
     * @param attempts Maximum number of retries.
     * @example
     * C.if(unstableCheck).atmost(3); // retries up to 3 times
     */
    atmost(attempts: number): Chain<T, S>;

    /**
     * Throws an error if reached.
     */
    throw(error: any): Chain<T, S>;

    // --- Event Handlers ---

    /**
     * Executes a handler if the condition resolves to true.
     * If provided a function, it acts as a callback receiving the value.
     * Otherwise, arguments are logged to console.
     *
     * @param handler Function or value to log.
     * @example
     * C.if(true).onTrue(val => console.log("Success:", val));
     */
    onTrue(handler: Handler<Exclude<T, Falsy>>): Chain<T, S>;
    onTrue(...logParams: any[]): Chain<T, S>;

    /**
     * Executes a handler if the condition resolves to false.
     * If provided a function, it acts as a callback.
     * Otherwise, arguments are logged to console (warn).
     *
     * @param handler Function or value to log.
     */
    onFalse(handler: Handler<T & Falsy>): Chain<T, S>;
    onFalse(...logParams: any[]): Chain<T, S>;

    /**
     * Executes a handler if the evaluation is rejected (throws error).
     *
     * @param handler Function to handle the error or value to log.
     */
    onError(handler: Handler<any>): Chain<T, S>;
    onError(...logParams: any[]): Chain<T, S>;
}

export class Chainable {
    constructor(source?: any);
}

// Needed to avoid circular reference where Chainable uses ChainableInstance
export interface Chainable extends ChainableInstance {}


/**
 * The main entry point for Conject.
 * Provides static methods to start condition chains and access condition classes.
 */
export const C: {
    Evaluation: typeof Evaluation;
    Chainable: typeof Chainable;

    condition: {
        fromValue(value: any): StaticCondition;
        fromFunction(fn: Function): FunctionalCondition;
        fromPromise(promise: Promise<any>): PromiseCondition;
        fromAny(any: any): Condition;
    };

    /**
     * Linkage check to ensure correct typing environment.
     * Internal use only.
     */
    TEST_LINKAGE: true;

    /**
     * Starts a condition chain with an initial condition.
     *
     * @param condition The initial value, promise, function, or condition.
     * @returns A chainable instance wrapped around the condition.
     * @example
     * C.if(true).run();
     * C.if(x => x > 0).run(10);
     */
    if<P>(condition: P): Chain<InferVal<P>>;

    and: ChainableInstance["and"];
    or: ChainableInstance["or"]

    /** Starts a chain with a XOR condition */
    xor<P extends ConditionLike>(condition: P): Chain<InferVal<P>>;
    /** Starts a chain with a NOR condition */
    nor<P extends ConditionLike>(condition: P): Chain<InferVal<P>>;
    /** Starts a chain with a NAND condition */
    nand<P extends ConditionLike>(condition: P): Chain<InferVal<P>>;
    /** Starts a chain with a XNOR condition */
    xnor<P extends ConditionLike>(condition: P): Chain<InferVal<P>>;

    /** Starts a chain with a parallel AND condition */
    anda<P extends ConditionLike>(condition: P): Chain<InferVal<P>>;
    /** Starts a chain with a parallel OR condition */
    ora<P extends ConditionLike>(condition: P): Chain<InferVal<P>>;
    /** Starts a chain with a parallel XOR condition */
    xora<P extends ConditionLike>(condition: P): Chain<InferVal<P>>;
    /** Starts a chain with a parallel NOR condition */
    nora<P extends ConditionLike>(condition: P): Chain<InferVal<P>>;
    /** Starts a chain with a parallel NAND condition */
    nanda<P extends ConditionLike>(condition: P): Chain<InferVal<P>>;
    /** Starts a chain with a parallel XNOR condition */
    xnora<P extends ConditionLike>(condition: P): Chain<InferVal<P>>;

    /**
     * Creates a chain that immediately throws an error.
     * @param error The error to throw.
     */
    throw(error: any): Chain<any>;

    // Condition Classes
    StaticCondition: typeof StaticCondition;
    FunctionalCondition: typeof FunctionalCondition;
    PromiseCondition: typeof PromiseCondition;

    SequentialAnd: typeof SequentialAnd;
    SequentialOr: typeof SequentialOr;
    SequentialXor: typeof SequentialXor;
    SequentialNor: typeof SequentialNor;
    SequentialNand: typeof SequentialNand;
    SequentialXnor: typeof SequentialXnor;

    ParallelAnd: typeof ParallelAnd;
    ParallelOr: typeof ParallelOr;
    ParallelXor: typeof ParallelXor;
    ParallelNor: typeof ParallelNor;
    ParallelNand: typeof ParallelNand;
    ParallelXnor: typeof ParallelXnor;

    NegativeCondition: typeof NegativeCondition;
    BooleanCondition: typeof BooleanCondition;
    DelayedCondition: typeof DelayedCondition;
    TimeoutCondition: typeof TimeoutCondition;
    DurableCondition: typeof DurableCondition;
    CycleCondition: typeof CycleCondition;
    ErrorCondition: typeof ErrorCondition;

    TrueEventCondition: typeof TrueEventCondition;
    FalseEventCondition: typeof FalseEventCondition;
    ErrorEventCondition: typeof ErrorEventCondition;
};

// Helper type needs to be exported or defined outside C if used in return type?
// No, it's inside C declaration, so it might be private.
// Better move InferConditionValue outside.


export default C;
