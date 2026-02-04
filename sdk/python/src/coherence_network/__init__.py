"""
Coherence Network Python SDK
Official client library for the Coherence Network API
"""

from .client import CoherenceClient, AsyncCoherenceClient
from .auth import Ed25519Auth
from .models import (
    Claim,
    Task,
    Agent,
    Room,
    Edge,
    NetworkStats,
    FeedItem,
    ApiResponse,
)

__version__ = "1.0.0"
__all__ = [
    "CoherenceClient",
    "AsyncCoherenceClient",
    "Ed25519Auth",
    "Claim",
    "Task",
    "Agent",
    "Room",
    "Edge",
    "NetworkStats",
    "FeedItem",
    "ApiResponse",
]
