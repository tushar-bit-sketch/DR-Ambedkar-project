import json
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.models import User, ResearchConversation, ResearchMessage
from app.api.v1.endpoints.auth import get_current_user_optional
from app.schemas.research import (
    ResearchQueryRequest, ResearchQueryResponse, ResearchSourceCitation,
    ResearchAskRequest, ResearchAskResponse,
    ResearchConversationSummary, ResearchConversationDetail, ResearchMessageItem
)
from app.services.rag.engine import ArchivalRAGEngine

logger = logging.getLogger("archive.api.research")
router = APIRouter()

# Phase 1 Legacy Placeholder Endpoint — Formally Retired under Zero-Canned-Answer Rule
@router.post("/query", response_model=ResearchQueryResponse)
def query_research_assistant(payload: ResearchQueryRequest):
    """
    Formally retired placeholder endpoint.
    Under the platform's Zero-Canned-Answer rule, canned historical texts are strictly prohibited.
    All research queries must be directed to POST /api/v1/research/ask for real source-grounded RAG.
    """
    return ResearchQueryResponse(
        query=payload.query,
        disclaimer="ENDPOINT RETIRED — USE POST /api/v1/research/ask (ZERO-CANNED-ANSWER MANDATE)",
        is_live_rag=False,
        answer=(
            "The legacy /research/query endpoint has been retired under the institutional "
            "Zero-Fabrication and Zero-Canned-Answer mandate. Canned historical texts have been "
            "permanently removed. All research inquiries must be directed to POST /api/v1/research/ask "
            "for verified source-grounded retrieval."
        ),
        sources=[
            ResearchSourceCitation(
                document_id=1,
                archive_id="SYS-RETIRED-001",
                document_title="Archival Policy Notice: Canned AI Responses Retired",
                page=1,
                collection="Institutional Governance",
                date="2026-09-24",
                excerpt="Under the Zero-Fabrication rule, automated speculative or canned answers are strictly forbidden without live primary source retrieval."
            )
        ]
    )

# Phase 5 Real Source-Grounded RAG Endpoints

@router.post("/ask", response_model=ResearchAskResponse)
def ask_research_assistant(
    payload: ResearchAskRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """
    Real Source-Grounded Archival RAG Assistant:
    Retrieves archival evidence via Phase 4 Hybrid Search, verifies citations,
    and returns strictly grounded answers.
    """
    rag_engine = ArchivalRAGEngine(db=db)
    result = rag_engine.ask(
        query=payload.query,
        conversation_id=payload.conversation_id,
        user=current_user,
        filters=payload.filters,
        mode=payload.mode or "hybrid",
        target_language=payload.target_language
    )
    return result

@router.get("/conversations", response_model=List[ResearchConversationSummary])
def list_conversations(
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """
    Lists recent research inquiry threads.
    If authenticated, returns user's threads; otherwise returns recent session inquiries.
    """
    query = db.query(ResearchConversation)
    if current_user:
        query = query.filter(ResearchConversation.user_id == current_user.id)
    
    conversations = query.order_by(ResearchConversation.updated_at.desc()).limit(limit).all()
    
    summaries = []
    for conv in conversations:
        msg_count = len(conv.messages) if conv.messages else 0
        summaries.append(ResearchConversationSummary(
            conversation_id=conv.conversation_id,
            title=conv.title,
            message_count=msg_count,
            created_at=conv.created_at.isoformat() if conv.created_at else "",
            updated_at=conv.updated_at.isoformat() if conv.updated_at else ""
        ))
    return summaries

@router.get("/conversations/{conversation_id}", response_model=ResearchConversationDetail)
def get_conversation(
    conversation_id: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """
    Retrieves complete multi-turn conversation history and verified citation records.
    """
    conv = db.query(ResearchConversation).filter(
        ResearchConversation.conversation_id == conversation_id
    ).first()

    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Conversation '{conversation_id}' not found."
        )

    # If conversation has an owner and requester is different non-staff user, deny
    if conv.user_id and current_user and conv.user_id != current_user.id:
        if not (current_user.role and current_user.role.name in ["SUPER_ADMIN", "ARCHIVIST"]):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this conversation.")

    message_items = []
    for msg in conv.messages:
        citations = []
        if msg.citations_json:
            try:
                citations = json.loads(msg.citations_json)
            except Exception:
                citations = []

        message_items.append(ResearchMessageItem(
            id=msg.id,
            role=msg.role,
            content=msg.content,
            status=msg.status or "SUCCESS",
            grounded=bool(msg.grounded),
            evidence_count=msg.evidence_count or 0,
            citations=citations,
            created_at=msg.created_at.isoformat() if msg.created_at else ""
        ))

    return ResearchConversationDetail(
        conversation_id=conv.conversation_id,
        title=conv.title,
        created_at=conv.created_at.isoformat() if conv.created_at else "",
        messages=message_items
    )

@router.delete("/conversations/{conversation_id}")
def delete_conversation(
    conversation_id: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """
    Deletes a research conversation thread and its associated message records.
    """
    conv = db.query(ResearchConversation).filter(
        ResearchConversation.conversation_id == conversation_id
    ).first()

    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Conversation '{conversation_id}' not found."
        )

    if conv.user_id and current_user and conv.user_id != current_user.id:
        if not (current_user.role and current_user.role.name in ["SUPER_ADMIN", "ARCHIVIST"]):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    db.delete(conv)
    db.commit()
    return {"message": f"Conversation '{conversation_id}' deleted successfully."}
