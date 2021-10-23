export interface Contract {
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
