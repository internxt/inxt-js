export interface ContractMeta {
    hash: string;
    token: string;
    operation: 'PUSH';
    farmer: {
        userAgent: string;
        protocol: string;
        address: string;
        port: number;
        nodeID: string;
        lastSeen: number;
    };
}
export declare class Contract {
    static buildRequestUrl(contract: ContractMeta): string;
}
