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

# Phase 1 Legacy Placeholder Endpoint (Maintained for backward compatibility)
@router.post("/query", response_model=ResearchQueryResponse)
def query_research_assistant(payload: ResearchQueryRequest):
    """
    Phase 1 Foundation Placeholder for the AI Research Assistant.
    Maintained for backward compatibility with Phase 1 test suite.
    """
    sample_answer = (
        "In his landmark address on November 25, 1949, Dr. B.R. Ambedkar warned that "
        "political democracy must not be mistaken for a permanent guarantee of liberty "
        "unless it is anchored in social democracy. He famously asserted that 'we must make "
        "our political democracy a social democracy as well. Political democracy cannot last "
        "unless there lies at the base of it social democracy... which means a way of life "
        "which recognises liberty, equality and fraternity as the principles of life.' "
        "Furthermore, he specifically identified constitutional morality, the cessation of "
        "unconstitutional agitations, and vigilance against hero-worship (Bhakti in politics) "
        "as foundational prerequisites for safeguarding democratic institutions."
    )

    sample_sources = [
        ResearchSourceCitation(
            document_id=1,
            archive_id="AMB-CAD-1949-042",
            document_title="Speech on the Third Reading of the Draft Constitution: 'Grammar of Anarchy' Address",
            page=979,
            collection="Constituent Assembly of India & The Draft Constitution",
            date="November 25, 1949",
            excerpt="In politics we will have equality and in social and economic life we will have inequality. In politics we will be recognising the principle of one man one vote and one vote one value. In our social and economic life, we shall, by reason of our social and economic structure, continue to deny the principle of one man one value..."
        ),
        ResearchSourceCitation(
            document_id=6,
            archive_id="AMB-CAD-1948-019",
            document_title="Debate on Draft Article 25 (Article 32): 'Heart and Soul of the Constitution'",
            page=953,
            collection="Constituent Assembly of India & The Draft Constitution",
            date="December 9, 1948",
            excerpt="If I was asked to name any particular article in this Constitution as the most important... I could not refer to any other article except this one. It is the very soul of the Constitution and the very heart of it."
        )
    ]

    return ResearchQueryResponse(
        query=payload.query,
        disclaimer="DEMO RESPONSE — NOT CONNECTED TO ARCHIVE (PHASE 1 FOUNDATION ONLY)",
        is_live_rag=False,
        answer=sample_answer,
        sources=sample_sources
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
