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

export async function generateMerkleTree(encrypted: ContentAccessor): Promise<MerkleTree> {
  const challenges = generateChallenges(4);
  const preleaves = await generatePreleaves(encrypted, challenges);
  const leaves = generateLeaves(preleaves);

  return {
    leaf: leaves.map(l => l.toString('hex')),
    challenges,
    challenges_as_str: challenges.map(c => c.toString('hex')),
    preleaf: preleaves
  };
}
