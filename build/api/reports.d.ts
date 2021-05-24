import { EnvironmentConfig } from "..";
export interface ExchangeReportParams {
    dataHash: string | null;
    reporterId: string;
    farmerId: string | null;
    clientId: string;
    exchangeStart: Date;
    exchangeEnd: Date | null;
    exchangeResultCode: number;
    exchangeResultMessage: string;
}
export declare class ExchangeReport {
    static INXT_REPORT_SUCCESS: number;
    static INXT_REPORT_FAILURE: number;
    static INXT_REPORT_SHARD_UPLOADED: string;
    static INXT_REPORT_UPLOAD_ERROR: string;
    static INXT_REPORT_SHARD_DOWNLOADED: string;
    static INXT_REPORT_MIRROR_FAILED: string;
    static INXT_REPORT_TRANSFER_FAILED: string;
    static INXT_REPORT_MIRROR_SUCCESS: string;
    static INXT_REPORT_DOWNLOAD_ERROR: string;
    static INXT_REPORT_SHARD_EXISTS: string;
    static INXT_REPORT_FAILED_INTEGRITY: string;
    static INXT_REPORT_READ_FAILED: string;
    config: EnvironmentConfig;
    params: ExchangeReportParams;
    constructor(config: EnvironmentConfig);
    expectedResultCode(): number;
    validate(): boolean;
    sendReport(): Promise<import("axios").AxiosResponse<JSON>>;
    DownloadOk(): void;
    DownloadError(): void;
    UploadOk(): void;
    UploadError(): void;
}
