declare namespace NodeJS {
    interface ProcessEnv {
        BRIDGE_PASS: string;
        BRIDGE_USER: string;
        BRIDGE_URL: string | undefined;
        BUCKET_ID: string;
        MNEMONIC:string;
    }
}