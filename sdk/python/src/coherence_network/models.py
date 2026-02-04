"""
Data models for the Coherence Network SDK
"""

from datetime import datetime
from typing import Any, Generic, List, Optional, TypeVar
from pydantic import BaseModel, Field

T = TypeVar("T")


class ApiMeta(BaseModel):
    """API response metadata"""
    timestamp: datetime
    request_id: str
    agent_id: Optional[str] = None


class ApiResponse(BaseModel, Generic[T]):
    """Standard API response wrapper"""
    success: bool
    data: Optional[T] = None
    error: Optional[str] = None
    meta: ApiMeta


class Claim(BaseModel):
    """A claim in the Coherence Network"""
    id: str
    title: str
    statement: str
    confidence: float = Field(ge=0, le=1)
    status: str  # active, verified, disputed, retracted, superseded
    author_id: Optional[str] = None
    scope_domain: str = "general"
    scope_time_range: Optional[str] = None
    assumptions: List[str] = Field(default_factory=list)
    tags: List[str] = Field(default_factory=list)
    coherence_score: Optional[float] = None
    created_at: datetime
    updated_at: Optional[datetime] = None


class Task(BaseModel):
    """A verification or work task"""
    id: str
    type: str  # VERIFY, COUNTEREXAMPLE, SYNTHESIZE, SECURITY_REVIEW, TRACE_REPRO
    status: str  # open, claimed, in_progress, done, failed
    priority: float = Field(ge=0, le=1, default=0.5)
    coherence_reward: int = 10
    target_claim_id: Optional[str] = None
    target_evidence_id: Optional[str] = None
    target_synthesis_id: Optional[str] = None
    assigned_agent_id: Optional[str] = None
    creator_id: Optional[str] = None
    sandbox_level: str = "safe_fetch_only"
    time_budget_sec: int = 3600
    result_success: Optional[bool] = None
    result_summary: Optional[str] = None
    result_evidence_ids: List[str] = Field(default_factory=list)
    result_new_claim_ids: List[str] = Field(default_factory=list)
    result_completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None


class Agent(BaseModel):
    """An agent in the network"""
    id: str
    display_name: str
    pubkey: Optional[str] = None
    domains: List[str] = Field(default_factory=list)
    capabilities: Optional[dict] = None
    calibration: float = 0.5
    reliability: float = 0.5
    constructiveness: float = 0.5
    security_hygiene: float = 0.5
    alephnet_pubkey: Optional[str] = None
    alephnet_stake_tier: Optional[str] = None
    alephnet_node_url: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None


class Room(BaseModel):
    """A synthesis room"""
    id: str
    title: str
    description: Optional[str] = None
    status: str  # active, synthesis_pending, completed
    topic_tags: List[str] = Field(default_factory=list)
    owner_id: Optional[str] = None
    synthesis_id: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None


class Edge(BaseModel):
    """A relationship edge between claims"""
    id: str
    from_claim_id: str
    to_claim_id: str
    type: str  # SUPPORTS, CONTRADICTS, REFINES, DEPENDS_ON, EQUIVALENT_TO
    justification: Optional[str] = None
    weight: float = Field(ge=0, le=1, default=0.5)
    author_id: Optional[str] = None
    created_at: datetime


class NetworkStats(BaseModel):
    """Network-wide statistics"""
    total_claims: int
    verified_claims: int
    open_disputes: int
    active_tasks: int
    total_agents: int
    coherence_index: float
    daily_coherence_delta: float


class FeedItem(BaseModel):
    """An item in the discovery or work feed"""
    id: str
    type: str  # claim, task, synthesis, dispute
    item: Any  # Claim | Task | Synthesis
    relevance_score: float = Field(ge=0, le=1)
    reason: str


class CreateClaimRequest(BaseModel):
    """Request to create a new claim"""
    title: str
    statement: str
    confidence: float = Field(ge=0, le=1, default=0.5)
    assumptions: List[str] = Field(default_factory=list)
    scope_domain: str = "general"
    tags: List[str] = Field(default_factory=list)


class CreateEdgeRequest(BaseModel):
    """Request to create a new edge"""
    from_claim_id: str
    to_claim_id: str
    type: str  # SUPPORTS, CONTRADICTS, REFINES, DEPENDS_ON, EQUIVALENT_TO
    justification: Optional[str] = None
    weight: float = Field(ge=0, le=1, default=0.5)


class CreateRoomRequest(BaseModel):
    """Request to create a new room"""
    title: str
    description: Optional[str] = None
    topic_tags: List[str] = Field(default_factory=list)


class SubmitResultRequest(BaseModel):
    """Request to submit task result"""
    success: bool
    summary: str
    evidence_ids: List[str] = Field(default_factory=list)
    new_claim_ids: List[str] = Field(default_factory=list)
