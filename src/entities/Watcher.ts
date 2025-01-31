export class Watcher {
  private maxTime: number;
  private startTime: number;
  private interval: NodeJS.Timeout | null = null;

  constructor(maxTime: number) {
    this.maxTime = maxTime;
    this.startTime = Date.now();
  }

  start(callback: () => Promise<boolean>) {
    console.log(`Started time: ${this.formatTime(this.maxTime)}`);
    this.interval = setInterval(async () => {
      console.clear();

      const elapsedTime = Date.now() - this.startTime;
      const remainingTime = this.maxTime - elapsedTime;
      console.log(`Remaining time: ${this.formatTime(remainingTime)}`);

      const result = await callback();

      if (result) {
        this.stop("Condition met via callback");
        return;
      }

      if (remainingTime <= 0) {
        this.stop("Time expired");
        return;
      }
    }, 1000);
  }

  stop(reason: string) {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      console.log(`Watcher stopped. Reason: ${reason}`);
    }
  }

  private formatTime(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600)
      .toString()
      .padStart(2, "0");
    const minutes = Math.floor((totalSeconds % 3600) / 60)
      .toString()
      .padStart(2, "0");
    const seconds = (totalSeconds % 60).toString().padStart(2, "0");

    return `${hours}:${minutes}:${seconds}`;
  }
}
