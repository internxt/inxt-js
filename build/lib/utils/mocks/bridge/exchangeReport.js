"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExchangeReportMock = void 0;
var crypto_1 = require("crypto");
var reports_1 = require("../../../../api/reports");
var ExchangeReportMock = /** @class */ (function () {
    function ExchangeReportMock(er) {
        this.exchangeReport = er;
    }
    ExchangeReportMock.prototype.expectedResultCode = function () {
        return this.exchangeReport.expectedResultCode();
    };
    ExchangeReportMock.prototype.validate = function () {
        return this.exchangeReport.validate();
    };
    ExchangeReportMock.prototype.sendReport = function () {
        if (!this.validate()) {
            return Promise.reject(Error('Not valid report to send'));
        }
        return Promise.resolve(true);
    };
    ExchangeReportMock.prototype.DownloadOk = function () {
        this.exchangeReport.DownloadOk();
    };
    ExchangeReportMock.prototype.DownloadError = function () {
        this.exchangeReport.DownloadError();
    };
    ExchangeReportMock.randomReport = function () {
        var bridgeUrl = 'fake/url';
        var bridgeUser = 'fakeUser';
        var bridgePass = 'fakePass';
        var encryptionKey = crypto_1.randomBytes(32).toString('hex');
        var config = { bridgeUrl: bridgeUrl, bridgeUser: bridgeUser, bridgePass: bridgePass, encryptionKey: encryptionKey };
        return new reports_1.ExchangeReport(config);
    };
    return ExchangeReportMock;
}());
exports.ExchangeReportMock = ExchangeReportMock;
