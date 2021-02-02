// req object for put a frame
export interface ShardMeta {
  hash: string,
  size: number,
  index: number,
  parity: boolean,
  challenges: string[],
  tree: string[]
  exclude: any
}
