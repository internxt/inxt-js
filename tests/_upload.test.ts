import { Environment } from "../src";
import { ServerShutdownFunction, startServer as startFarmer } from "./shard-server";
import { startServer as startBridge } from './bridge-server';
import { parse } from "path";
import { expect } from "chai";
import { HashStream } from "../src/lib/hasher";
import { createReadStream } from "fs";

/**
 * This is an adhoc test that will ensure upload / download entire process 
 * is not broken. 
 * 
 * To make this test work, and until the library allows proxy params injection
 * you have to follow this steps: 
 * 
 * - DownloadShardRequest() -> change api.streamRequest params to useProxy from true to false
 * - request.ts -> L53: Change https for http library
 * - api.ts -> sendShardToNode() -> change L248 params to useProxy from true to false
 */

const testFiles = [
  '100k.dat',
  // '2m.dat', // fileSize == shardSize
  // '3m.dat', // fileSize > shardSize
  // '4m.dat', // fileSize == shardSize * 2
  // '4_5m.dat', // fileSize > shardSize * 2 
  // '6m.dat', // fileSize == shardSize * 3,
  // '7m.dat', // fileSize == shardSize * 3 + 1
  // '10m.dat'
  // '500m.dat',
  // '1G.dat',
  // '5G.dat',
  // '10G.dat'
];

const minimumShardSize = 2 * 1024 * 1024; // 2Mb
const farmerPort = 6000;
const bridgePort = 6382;
const bridgeUrl = 'http://localhost:' + bridgePort

const bucketId = process.env.BUCKET_ID;
const network = new Environment({
  bridgePass: '',
  bridgeUser: '',
  bridgeUrl,
  encryptionKey: 'test test test test test test test test test test test test test test test test test test test test test test test test'
});

// 1. Start a server on 6382 with an upload & download endpoint;
// 2. 
let shutdown: ServerShutdownFunction;

before((done) => {
  let shutdownBridge: ServerShutdownFunction;
  let shutdownFarmer: ServerShutdownFunction;

  new Promise((resolve, reject) => {
    startBridge(bridgePort, farmerPort, (err, shutdownBridgeFn) => {
      shutdownBridge = shutdownBridgeFn;

      if (err) {
        return reject(err);
      }
  
      resolve(null);
    });
  }).then(() => {
    return new Promise((resolve, reject) => {
      startFarmer(farmerPort, (err, shutdownFarmerFn) => {
        shutdownFarmer = shutdownFarmerFn;

        if (err) {
          return reject(err);
        }

        resolve(null);
      });
    });
  }).then(() => {
    shutdown = (cb: (err: Error | null) => void) => {
      shutdownBridge(console.log);
      shutdownFarmer(console.log)
    };
    done();
  }).catch((err) => {
    if (shutdownFarmer) {
      shutdownFarmer((err) => {
        console.log(err);
      });
    }

    if (shutdownBridge) {
      shutdownBridge((err) => {
        console.log(err);
      });
    }

    done(err);
  });
});

after((done) => {
  console.log('shutting down servers');
  shutdown(done);
});

describe('# Upload tests', () => {
  describe('Entire process', () => {
    it('Should upload & download', async function () {
      this.timeout(Infinity);
      try {
        for (const testFilePath of testFiles) {
          await new Promise((resolve: (fileId: string) => void, reject) => {
            network.storeFile(bucketId, testFilePath, {
              progressCallback: (progress: number) => {},
              finishedCallback: (err: Error | null, fileId: string) => {
                if (err) {
                  return reject(err);
                }

                resolve(fileId);
              }
            })
          }).then((fileId) => {
            const { name, ext } = parse(testFilePath);
            const downloadedFilePath = name + 'down' + ext

            return new Promise((resolve: (downloadedFilePath: string) => void, reject) => {
              network.resolveFile(bucketId, fileId, downloadedFilePath, {
                progressCallback: (progress) => {},
                finishedCallback: (err) => {
                  expect(err).to.be.null;
                  resolve(downloadedFilePath);
                }
              });
            });
          }).then((downloadedFilePath) => {
            console.log('llego aqui');
            const uploadedFile = createReadStream(testFilePath);
            const downloadedFile = createReadStream(downloadedFilePath);

            const uploadHasher = new HashStream();
            const downloadHasher = new HashStream();

            const hashingUpload = new Promise((resolve, reject) => {
              uploadedFile.pipe(uploadHasher)
                .on('data', () => {})
                .once('error', reject).once('end', resolve);
            });

            const hashingDownload = new Promise((resolve, reject) => {
              downloadedFile.pipe(downloadHasher)
                .on('data', () => {})
                .once('error', reject).once('end', resolve);
            });

            Promise.all([ hashingUpload, hashingDownload ]).then(() => {
              const uploadHash = uploadHasher.getHash().toString('hex');
              const downloadHash = downloadHasher.getHash().toString('hex');

              console.log('FILE %s', testFilePath);
              console.log('[U] %s', uploadHash);
              console.log('[D] %s', downloadHash);

              expect(uploadHash).to.equal(downloadHash);
            });
          });
        }
      } catch (err) {
        console.error(err);
      }
    });
  });
});