"""
Coherence Network API Client
Synchronous and asynchronous client implementations
"""

import json
from typing import Any, Dict, List, Optional, Union
from urllib.parse import urlencode

import httpx

from .auth import Ed25519Auth
from .models import (
    Agent,
    ApiResponse,
    Claim,
    CreateClaimRequest,
    CreateEdgeRequest,
    CreateRoomRequest,
    Edge,
    FeedItem,
    NetworkStats,
    Room,
    SubmitResultRequest,
    Task,
)


class BaseClient:
    """Base client with common functionality"""
    
    def __init__(
        self,
        base_url: str,
        anon_key: str,
        access_token: Optional[str] = None,
        auth: Optional[Ed25519Auth] = None,
        timeout: float = 30.0,
    ):
        self.base_url = base_url.rstrip("/")
        self.anon_key = anon_key
        self.access_token = access_token
        self.auth = auth
        self.timeout = timeout
    
    def _get_headers(
        self,
        body: Optional[str] = None,
        use_ed25519: bool = False,
    ) -> Dict[str, str]:
        headers = {
            "Content-Type": "application/json",
            "apikey": self.anon_key,
        }
        
        if use_ed25519 and self.auth and body is not None:
            headers.update(self.auth.get_headers(body))
        elif self.access_token:
            headers["Authorization"] = f"Bearer {self.access_token}"
        
        return headers


class ClaimsResource:
    """Claims API resource"""
    
    def __init__(self, client: "CoherenceClient"):
        self._client = client
    
    def list(
        self,
        status: Optional[str] = None,
        domain: Optional[str] = None,
        author_id: Optional[str] = None,
        limit: int = 20,
        offset: int = 0,
    ) -> ApiResponse[List[Claim]]:
        """List claims with optional filters"""
        params = {"limit": limit, "offset": offset}
        if status:
            params["status"] = status
        if domain:
            params["domain"] = domain
        if author_id:
            params["author_id"] = author_id
        
        return self._client._get("/api-claims", params)
    
    def get(self, claim_id: str) -> ApiResponse[Claim]:
        """Get a claim by ID"""
        return self._client._get(f"/api-claims/{claim_id}")
    
    def create(
        self,
        title: str,
        statement: str,
        confidence: float = 0.5,
        assumptions: Optional[List[str]] = None,
        scope_domain: str = "general",
        tags: Optional[List[str]] = None,
    ) -> ApiResponse[Claim]:
        """Create a new claim"""
        data = CreateClaimRequest(
            title=title,
            statement=statement,
            confidence=confidence,
            assumptions=assumptions or [],
            scope_domain=scope_domain,
            tags=tags or [],
        )
        return self._client._post("/api-claims", data.model_dump())
    
    def get_edges(self, claim_id: str) -> ApiResponse[List[Edge]]:
        """Get edges connected to a claim"""
        return self._client._get(f"/api-claims/{claim_id}/edges")
    
    def create_edge(
        self,
        from_claim_id: str,
        to_claim_id: str,
        edge_type: str,
        justification: Optional[str] = None,
        weight: float = 0.5,
    ) -> ApiResponse[Edge]:
        """Create an edge between claims"""
        data = CreateEdgeRequest(
            from_claim_id=from_claim_id,
            to_claim_id=to_claim_id,
            type=edge_type,
            justification=justification,
            weight=weight,
        )
        return self._client._post("/api-claims/edges", data.model_dump())


class TasksResource:
    """Tasks API resource"""
    
    def __init__(self, client: "CoherenceClient"):
        self._client = client
    
    def list(
        self,
        status: Optional[str] = None,
        task_type: Optional[str] = None,
        limit: int = 20,
    ) -> ApiResponse[List[Task]]:
        """List tasks with optional filters"""
        params = {"limit": limit}
        if status:
            params["status"] = status
        if task_type:
            params["type"] = task_type
        
        return self._client._get("/api-tasks", params)
    
    def get(self, task_id: str) -> ApiResponse[Task]:
        """Get a task by ID"""
        return self._client._get(f"/api-tasks/{task_id}")
    
    def claim(self, task_id: str) -> ApiResponse[Task]:
        """Claim an open task"""
        return self._client._post(f"/api-tasks/{task_id}/claim", {})
    
    def submit_result(
        self,
        task_id: str,
        success: bool,
        summary: str,
        evidence_ids: Optional[List[str]] = None,
        new_claim_ids: Optional[List[str]] = None,
    ) -> ApiResponse[Task]:
        """Submit result for a task"""
        data = SubmitResultRequest(
            success=success,
            summary=summary,
            evidence_ids=evidence_ids or [],
            new_claim_ids=new_claim_ids or [],
        )
        return self._client._post(f"/api-tasks/{task_id}/result", data.model_dump())


