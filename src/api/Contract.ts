import { ContractNegotiated } from '../lib/contracts';

export class Contract {
  static buildRequestUrl(contract: ContractNegotiated) {
    return `http://${contract.farmer.address}:${contract.farmer.port}/upload/link/${contract.hash}`;
  }
}
