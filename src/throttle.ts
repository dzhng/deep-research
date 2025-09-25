type Task<T> = () => Promise<T>;

export function createRequestThrottler(limit: number, intervalMs: number) {
  let requestCount = 0;
  const queue: Array<() => void> = [];
  let timer: any | null = null;

  const processQueue = () => {
    while (queue.length > 0 && requestCount < limit) {
      const next = queue.shift();
      if (next) {
        requestCount++;
        next();
      }
    }

    // Start reset timer if we have active requests and no timer is running
    if (requestCount > 0 && !timer) {
      timer = setTimeout(() => {
        requestCount = 0;
        timer = null;
        // After reset, try to process any remaining queued tasks
        if (queue.length > 0) {
          processQueue();
        }
      }, intervalMs);
    }
  };

  return function throttled<T>(fn: Task<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const taskWrapper = () => {
        fn()
          .then(e => {
            processQueue();
            resolve(e);
          })
          .catch(e => {
            processQueue();
            reject(e);
          });
      };

      if (requestCount < limit) {
        // Execute immediately
        requestCount++;
        taskWrapper();

        // Start timer if this is the first request
        if (requestCount === 1 && !timer) {
          timer = setTimeout(() => {
            requestCount = 0;
            timer = null;
            // After reset, process any queued tasks
            if (queue.length > 0) {
              processQueue();
            }
          }, intervalMs);
        }
      } else {
        // Queue for later
        queue.push(taskWrapper);
      }
    });
  };
}
// <T>(fn: Task<T>) => fn();
export const throttler = createRequestThrottler(100, 60100);
