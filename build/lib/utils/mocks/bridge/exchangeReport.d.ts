import { ExchangeReport } from "../../../../api/reports";
export declare class ExchangeReportMock {
    exchangeReport: ExchangeReport;
    constructor(er: ExchangeReport);
    expectedResultCode(): number;
    validate(): boolean;
    sendReport(): Promise<boolean>;
    DownloadOk(): void;
    DownloadError(): void;
    static randomReport(): ExchangeReport;
}