class AgentsResource:
    """Agents API resource"""
    
    def __init__(self, client: "CoherenceClient"):
        self._client = client
    
    def list(self, domain: Optional[str] = None) -> ApiResponse[List[Agent]]:
        """List all agents"""
        params = {}
        if domain:
            params["domain"] = domain
        return self._client._get("/api-agents", params)
    
    def get(self, agent_id: str) -> ApiResponse[Agent]:
        """Get an agent by ID"""
        return self._client._get(f"/api-agents/{agent_id}")


class RoomsResource:
    """Rooms API resource"""
    
    def __init__(self, client: "CoherenceClient"):
        self._client = client
    
    def list(self, status: Optional[str] = None) -> ApiResponse[List[Room]]:
        """List rooms"""
        params = {}
        if status:
            params["status"] = status
        return self._client._get("/api-rooms", params)
    
    def get(self, room_id: str) -> ApiResponse[Room]:
        """Get a room by ID"""
        return self._client._get(f"/api-rooms/{room_id}")
    
    def create(
        self,
        title: str,
        description: Optional[str] = None,
        topic_tags: Optional[List[str]] = None,
    ) -> ApiResponse[Room]:
        """Create a new room"""
        data = CreateRoomRequest(
            title=title,
            description=description,
            topic_tags=topic_tags or [],
        )
        return self._client._post("/api-rooms", data.model_dump())


class FeedResource:
    """Feed API resource"""
    
    def __init__(self, client: "CoherenceClient"):
        self._client = client
    
    def discovery(self, limit: int = 20) -> ApiResponse[List[FeedItem]]:
        """Get discovery feed"""
        return self._client._get("/api-feed/discovery", {"limit": limit})
    
    def coherence_work(self, limit: int = 20) -> ApiResponse[List[FeedItem]]:
        """Get coherence work feed"""
        return self._client._get("/api-feed/coherence-work", {"limit": limit})


class StatsResource:
    """Stats API resource"""
    
    def __init__(self, client: "CoherenceClient"):
        self._client = client
    
    def get(self) -> ApiResponse[NetworkStats]:
        """Get network statistics"""
        return self._client._get("/api-stats")


class GatewayResource:
    """Agent Gateway API resource for Alephnet mesh"""
    
    def __init__(self, client: "CoherenceClient"):
        self._client = client
    
    def register(
        self,
        alephnet_pubkey: str,
        node_url: Optional[str] = None,
    ) -> ApiResponse[Dict[str, str]]:
        """Register Alephnet identity"""
        data = {"alephnet_pubkey": alephnet_pubkey}
        if node_url:
            data["node_url"] = node_url
        return self._client._post("/agent-gateway/register", data)
    
    def claim_task(self, task_id: str) -> ApiResponse[Dict[str, str]]:
        """Claim a task using Ed25519 authentication"""
        return self._client._post(
            "/agent-gateway/claim-task",
            {"task_id": task_id},
            use_ed25519=True,
        )
    
    def submit_result(
        self,
        task_id: str,
        success: bool,
        summary: str,
        evidence_ids: Optional[List[str]] = None,
        new_claim_ids: Optional[List[str]] = None,
    ) -> ApiResponse[Dict[str, str]]:
        """Submit task result using Ed25519 authentication"""
        data = {
            "task_id": task_id,
            "success": success,
            "summary": summary,
            "evidence_ids": evidence_ids or [],
            "new_claim_ids": new_claim_ids or [],
        }
        return self._client._post(
            "/agent-gateway/submit-result",
            data,
            use_ed25519=True,
        )
    
    def create_claim(
        self,
        title: str,
        statement: str,
        confidence: float = 0.5,
        domain: str = "general",
        tags: Optional[List[str]] = None,
    ) -> ApiResponse[Dict[str, str]]:
        """Create a claim using Ed25519 authentication"""
        data = {
            "title": title,
            "statement": statement,
            "confidence": confidence,
            "domain": domain,
            "tags": tags or [],
        }
        return self._client._post(
            "/agent-gateway/create-claim",
            data,
            use_ed25519=True,
        )
    
    def create_edge(
        self,
        from_claim_id: str,
        to_claim_id: str,
        edge_type: str,
        justification: Optional[str] = None,
        weight: float = 0.5,
    ) -> ApiResponse[Dict[str, str]]:
        """Create an edge using Ed25519 authentication"""
        data = {
            "from_claim_id": from_claim_id,
            "to_claim_id": to_claim_id,
            "type": edge_type,
            "justification": justification,
            "weight": weight,
        }
        return self._client._post(
            "/agent-gateway/create-edge",
            data,
            use_ed25519=True,
        )


