import { randomBytes } from 'crypto'

import { ExchangeReport } from "../../../../api/reports"

export class ExchangeReportMock {
    exchangeReport: ExchangeReport;

    constructor (er: ExchangeReport) {
        this.exchangeReport = er
    }

    expectedResultCode () : number {
        return this.exchangeReport.expectedResultCode()
    }

    validate () : boolean {
        return this.exchangeReport.validate()
    }

    sendReport () : Promise<boolean> {
        if(!this.validate()) {
            return Promise.reject(Error('Not valid report to send'))
        }
        return Promise.resolve(true)
    }

    DownloadOk () : void {
        this.exchangeReport.DownloadOk()
    }

    DownloadError () : void {
        this.exchangeReport.DownloadError()
    }
    
    static randomReport () : ExchangeReport {
        const bridgeUrl = 'fake/url'
        const bridgeUser = 'fakeUser'
        const bridgePass = 'fakePass'
        const encryptionKey = randomBytes(32).toString('hex')
        const config = { bridgeUrl, bridgeUser, bridgePass, encryptionKey }
        return new ExchangeReport(config)
    }
}