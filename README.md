# @justack/sdk

Typesafe human-in-the-loop API for AI agents. Ask humans questions with typed inputs, get typed responses.

```typescript
const session = await client.sessions.create({
  name: 'Deploy',
  recipients: [{ email: 'reviewer@company.com' }],
});

const { env, approve } = await session.ask('Ship it?', {
  inputs: [
    { type: 'select', name: 'env', options: ['staging', 'production'] },
    { type: 'confirm', name: 'approve' },
  ] as const,
});
// env: string, approve: boolean — inferred from inputs
```

## Installation

```bash
npm install @justack/sdk
```

## Core Concepts

### Recipients

Recipients are the humans who receive messages and respond to questions. Create recipients and share their inbox URL:

```typescript
// Create a recipient
const recipient = await client.recipients.create({
  name: 'John Doe',
  email: 'john@example.com',  // optional
  externalId: 'user-123',     // optional, for your reference
});

// Get invite URL (magic link for authentication)
const { url } = await client.recipients.getInviteUrl(recipient.recipientId);

// List all recipients
for await (const r of client.recipients.list()) {
  console.log(r.name, r.recipientId);
}
```

### Sessions

Sessions are conversations between your agent and recipients:

```typescript
// Create a session with recipients
const session = await client.sessions.create({
  name: 'Code Review',
  recipients: [recipient.recipientId],  // can include multiple
  notify: true,  // send push notification
});

// Resume an existing session
const session = await client.sessions.resume('ses_xxx');

// Get session info without WebSocket
const data = await client.sessions.get('ses_xxx');

// List all sessions
for await (const s of client.sessions.list()) {
  console.log(s.name, s.sessionId);
}

// Delete a session
await client.sessions.delete('ses_xxx');
```

### Logging

Send log messages to keep humans informed:

```typescript
// Markdown supported
await session.log('## Step 1: Fetching data\n\nConnecting to database...');

// Ephemeral messages (not persisted)
await session.log('Processing item 1/100...', { persist: false });
```

### Asking Questions

Ask questions with typed inputs and get typed responses:

```typescript
// Text input
const { name } = await session.ask('What is your name?', {
  inputs: [{
    type: 'text',
    name: 'name',
    label: 'Your name',
    placeholder: 'Enter name...',
  }] as const,
});

// Confirmation
const { proceed } = await session.ask('Continue?', {
  inputs: [{
    type: 'confirm',
    name: 'proceed',
    label: 'Yes, continue',
    defaultValue: true,
  }] as const,
});

// Select from options
const { env } = await session.ask('Choose environment', {
  inputs: [{
    type: 'select',
    name: 'env',
    label: 'Environment',
    options: ['staging', 'production'],
  }] as const,
});

// Select with labels
const { tier } = await session.ask('Select plan', {
  inputs: [{
    type: 'select',
    name: 'tier',
    options: [
      { value: 'free', label: 'Free - $0/mo' },
      { value: 'pro', label: 'Pro - $10/mo' },
    ],
  }] as const,
});

// Multiple inputs at once
const { username, newsletter, theme } = await session.ask('Settings', {
  inputs: [
    { type: 'text', name: 'username', required: true },
    { type: 'confirm', name: 'newsletter' },
    { type: 'select', name: 'theme', options: ['light', 'dark'] },
  ] as const,
});
```

### Reading Messages

List all messages in a session:

```typescript
for await (const message of session.messages()) {
  console.log(`[${message.role}] ${message.content}`);
  if (message.type === 'ask' && message.responseContent) {
    console.log(`  Response: ${message.responseContent}`);
  }
}
```

### Cleanup

Always close sessions when done:

```typescript
try {
  await session.log('Starting...');
  const response = await session.ask('Ready?', { inputs: [...] as const });
  // ... do work ...
} finally {
  session.close();
}
```

## Error Handling

```typescript
import {
  JustackClient,
  NotFoundError,
  UnauthorizedError,
  TimeoutError,
  SessionExpiredError,
  JustackError,
} from '@justack/sdk';

try {
  const response = await session.ask('Approve?', {
    inputs: [{ type: 'confirm', name: 'ok' }] as const,
    timeout: 60000,  // 1 minute timeout
  });
} catch (error) {
  if (error instanceof TimeoutError) {
    console.log('Human did not respond in time');
  } else if (error instanceof SessionExpiredError) {
    console.log('Session expired');
  } else if (error instanceof NotFoundError) {
    console.log('Session not found');
  } else if (error instanceof UnauthorizedError) {
    console.log('Invalid API key');
  } else if (error instanceof JustackError) {
    console.log(`API error: ${error.message}`);
  }
}
```

### Error Types

| Error Class | Description |
|-------------|-------------|
| `BadRequestError` | Invalid request parameters |
| `UnauthorizedError` | Invalid or missing API key |
| `ForbiddenError` | Insufficient permissions |
| `NotFoundError` | Resource not found |
| `PaymentRequiredError` | Usage limit exceeded |
| `RateLimitedError` | Rate limit exceeded |
| `NetworkError` | Network failure |
| `TimeoutError` | Request or ask timeout |
| `WebSocketError` | WebSocket connection failure |
| `SessionExpiredError` | Session has expired |

## Client Options

```typescript
const client = new JustackClient({
  apiKey: 'jstk_xxx',  // required
  baseUrl: 'https://api.justack.dev/v1',  // optional
  timeout: 30000,  // request timeout in ms
  fetch: customFetch,  // custom fetch implementation
});
```

## Utilities

```typescript
import { collect } from '@justack/sdk';

// Collect all items from paginated list
const allSessions = await collect(client.sessions.list());
const allRecipients = await collect(client.recipients.list());
```

## Examples

See the [examples](./examples) directory for complete working examples:

- [`hitl.ts`](./examples/hitl.ts) - Human-in-the-loop approval flow
- [`ping-pong.ts`](./examples/ping-pong.ts) - Back-and-forth conversation

Run examples:

```bash
JUSTACK_API_KEY=jstk_xxx npx tsx examples/hitl.ts
```

## License

MIT
