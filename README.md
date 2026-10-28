# RetryLens AI SDK

The official RetryLens AI SDK for capturing and reporting application exceptions to your RetryLens dashboard.

Integrate RetryLens into a NestJS application using a dedicated `RetryLensExceptionFilter` or your existing global `AllExceptionsFilter`.

## Installation

```bash
npm install retrylensai-sdk
```

## 1. Configure environment variables

Add these variables to your application's `.env` file:

```env
RETRYLENS_API_KEY=your_retrylens_api_key
RETRYLENS_BASE_URL=https://retrylensai-api.onrender.com
NODE_ENV=development
```

Keep your API key secret. Never expose it in frontend code or commit it to version control.

## 2. Initialize RetryLens in `main.ts`

Initialize the SDK before starting your NestJS application so it is ready to capture exceptions.

```typescript
import { RetryLens } from 'retrylensai-sdk';
import createServer, { CreateServerOptions } from '@/www';
import { port, isProduction, allowedDomains } from '@/config';

async function bootstrap() {
  RetryLens.init({
    apiKey: process.env.RETRYLENS_API_KEY!,
    baseUrl: process.env.RETRYLENS_BASE_URL!,
    environment: process.env.NODE_ENV || 'development',
    release: '1.0.0',
  });

  const options: CreateServerOptions = {
    port,
    production: isProduction,
    whitelistedDomains: allowedDomains,
  };

  await createServer(options);
}

bootstrap();
```

Ensure the required environment variables are configured before starting the application.

## 3. Option A: Use the dedicated `RetryLensExceptionFilter`

Create `src/common/filters/retrylens-exception.filter.ts`:

```typescript
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { RetryLens } from 'retrylensai-sdk';

@Catch()
export class RetryLensExceptionFilter implements ExceptionFilter {
  async catch(exception: unknown, host: ArgumentsHost): Promise<void> {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    try {
      await RetryLens.captureException(exception);
    } catch (error) {
      console.error('[RetryLens] Failed to capture exception:', error);
    }

    response.status(status).json({
      statusCode: status,
      message:
        exception instanceof HttpException
          ? exception.message
          : 'Internal server error',
      path: request.url,
    });
  }
}
```

Register the filter globally if your application does not already register another global exception filter:

```typescript
app.useGlobalFilters(new RetryLensExceptionFilter());
```

If your application creates the NestJS app inside a `createServer()` function, register this filter inside that function after creating the app.

## 4. Option B: Integrate RetryLens into an existing `AllExceptionsFilter`

If your application already has a global exception filter, you can integrate RetryLens into it instead of creating a second filter.

Import the SDK:

```typescript
import { RetryLens } from 'retrylensai-sdk';
```

Inside your existing `catch()` method, add the capture logic before constructing the HTTP response:

```typescript
const status =
  exception instanceof HttpException
    ? exception.getStatus()
    : HttpStatus.INTERNAL_SERVER_ERROR;

try {
  await RetryLens.captureException(exception);
} catch (error) {
  console.error('[RetryLens] Failed to capture exception:', error);
}
```

Keep your existing response handling and custom validation logic unchanged.

For production applications, consider reporting unexpected exceptions and server errors (HTTP 5xx) rather than every expected client error. For example:

```typescript
if (
  !(exception instanceof HttpException) ||
  status >= 500
) {
  try {
    await RetryLens.captureException(exception);
  } catch (error) {
    console.error('[RetryLens] Failed to capture exception:', error);
  }
}
```

## 5. Avoid registering both filters

Use either `RetryLensExceptionFilter` or your existing `AllExceptionsFilter` with RetryLens integration.

Registering both can cause the same exception to be captured twice or alter your application's existing error response format.

## 6. Verify incident capture

1. Start your NestJS application.
2. Trigger an exception that reaches the global exception filter.
3. Check the application logs for SDK delivery failures.
4. Confirm that the ingestion API accepts the event.
5. Open your RetryLens dashboard and verify that the incident appears.

A successful SDK call alone does not guarantee that an incident was saved. Confirm that the ingestion API returned a successful response.

## License

ISC
