from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.schemas.agent import AgentChatRequest, AgentChatResponse
from app.services.agent_service import run_agent_chat

router = APIRouter()


@router.post("/chat", response_model=AgentChatResponse)
def chat(payload: AgentChatRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> AgentChatResponse:
    return run_agent_chat(db, user, payload.message, payload.conversation_id, payload.thread_id)
