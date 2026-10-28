interface RetryLensOptions {
    /** Your project API key (rl_live_...) */
    apiKey: string;
    /** Base URL of your RetryLens API (e.g. https://api.retrylensai.com) */
    baseUrl: string;
    /** Environment name */
    environment?: string;
    /** Release / version */
    release?: string;
    /** Disable sending in development */
    enabled?: boolean;
}
interface CaptureContext {
    extra?: Record<string, any>;
    tags?: Record<string, string>;
    user?: {
        id?: string;
        email?: string;
        [key: string]: any;
    };
    request?: {
        method?: string;
        path?: string;
        headers?: Record<string, any>;
        body?: any;
    };
}
declare class RetryLensClient {
    private client;
    private options;
    constructor(options: RetryLensOptions);
    captureException(error: unknown, context?: CaptureContext): Promise<void>;
    captureMessage(message: string, context?: CaptureContext): Promise<void>;
    private sanitize;
}
declare const RetryLens: {
    init(options: RetryLensOptions): RetryLensClient;
    captureException(error: unknown, context?: CaptureContext): Promise<void> | undefined;
    captureMessage(message: string, context?: CaptureContext): Promise<void> | undefined;
};
declare class RetryLensExceptionFilter {
    catch(exception: any, host: any): void;
}

export { RetryLens, RetryLensExceptionFilter };
export type { CaptureContext, RetryLensOptions };
