import { EventEmitter } from 'events';
import { Events } from '.';

export enum ActionTypes {
  Download = 'DOWNLOAD',
  Upload = 'UPLOAD'
}

export class ActionState extends EventEmitter {
  private type: ActionTypes;

  constructor(type: ActionTypes) {
    super();

    this.type = type;
  }

  public stop(): void {
    if (this.type === ActionTypes.Download) {
      this.emit(Events.Download.Abort);

      return;
    }

    if (this.type === ActionTypes.Upload) {
      this.emit(Events.Upload.Abort);
    }
  }
}
