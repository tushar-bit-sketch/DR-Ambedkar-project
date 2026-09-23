"""
SIH Demonstration Mode Endpoints.
Provides structured presentation data for judges and public visitors across all 10 core archive pillars,
as well as curator control endpoints for guided walkthroughs.
"""
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from app.db.session import get_db
from app.db.models import User
from app.api.v1.endpoints.auth import require_role, get_current_user_optional
from app.services.demo.demo_service import DemoService

router = APIRouter()


class StepControlIn(BaseModel):
    direction: str = Field(..., description="'next', 'prev', or 'reset'")


@router.get("/stages", response_model=List[Dict[str, Any]])
def list_demo_stages(db: Session = Depends(get_db)):
    """Returns overview of all 10 demonstration stages."""
    return DemoService.get_stages_overview(db)


@router.get("/stage/{stage_id}", response_model=Dict[str, Any])
def get_demo_stage(stage_id: str, db: Session = Depends(get_db)):
    """Returns authentic archival evidence, talking points, and actions for a demonstration stage."""
    detail = DemoService.get_stage_detail(stage_id, db)
    if "error" in detail:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=detail["error"])
    return detail


@router.get("/control", response_model=Dict[str, Any])
def get_demo_control(
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """Returns current presentation control state."""
    return DemoService.get_control_state()


@router.post("/control/step", response_model=Dict[str, Any])
def step_demo_control(
    payload: StepControlIn,
    current_user: User = Depends(require_role(["SUPER_ADMIN", "ARCHIVIST"]))
):
    """Curator control action to advance, rewind, or reset demo presentation stage."""
    if payload.direction not in ["next", "prev", "reset"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Direction must be 'next', 'prev', or 'reset'."
        )
    return DemoService.step_control(payload.direction)


@router.post("/control/reset", response_model=Dict[str, Any])
def reset_demo_control(
    current_user: User = Depends(require_role(["SUPER_ADMIN", "ARCHIVIST"]))
):
    """Curator action to reset demonstration to stage 1."""
    return DemoService.step_control("reset")
