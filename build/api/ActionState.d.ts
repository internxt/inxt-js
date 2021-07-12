/// <reference types="node" />
import { EventEmitter } from 'events';
export declare enum ActionTypes {
    Download = "DOWNLOAD",
    Upload = "UPLOAD"
}
export declare class ActionState extends EventEmitter {
    private type;
    constructor(type: ActionTypes);
    stop(): void;
}
