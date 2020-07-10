import { ExchangeReport } from '../src/api/reports'
import { Environment } from '../src';
import { expect } from 'chai';

process.on('unhandledRejection', (reason, p) => {
  console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
});

describe('# Exchange Reports', () => {
  it('should not be valid report if unfilled', () => {
    const inxt = new Environment({
      bridgeUser: 'test@test.com',
      bridgePass: 'dummy_password'
    })
    const er = new ExchangeReport(inxt.config)

    expect(er.validate()).to.be.false
  })

  it('should validate report', () => {
    const inxt = new Environment({
      bridgeUser: 'test@test.com',
      bridgePass: 'dummy_password'
    })
    const er = new ExchangeReport(inxt.config)
    er.params.dataHash = "test"
    er.params.farmerId = inxt.config.bridgeUser

    // FAILURE CODE + FAILURE MESSAGE = OK
    er.params.exchangeResultCode = ExchangeReport.INXT_REPORT_FAILURE
    er.params.exchangeResultMessage = ExchangeReport.INXT_REPORT_FAILED_INTEGRITY
    expect(er.validate()).to.be.true
    er.params.exchangeResultMessage = ExchangeReport.INXT_REPORT_DOWNLOAD_ERROR
    expect(er.validate()).to.be.true
    er.params.exchangeResultMessage = ExchangeReport.INXT_REPORT_TRANSFER_FAILED
    expect(er.validate()).to.be.true
    er.params.exchangeResultMessage = ExchangeReport.INXT_REPORT_MIRROR_FAILED
    expect(er.validate()).to.be.true
    er.params.exchangeResultMessage = ExchangeReport.INXT_REPORT_READ_FAILED
    expect(er.validate()).to.be.true

    // SUCCESS CODE + SUCCESS MESSAGE = OK
    er.params.exchangeResultCode = ExchangeReport.INXT_REPORT_SUCCESS
    er.params.exchangeResultMessage = ExchangeReport.INXT_REPORT_SHARD_DOWNLOADED
    expect(er.validate()).to.be.true
    er.params.exchangeResultMessage = ExchangeReport.INXT_REPORT_SHARD_UPLOADED
    expect(er.validate()).to.be.true
    er.params.exchangeResultMessage = ExchangeReport.INXT_REPORT_MIRROR_SUCCESS
    expect(er.validate()).to.be.true
    er.params.exchangeResultMessage = ExchangeReport.INXT_REPORT_SHARD_EXISTS
    expect(er.validate()).to.be.true

    // FAILURE CODE + SUCCESS MESSAGE = WRONG
    er.params.exchangeResultCode = ExchangeReport.INXT_REPORT_FAILURE
    er.params.exchangeResultMessage = ExchangeReport.INXT_REPORT_SHARD_DOWNLOADED
    expect(er.validate()).to.be.false
    er.params.exchangeResultMessage = ExchangeReport.INXT_REPORT_SHARD_UPLOADED
    expect(er.validate()).to.be.false
    er.params.exchangeResultMessage = ExchangeReport.INXT_REPORT_MIRROR_SUCCESS
    expect(er.validate()).to.be.false
    er.params.exchangeResultMessage = ExchangeReport.INXT_REPORT_SHARD_EXISTS
    expect(er.validate()).to.be.false

    // SUCCESS CODE + FAILURE MESSAGE = WRONG
    er.params.exchangeResultCode = ExchangeReport.INXT_REPORT_SUCCESS
    er.params.exchangeResultMessage = ExchangeReport.INXT_REPORT_FAILED_INTEGRITY
    expect(er.validate()).to.be.false
    er.params.exchangeResultMessage = ExchangeReport.INXT_REPORT_DOWNLOAD_ERROR
    expect(er.validate()).to.be.false
    er.params.exchangeResultMessage = ExchangeReport.INXT_REPORT_TRANSFER_FAILED
    expect(er.validate()).to.be.false
    er.params.exchangeResultMessage = ExchangeReport.INXT_REPORT_MIRROR_FAILED
    expect(er.validate()).to.be.false
    er.params.exchangeResultMessage = ExchangeReport.INXT_REPORT_READ_FAILED
    expect(er.validate()).to.be.false
  })
})