/// <reference types="node" />
import { EventEmitter } from "stream";
import { EnvironmentConfig } from "./";
import { FileObjectUploadProtocol } from "./FileObjectUploadProtocol";
import { CreateEntryFromFrameBody, CreateEntryFromFrameResponse, InxtApiI } from "../services/api";
import { UploadStrategy } from "../lib/core";
import { Abortable } from "./Abortable";
interface ShardMeta {
    hash: string;
    size: number;
    index: number;
    parity: boolean;
    challenges?: Buffer[];
    challenges_as_str: string[];
    tree: string[];
}
export declare class FileObjectUpload extends EventEmitter implements FileObjectUploadProtocol, Abortable {
    private name;
    private config;
    private requests;
    private id;
    private aborted;
    private api;
    private uploader;
    iv: Buffer;
    index: Buffer;
    frameId: string;
    bucketId: string;
    fileEncryptionKey: Buffer;
    constructor(config: EnvironmentConfig, name: string, bucketId: string, uploader: UploadStrategy, api?: InxtApiI);
    getId(): string;
    checkIfIsAborted(): void;
    init(): Promise<FileObjectUpload>;
    checkBucketExistence(): Promise<boolean>;
    stage(): Promise<void>;
    SaveFileInNetwork(bucketEntry: CreateEntryFromFrameBody): Promise<CreateEntryFromFrameResponse>;
    GenerateHmac(shardMetas: ShardMeta[]): string;
    upload(): Promise<ShardMeta[]>;
    createBucketEntry(shardMetas: ShardMeta[]): Promise<void>;
    abort(): void;
    isAborted(): boolean;
}
export declare function generateBucketEntry(fileObject: FileObjectUpload, filename: string, shardMetas: ShardMeta[], rs: boolean): CreateEntryFromFrameBody;
export {};
