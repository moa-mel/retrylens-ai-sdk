"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  RetryLens: () => RetryLens,
  RetryLensExceptionFilter: () => RetryLensExceptionFilter
});
module.exports = __toCommonJS(index_exports);
var import_axios = __toESM(require("axios"));
var import_crypto = require("crypto");
var RetryLensClient = class {
  constructor(options) {
    this.options = {
      environment: "production",
      release: "unknown",
      enabled: true,
      ...options
    };
    this.client = import_axios.default.create({
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
      requestId: (0, import_crypto.randomUUID)(),
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  RetryLens,
  RetryLensExceptionFilter
});
