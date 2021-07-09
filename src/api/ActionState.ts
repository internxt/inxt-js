import { EventEmitter } from 'events';

import { DOWNLOAD_CANCELLED, UPLOAD_CANCELLED } from './constants';

export enum ActionTypes {
    DOWNLOAD = 'DOWNLOAD',
    UPLOAD = 'UPLOAD'
}

export class ActionState extends EventEmitter {
    private type: ActionTypes;

    constructor(type: ActionTypes) {
        super();

        this.type = type;
    }

    public stop(): void {
        if (this.type === ActionTypes.DOWNLOAD) {
            this.emit(DOWNLOAD_CANCELLED);
        }

        if (this.type === ActionTypes.UPLOAD) {
            this.emit(UPLOAD_CANCELLED);
        }
    }
}
