/// <reference types="node" />
import { EventEmitter } from 'events';
export declare enum ActionTypes {
    DOWNLOAD = "DOWNLOAD",
    UPLOAD = "UPLOAD"
}
export declare class ActionState extends EventEmitter {
    private type;
    constructor(type: ActionTypes);
    stop(): void;
}
