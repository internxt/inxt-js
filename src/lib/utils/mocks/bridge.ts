// export class Bridge {
//     handleExchangeReport (report, callback) {
//         const { dataHash, exchangeResultMessage } = report;
//         switch (exchangeResultMessage) {
//           case 'MIRROR_SUCCESS':
//           case 'SHARD_UPLOADED':
//           case 'MIRROR_FAILED':
//           case 'TRANSFER_FAILED':
//           case 'DOWNLOAD_ERROR':
//             this._triggerMirrorEstablish(constants.M_REPLICATE, dataHash, callback);
//             break;
//           case 'SHARD_DOWNLOADED':
//             this._triggerMirrorEstablish(constants.M_REPLICATE, dataHash, callback);
//             break;
//           default:
//             callback(new Error('Exchange result type will not trigger action'));
//         }
//     }
// }

// export class Report {

// }

// createExchangeReport