import { DownloadStrategy } from "./DownloadStrategy";

export class EmptyStrategy extends DownloadStrategy {
  // tslint:disable-next-line: no-empty
  async download(): Promise<void> { }
  // tslint:disable-next-line: no-empty
  abort(): void { }
}
