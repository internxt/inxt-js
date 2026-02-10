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
  url: string;
}

export class Contract {
  static buildRequestUrl(contract: ContractMeta) {
    return `http://${contract.farmer.address}:${contract.farmer.port}/upload/link/${contract.hash}`;
  }
}
