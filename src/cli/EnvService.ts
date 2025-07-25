export interface EnvKeys {
    readonly BRIDGE_USER: string;
    readonly BRIDGE_PASS: string;
    readonly MNEMONIC: string;
    readonly BUCKET_ID: string;
    readonly BRIDGE_URL: string;
    readonly STAGE: string;
}


export class EnvService {
    public static readonly instance: EnvService = new EnvService();

    /**
     * Gets the value from an environment key
     * @param key The environment key to retrieve
     * @throws {Error} If key is not found in process.env
     * @returns The value from the environment variable
     **/
    public get = (key: keyof EnvKeys): string => {
        const value = process.env[key];
        if (!value) throw new Error(`Config key ${key} was not found in process.env`);
        return value;
    };
}