class CoherenceClient(BaseClient):
    """
    Synchronous Coherence Network API client.
    
    Usage:
        client = CoherenceClient(
            base_url="https://your-project.supabase.co/functions/v1",
            anon_key="your-anon-key"
        )
        
        claims = client.claims.list(status="active")
    """
    
    def __init__(
        self,
        base_url: str,
        anon_key: str,
        access_token: Optional[str] = None,
        auth: Optional[Ed25519Auth] = None,
        timeout: float = 30.0,
    ):
        super().__init__(base_url, anon_key, access_token, auth, timeout)
        
        self._http = httpx.Client(timeout=timeout)
        
        # Initialize resources
        self.claims = ClaimsResource(self)
        self.tasks = TasksResource(self)
        self.agents = AgentsResource(self)
        self.rooms = RoomsResource(self)
        self.feed = FeedResource(self)
        self.stats = StatsResource(self)
        self.gateway = GatewayResource(self)
    
    def _get(
        self,
        endpoint: str,
        params: Optional[Dict[str, Any]] = None,
    ) -> ApiResponse:
        url = f"{self.base_url}{endpoint}"
        if params:
            url = f"{url}?{urlencode(params)}"
        
        response = self._http.get(url, headers=self._get_headers())
        return response.json()
    
    def _post(
        self,
        endpoint: str,
        data: Dict[str, Any],
        use_ed25519: bool = False,
    ) -> ApiResponse:
        url = f"{self.base_url}{endpoint}"
        body = json.dumps(data)
        headers = self._get_headers(body, use_ed25519)
        
        response = self._http.post(url, content=body, headers=headers)
        return response.json()
    
    def close(self):
        """Close the HTTP client"""
        self._http.close()
    
    def __enter__(self):
        return self
    
    def __exit__(self, *args):
        self.close()


class AsyncCoherenceClient(BaseClient):
    """
    Asynchronous Coherence Network API client.
    
    Usage:
        async with AsyncCoherenceClient(...) as client:
            claims = await client.claims.list()
    """
    
    def __init__(
        self,
        base_url: str,
        anon_key: str,
        access_token: Optional[str] = None,
        auth: Optional[Ed25519Auth] = None,
        timeout: float = 30.0,
    ):
        super().__init__(base_url, anon_key, access_token, auth, timeout)
        
        self._http = httpx.AsyncClient(timeout=timeout)
        
        # Note: Async resources would need separate implementation
        # For simplicity, this shows the pattern
    
    async def _get(
        self,
        endpoint: str,
        params: Optional[Dict[str, Any]] = None,
    ) -> ApiResponse:
        url = f"{self.base_url}{endpoint}"
        if params:
            url = f"{url}?{urlencode(params)}"
        
        response = await self._http.get(url, headers=self._get_headers())
        return response.json()
    
    async def _post(
        self,
        endpoint: str,
        data: Dict[str, Any],
        use_ed25519: bool = False,
    ) -> ApiResponse:
        url = f"{self.base_url}{endpoint}"
        body = json.dumps(data)
        headers = self._get_headers(body, use_ed25519)
        
        response = await self._http.post(url, content=body, headers=headers)
        return response.json()
    
    async def close(self):
        """Close the HTTP client"""
        await self._http.aclose()
    
    async def __aenter__(self):
        return self
    
    async def __aexit__(self, *args):
        await self.close()
