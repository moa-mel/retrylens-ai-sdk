import axios, { AxiosInstance } from 'axios';
import { randomUUID } from 'crypto';

export interface RetryLensOptions {
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

export interface CaptureContext {
  extra?: Record<string, any>;
  tags?: Record<string, string>;
  user?: { id?: string; email?: string; [key: string]: any };
  request?: {
    method?: string;
    path?: string;
    headers?: Record<string, any>;
    body?: any;
  };
}

class RetryLensClient {
  private client: AxiosInstance;
  private options: Required<RetryLensOptions>;

  constructor(options: RetryLensOptions) {
    this.options = {
      environment: 'production',
      release: 'unknown',
      enabled: true,
      ...options,
    };

    this.client = axios.create({
      baseURL: this.options.baseUrl.replace(/\/$/, ''),
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.options.apiKey,
      },
      timeout: 8000,
    });
  }

  async captureException(error: unknown, context: CaptureContext = {}) {
    if (!this.options.enabled) return;

    const err = error instanceof Error ? error : new Error(String(error));

    const payload = {
      title: `${err.name}: ${err.message}`.slice(0, 200),
      method: context.request?.method || 'UNKNOWN',
      path: context.request?.path || '/unknown',
      statusCode: 500,
      requestId: randomUUID(),
      headers: this.sanitize(context.request?.headers || {}),
      payload: this.sanitize(context.request?.body || {}),
      responseBody: {
        error: err.message,
        name: err.name,
      },
      logs: [
        err.stack || err.message,
        `environment: ${this.options.environment}`,
        `release: ${this.options.release}`,
        ...(context.extra ? [JSON.stringify(context.extra)] : []),
      ],
      scenario: 'http_server_error',
    };

    try {
      await this.client.post('/api/v1/incidents/ingest', payload);
    } catch (e) {
      // Never let the SDK crash the host application
      console.error('[RetryLens] Failed to send incident', e);
    }
  }

  async captureMessage(message: string, context: CaptureContext = {}) {
    return this.captureException(new Error(message), context);
  }

  private sanitize(obj: any): any {
    if (!obj || typeof obj !== 'object') return obj;

    const sensitive = /password|secret|token|authorization|cookie|api[-_]?key|credential/i;

    return Object.fromEntries(
      Object.entries(obj).map(([key, value]) => [
        key,
        sensitive.test(key) ? '[REDACTED]' : value,
      ]),
    );
  }
}

// Singleton
let client: RetryLensClient | null = null;

export const RetryLens = {
  init(options: RetryLensOptions) {
    client = new RetryLensClient(options);
    return client;
  },

  captureException(error: unknown, context?: CaptureContext) {
    if (!client) {
      console.warn('[RetryLens] SDK not initialized. Call RetryLens.init() first.');
      return;
    }
    return client.captureException(error, context);
  },

  captureMessage(message: string, context?: CaptureContext) {
    if (!client) {
      console.warn('[RetryLens] SDK not initialized. Call RetryLens.init() first.');
      return;
    }
    return client.captureMessage(message, context);
  },
};

// NestJS Exception Filter
export class RetryLensExceptionFilter {
  catch(exception: any, host: any) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest();
    const response = ctx.getResponse();

    const status = exception?.getStatus?.() || exception?.status || 500;

    // Only report server errors by default
    if (status >= 500) {
      RetryLens.captureException(exception, {
        request: {
          method: request.method,
          path: request.url,
          headers: request.headers,
          body: request.body,
        },
      });
    }

    // Re-throw so Nest can still handle the response
    throw exception;
  }
}