# RetryLens AI SDK

The official JavaScript/TypeScript SDK for **RetryLens AI**, a platform for monitoring and tracking application errors in real time.

RetryLens helps developers capture application exceptions and messages from their applications and send them to the RetryLens API for monitoring and debugging.

## Features

- Capture application exceptions.
- Capture custom error messages.
- Send error events to the RetryLens API.
- Configure your API key, environment, and release.
- Integrate with Node.js and TypeScript applications.

## Requirements

- Node.js
- A RetryLens account and valid API key
- A connected application or project in RetryLens

## Installation

Install the SDK in your project:

```bash
npm install @retrylensai/sdk
```

## Configuration

Initialize RetryLens when your application starts:

```typescript
import { RetryLens } from '@retrylensai/sdk';

RetryLens.init({
  apiKey: process.env.RETRYLENS_API_KEY!,
  baseUrl: process.env.RETRYLENS_BASE_URL!,
  environment: process.env.NODE_ENV || 'development',
  release: '1.0.0',
});
```

Add the following environment variables to your `.env` file:

```env
RETRYLENS_API_KEY=your_retrylens_api_key
RETRYLENS_BASE_URL=https://your-retrylens-api-url
NODE_ENV=development
```

Keep your API key private. Do not commit real credentials to version control.

## Capturing Errors

Capture an exception:

```typescript
try {
  // Your application logic
  throw new Error('Something went wrong');
} catch (error) {
  RetryLens.captureException(error);
}
```

Capture a custom message:

```typescript
RetryLens.captureMessage('Payment processing failed');
```

Captured events are sent to the configured RetryLens API. They will appear in your dashboard only if your API accepts the request and processes the event successfully.

## NestJS Integration

Initialize the SDK in your NestJS application's `main.ts` before starting the server.

```typescript
import { RetryLens } from '@retrylensai/sdk';

// Inside your bootstrap function, before app.listen()
RetryLens.init({
  apiKey: process.env.RETRYLENS_API_KEY!,
  baseUrl: process.env.RETRYLENS_BASE_URL!,
  environment: process.env.NODE_ENV || 'development',
});
```

You can then call `RetryLens.captureException(error)` from your exception-handling logic.

## Development

Clone the SDK repository and install its dependencies:

```bash
npm install
```

Build the package:

```bash
npm run build
```

Run the development build in watch mode:

```bash
npm run dev
```

## Contributing

Contributions, bug reports, and feature suggestions are welcome. Please open an issue or submit a pull request through the project repository.

## License

Specify the license for this package here.
