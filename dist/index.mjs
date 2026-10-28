// src/index.ts
import axios from "axios";
import { randomUUID } from "crypto";
var RetryLensClient = class {
  constructor(options) {
    this.options = {
      environment: "production",
      release: "unknown",
      enabled: true,
      ...options
    };
    this.client = axios.create({
      baseURL: this.options.baseUrl.replace(/\/$/, ""),
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": this.options.apiKey
      },
      timeout: 8e3
    });
  }
  async captureException(error, context = {}) {
    if (!this.options.enabled) return;
    const err = error instanceof Error ? error : new Error(String(error));
    const payload = {
      title: `${err.name}: ${err.message}`.slice(0, 200),
      method: context.request?.method || "UNKNOWN",
      path: context.request?.path || "/unknown",
      statusCode: 500,
      requestId: randomUUID(),
      headers: this.sanitize(context.request?.headers || {}),
      payload: this.sanitize(context.request?.body || {}),
      responseBody: {
        error: err.message,
        name: err.name
      },
      logs: [
        err.stack || err.message,
        `environment: ${this.options.environment}`,
        `release: ${this.options.release}`,
        ...context.extra ? [JSON.stringify(context.extra)] : []
      ],
      scenario: "http_server_error"
    };
    try {
      await this.client.post("/api/v1/incidents/ingest", payload);
    } catch (e) {
      console.error("[RetryLens] Failed to send incident", e);
    }
  }
  async captureMessage(message, context = {}) {
    return this.captureException(new Error(message), context);
  }
  sanitize(obj) {
    if (!obj || typeof obj !== "object") return obj;
    const sensitive = /password|secret|token|authorization|cookie|api[-_]?key|credential/i;
    return Object.fromEntries(
      Object.entries(obj).map(([key, value]) => [
        key,
        sensitive.test(key) ? "[REDACTED]" : value
      ])
    );
  }
};
var client = null;
var RetryLens = {
  init(options) {
    client = new RetryLensClient(options);
    return client;
  },
  captureException(error, context) {
    if (!client) {
      console.warn("[RetryLens] SDK not initialized. Call RetryLens.init() first.");
      return;
    }
    return client.captureException(error, context);
  },
  captureMessage(message, context) {
    if (!client) {
      console.warn("[RetryLens] SDK not initialized. Call RetryLens.init() first.");
      return;
    }
    return client.captureMessage(message, context);
  }
};
var RetryLensExceptionFilter = class {
  catch(exception, host) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest();
    const response = ctx.getResponse();
    const status = exception?.getStatus?.() || exception?.status || 500;
    if (status >= 500) {
      RetryLens.captureException(exception, {
        request: {
          method: request.method,
          path: request.url,
          headers: request.headers,
          body: request.body
        }
      });
    }
    throw exception;
  }
};
export {
  RetryLens,
  RetryLensExceptionFilter
};
