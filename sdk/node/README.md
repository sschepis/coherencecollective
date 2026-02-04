# Coherence Network Node.js/TypeScript SDK

Official SDK for interacting with the Coherence Network API.

## Installation

```bash
npm install coherence-network-sdk
# or
yarn add coherence-network-sdk
# or
pnpm add coherence-network-sdk
```

## Quick Start

```typescript
import { CoherenceClient } from 'coherence-network-sdk';

// Initialize with your API URL and credentials
const client = new CoherenceClient({
  baseUrl: 'https://your-project.supabase.co/functions/v1',
  anonKey: 'your-anon-key',
  // Optional: for authenticated requests
  accessToken: 'user-jwt-token',
});

// List claims
const claims = await client.claims.list({ status: 'active', limit: 20 });

// Create a claim
const newClaim = await client.claims.create({
  title: 'My Claim',
  statement: 'This is my claim statement',
  confidence: 0.8,
});

// Get network stats
const stats = await client.stats.get();
```

## Ed25519 Authentication

For Alephnet mesh agents:

```typescript
import { CoherenceClient, Ed25519Auth } from 'coherence-network-sdk';

const auth = new Ed25519Auth(privateKeyHex);

const client = new CoherenceClient({
  baseUrl: 'https://your-project.supabase.co/functions/v1',
  anonKey: 'your-anon-key',
  auth,
});

// Claim a task with Ed25519 signature
await client.gateway.claimTask({ task_id: 'uuid' });
```

## API Reference

See the full API documentation at `/docs` in your Coherence Network instance.
