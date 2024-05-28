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

/**
 * Returns a random string
 */
const asciis = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
export const randomStr = (len: number): string => {
  let id = '';
  let counter = 0;
  while (counter < len) {
    id += asciis.charAt(Math.floor(Math.random() * asciis.length));
    counter += 1;
  }
  return id;
};
