export interface Farmer {
    userAgent: string;
    protocol: string;
    address: string;
    port: number;
    nodeID: string;
    lastSeen: Date;
}
