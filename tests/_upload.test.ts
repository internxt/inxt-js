import { Environment } from "../src";
import { ServerShutdownFunction, startServer as startFarmer } from "./shard-server";
import { startServer as startBridge } from './bridge-server';

const testFiles = [
  '100k.dat',
  '2m.dat', // fileSize == shardSize
  '3m.dat', // fileSize > shardSize
  '4m.dat', // fileSize == shardSize * 2
  '4_5m.dat', // fileSize > shardSize * 2 
  '6m.dat', // fileSize == shardSize * 3,
  '7m.dat', // fileSize == shardSize * 3 + 1
  '500m.dat',
  '1G.dat',
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
    startBridge(bridgePort, (err, shutdownBridgeFn) => {
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
  shutdown(done);
});

describe('# Upload tests', () => {
  describe('Entire process', () => {
    it('Should upload & download', async () => {
      try {
        for (const testFilePath of testFiles) {
          await new Promise((resolve, reject) => {
            const state = network.storeFile(bucketId, testFilePath, {
              progressCallback: (progress: number) => {},
              finishedCallback: (err: Error | null, fileId: string) => {
                if (err) {
                  return reject(err);
                }

                resolve(fileId);
              }
            })
          });
        }
      } catch (err) {
        console.error(err);
      }
    });
  });
});