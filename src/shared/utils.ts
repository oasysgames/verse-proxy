/**
 * Defer promise until resolve or reject is called
 */
export const defer = <TResolve = unknown, TReject = unknown>() => {
    let resolve!: (value: TResolve) => void;
    let reject!: (value: TReject) => void;

    const promise = new Promise<TResolve>((res, rej) => {
        resolve = res;
        reject = rej;
    });

    return { promise, resolve, reject };
};