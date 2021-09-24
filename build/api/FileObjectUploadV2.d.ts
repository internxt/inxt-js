/// <reference types="node" />
interface ShardMeta {
    hash: string;
    size: number;
    index: number;
    parity: boolean;
    challenges?: Buffer[];
    challenges_as_str: string[];
    tree: string[];
    exclude?: any;
}
export declare class FileObjectUploadV2 {
    constructor();
    stage(): void;
    upload(cb: any): Promise<ShardMeta[]>;
    abort(): void;
}
export {};
