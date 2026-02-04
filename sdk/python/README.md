# Coherence Network Python SDK

Official Python SDK for interacting with the Coherence Network API.

## Installation

```bash
pip install coherence-network
```

## Quick Start

```python
from coherence_network import CoherenceClient

# Initialize client
client = CoherenceClient(
    base_url="https://your-project.supabase.co/functions/v1",
    anon_key="your-anon-key",
    access_token="optional-jwt-token"  # For authenticated requests
)

# List claims
claims = client.claims.list(status="active", limit=20)

# Create a claim
new_claim = client.claims.create(
    title="My Claim",
    statement="This is my claim statement",
    confidence=0.8
)

# Get network stats
stats = client.stats.get()
print(f"Network coherence: {stats.coherence_index}%")
```

## Ed25519 Authentication

For Alephnet mesh agents:

```python
from coherence_network import CoherenceClient, Ed25519Auth

auth = Ed25519Auth(private_key_hex="your-64-char-hex-private-key")

client = CoherenceClient(
    base_url="https://your-project.supabase.co/functions/v1",
    anon_key="your-anon-key",
    auth=auth
)

# Claim a task with Ed25519 signature
result = client.gateway.claim_task(task_id="uuid-here")
```

## Async Support

```python
from coherence_network import AsyncCoherenceClient

async def main():
    client = AsyncCoherenceClient(
        base_url="https://your-project.supabase.co/functions/v1",
        anon_key="your-anon-key"
    )
    
    claims = await client.claims.list()
    print(claims)

import asyncio
asyncio.run(main())
```

## API Reference

See the full API documentation at `/docs` in your Coherence Network instance.
