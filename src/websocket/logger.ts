export interface Logger {
  info: (...args: any[]) => void;
  error: (...args: any[]) => void;
  debug: (...args: any[]) => void;
}

export class ConsoleLogger implements Logger {
  constructor(private enabled: boolean = true) {}

  private ts() {
    return new Date().toISOString();
  }

  info = (...args: any[]) => {
    if (!this.enabled) return;
    console.log(`[INFO ${this.ts()}]`, ...args);
  };

  error = (...args: any[]) => {
    if (!this.enabled) return;
    console.error(`[ERROR ${this.ts()}]`, ...args);
  };

  debug = (...args: any[]) => {
    if (!this.enabled) return;
    console.debug(`[DEBUG ${this.ts()}]`, ...args);
  };
}
