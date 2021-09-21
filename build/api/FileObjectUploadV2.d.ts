/// <reference types="node" />
import { EventEmitter, Readable } from "stream";
import winston from "winston";
import { EnvironmentConfig, UploadProgressCallback } from "..";
import { FileObjectUploadProtocol } from "./FileObjectUploadProtocol";
import { ShardMeta } from "../lib/shardMeta";
import { CreateEntryFromFrameBody, CreateEntryFromFrameResponse, InxtApiI } from "../services/api";
import { UploadStrategy } from "../lib/upload/UploadStrategy";
import { Abortable } from "./Abortable";
interface FileMeta {
    size: number;
    name: string;
    content: Readable;
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
    upload(cb: UploadProgressCallback): Promise<ShardMeta[]>;
    createBucketEntry(shardMetas: ShardMeta[]): Promise<void>;
    abort(): void;
    isAborted(): boolean;
}
export declare function generateBucketEntry(fileObject: FileObjectUploadV2, fileMeta: FileMeta, shardMetas: ShardMeta[], rs: boolean): CreateEntryFromFrameBody;
export {};
