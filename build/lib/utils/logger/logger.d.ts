import * as Winston from 'winston';
export declare class Logger {
    private static Instance;
    private static Debugger;
    static getInstance(logLevel?: number): Winston.Logger;
    static getDebugger(logLevel: number | undefined, debugCallback: (msg: string) => void): Winston.Logger;
}
export declare const logger: Winston.Logger;
export declare const getDebuggerInstance: (level: number, debugCallback: (msg: string) => void) => Winston.Logger;
