/// <reference types="node" />
export declare class DecryptStream {
    private currentIndex;
    private decipher;
    private SFiles;
    constructor(key: Buffer, iv: Buffer);
}
export default DecryptStream;
