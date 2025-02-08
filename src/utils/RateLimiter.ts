export class RateLimiter {
  private maxCalls: number;
  private interval: number;
  private callTimestamps: number[];

  constructor(maxCalls: number, interval: number) {
    this.maxCalls = maxCalls;
    this.interval = interval;
    this.callTimestamps = [];
  }

  public async schedule<T>(fn: () => Promise<T>): Promise<T> {
    while (true) {
      const now = Date.now();
      // Remove timestamps older than the interval
      this.callTimestamps = this.callTimestamps.filter(ts => (now - ts) < this.interval);
      if (this.callTimestamps.length < this.maxCalls) {
        this.callTimestamps.push(now);
        return fn();
      } else {
        const waitTime = this.interval - (now - this.callTimestamps[0]!);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
} 