import { eachLimit } from 'async';
import cloneable from 'cloneable-readable';
import { randomBytes } from 'crypto';
import { Readable } from 'stream';

import { ripemd160, sha256 } from './crypto';
import { HashStream } from './hasher';
import { ContentAccessor } from './upload/StreamsFileSystemStrategy';

interface MerkleTree {
  leaf: string[];
  challenges: Buffer[];
  challenges_as_str: string[];
  preleaf: Buffer[];
}

function generateChallenges(nChallenges: number): Buffer[] {
  const challenges: Buffer[] = [];

  for (let i = 0; i < nChallenges; i++) {
    challenges.push(randomBytes(16));
  }

  return challenges;
}

function generatePreleaf(encrypted: Readable, challenge: Buffer): Promise<Buffer> {
  const hashStream = new HashStream();

  hashStream.write(challenge);

  return new Promise((resolve, reject) => {
    encrypted.pipe(hashStream)
      .on('data', () => {})
      .on('error', (err) => {
        reject(err);
      })
      .on('end', () => {
        resolve(hashStream.getHash());
      });
  });
}

function generatePreleaves(encrypted: ContentAccessor, challenges: Buffer[]): Promise<Buffer[]> {
  const preleaves: Buffer[] = [];

  return eachLimit(challenges, 1, (challenge, next) => {
    generatePreleaf(encrypted.getStream(), challenge)
      .then((preleaf) => {
        preleaves.push(preleaf);
        next();
      }).catch((err) => {
        next(err);
      });
  }).then(() => {
    return preleaves;
  });
}

function generateLeaf(preleaf: Buffer): Buffer {
  return ripemd160(sha256(preleaf));
}

function generateLeaves(preleaves: Buffer[]): Buffer[] {
  return preleaves.map(generateLeaf);
}

export function generateMerkleTree(): MerkleTree {
  return {
    leaf: [
      '0000000000000000000000000000000000000000',
      '0000000000000000000000000000000000000000',
      '0000000000000000000000000000000000000000',
      '0000000000000000000000000000000000000000'
    ],
    challenges: [
      Buffer.from('00000000000000000000000000000000', 'hex'),
      Buffer.from('00000000000000000000000000000000', 'hex'),
      Buffer.from('00000000000000000000000000000000', 'hex'),
      Buffer.from('00000000000000000000000000000000', 'hex')
    ],
    challenges_as_str: [
      '00000000000000000000000000000000',
      '00000000000000000000000000000000',
      '00000000000000000000000000000000',
      '00000000000000000000000000000000'
    ],
    preleaf: [
      Buffer.from('0000000000000000000000000000000000000000', 'hex'),
      Buffer.from('0000000000000000000000000000000000000000', 'hex'),
      Buffer.from('0000000000000000000000000000000000000000', 'hex'),
      Buffer.from('0000000000000000000000000000000000000000', 'hex')
    ]
  };
}
