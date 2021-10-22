export interface ShardMeta {
  hash: string;
  size: number; // size of the actual file
  index: number;
  parity: boolean;
  challenges?: Buffer[];
  challenges_as_str: string[];
  tree: string[];
  exclude?: any;
}
