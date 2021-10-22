/// <reference types="node" />
import { EventEmitter } from "stream";
import winston from "winston";
import { EnvironmentConfig } from "..";
import { FileObjectUploadProtocol } from "./FileObjectUploadProtocol";
import { CreateEntryFromFrameBody, CreateEntryFromFrameResponse, InxtApiI } from "../services/api";
import { UploadStrategy } from "../lib/upload/UploadStrategy";
import { Abortable } from "./Abortable";
interface FileMeta {
    size: number;
    name: string;
}
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
export declare class FileObjectUploadV2 extends EventEmitter implements FileObjectUploadProtocol, Abortable {
    private fileMeta;
    private config;
    private requests;
    private id;
    private aborted;
    private api;
    private logger;
    private uploader;
    iv: Buffer;
    index: Buffer;
    frameId: string;
    bucketId: string;
    fileEncryptionKey: Buffer;
    constructor(config: EnvironmentConfig, fileMeta: FileMeta, bucketId: string, log: winston.Logger, uploader: UploadStrategy, api?: InxtApiI);
    getSize(): number;
    getId(): string;
    checkIfIsAborted(): void;
    init(): Promise<FileObjectUploadV2>;
    checkBucketExistence(): Promise<boolean>;
    stage(): Promise<void>;
    SaveFileInNetwork(bucketEntry: CreateEntryFromFrameBody): Promise<CreateEntryFromFrameResponse>;
    GenerateHmac(shardMetas: ShardMeta[]): string;
    upload(): Promise<ShardMeta[]>;
    createBucketEntry(shardMetas: ShardMeta[]): Promise<void>;
    abort(): void;
    isAborted(): boolean;
}
export declare function generateBucketEntry(fileObject: FileObjectUploadV2, fileMeta: FileMeta, shardMetas: ShardMeta[], rs: boolean): CreateEntryFromFrameBody;
export {};
