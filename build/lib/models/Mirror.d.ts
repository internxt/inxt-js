import { Farmer } from ".";
export interface Mirror {
    index: number;
    replaceCount: number;
    hash: string;
    size: number;
    parity: boolean;
    token: string;
    healthy?: boolean;
    farmer: Farmer;
    operation: string;
}
