"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExchangeReport = void 0;
var request_1 = require("../services/request");
var ExchangeReport = /** @class */ (function () {
    function ExchangeReport(config) {
        this.config = config;
        this.params = {
            dataHash: null,
            reporterId: config.bridgeUser,
            farmerId: null,
            clientId: config.bridgeUser,
            exchangeStart: new Date(),
            exchangeEnd: null,
            exchangeResultCode: 1000,
            exchangeResultMessage: ""
        };
    }
    ExchangeReport.prototype.expectedResultCode = function () {
        switch (this.params.exchangeResultMessage) {
            case ExchangeReport.INXT_REPORT_SHARD_DOWNLOADED:
            case ExchangeReport.INXT_REPORT_SHARD_UPLOADED:
            case ExchangeReport.INXT_REPORT_MIRROR_SUCCESS:
            case ExchangeReport.INXT_REPORT_SHARD_EXISTS:
                return ExchangeReport.INXT_REPORT_SUCCESS;
            case ExchangeReport.INXT_REPORT_FAILED_INTEGRITY:
            case ExchangeReport.INXT_REPORT_DOWNLOAD_ERROR:
            case ExchangeReport.INXT_REPORT_TRANSFER_FAILED:
            case ExchangeReport.INXT_REPORT_MIRROR_FAILED:
            case ExchangeReport.INXT_REPORT_READ_FAILED:
                return ExchangeReport.INXT_REPORT_FAILURE;
            default:
                return 0;
        }
    };
    ExchangeReport.prototype.validate = function () {
        var expectedResultCode = this.expectedResultCode();
        if (!this.params.dataHash
            || !this.params.farmerId
            || expectedResultCode === 0
            || expectedResultCode !== this.params.exchangeResultCode) {
            return false;
        }
        return true;
    };
    ExchangeReport.prototype.sendReport = function () {
        if (this.params.exchangeEnd == null) {
            this.params.exchangeEnd = new Date();
        }
        if (!this.validate()) {
            return Promise.reject(Error('Not valid report to send'));
        }
        return request_1.request(this.config, 'POST', this.config.bridgeUrl + "/reports/exchanges", { data: this.params }, false);
    };
    ExchangeReport.prototype.DownloadOk = function () {
        this.params.exchangeResultCode = ExchangeReport.INXT_REPORT_SUCCESS;
        this.params.exchangeResultMessage = ExchangeReport.INXT_REPORT_SHARD_DOWNLOADED;
    };
    ExchangeReport.prototype.DownloadError = function () {
        this.params.exchangeResultCode = ExchangeReport.INXT_REPORT_FAILURE;
        this.params.exchangeResultMessage = ExchangeReport.INXT_REPORT_DOWNLOAD_ERROR;
    };
    ExchangeReport.prototype.UploadOk = function () {
        this.params.exchangeResultCode = ExchangeReport.INXT_REPORT_SUCCESS;
        this.params.exchangeResultMessage = ExchangeReport.INXT_REPORT_SHARD_UPLOADED;
    };
    ExchangeReport.prototype.UploadError = function () {
        this.params.exchangeResultCode = ExchangeReport.INXT_REPORT_FAILURE;
        this.params.exchangeResultMessage = ExchangeReport.INXT_REPORT_DOWNLOAD_ERROR;
    };
    ExchangeReport.INXT_REPORT_SUCCESS = 1000;
    ExchangeReport.INXT_REPORT_FAILURE = 1100;
    ExchangeReport.INXT_REPORT_SHARD_UPLOADED = 'SHARD_UPLOADED';
    ExchangeReport.INXT_REPORT_SHARD_DOWNLOADED = 'SHARD_DOWNLOADED';
    ExchangeReport.INXT_REPORT_MIRROR_FAILED = 'MIRROR_FAILED';
    ExchangeReport.INXT_REPORT_TRANSFER_FAILED = 'TRANSFER_FAILED';
    ExchangeReport.INXT_REPORT_MIRROR_SUCCESS = 'MIRROR_SUCCESS';
    ExchangeReport.INXT_REPORT_DOWNLOAD_ERROR = 'DOWNLOAD_ERROR';
    ExchangeReport.INXT_REPORT_SHARD_EXISTS = 'SHARD_EXISTS';
    ExchangeReport.INXT_REPORT_FAILED_INTEGRITY = 'FAILED_INTEGRITY';
    ExchangeReport.INXT_REPORT_READ_FAILED = 'READ_FAILED';
    return ExchangeReport;
}());
exports.ExchangeReport = ExchangeReport;
