export class PerformanceMonitor {
  private startTimes: Map<string, number> = new Map();
  private isEnabled: boolean;

  constructor(enabled: boolean = true) {
    this.isEnabled = enabled;
  }

  public startTimer(label: string): void {
    if (!this.isEnabled) return;
    this.startTimes.set(label, performance.now());
    console.log(`⏱️ Starting: ${label}`);
  }

  public endTimer(label: string): number {
    if (!this.isEnabled) return 0;
    
    const startTime = this.startTimes.get(label);
    if (!startTime) {
      console.warn(`Timer '${label}' was not started`);
      return 0;
    }

    const elapsed = performance.now() - startTime;
    console.log(`✅ Completed: ${label} in ${elapsed.toFixed(2)}ms`);
    this.startTimes.delete(label);
    return elapsed;
  }

  public timeFunction<T>(label: string, fn: () => T): T {
    if (!this.isEnabled) return fn();
    
    this.startTimer(label);
    const result = fn();
    this.endTimer(label);
    return result;
  }

  public async timeAsyncFunction<T>(label: string, fn: () => Promise<T>): Promise<T> {
    if (!this.isEnabled) return fn();
    
    this.startTimer(label);
    const result = await fn();
    this.endTimer(label);
    return result;
  }

  public logMemoryUsage(label?: string): void {
    if (!this.isEnabled || !('memory' in performance)) return;
    
    const memory = (performance as any).memory;
    const prefix = label ? `${label} - ` : '';
    console.log(`🧠 ${prefix}Memory usage:`, {
      used: `${(memory.usedJSHeapSize / 1048576).toFixed(1)} MB`,
      total: `${(memory.totalJSHeapSize / 1048576).toFixed(1)} MB`,
      limit: `${(memory.jsHeapSizeLimit / 1048576).toFixed(1)} MB`
    });
  }

  public enable(): void {
    this.isEnabled = true;
  }

  public disable(): void {
    this.isEnabled = false;
  }
}