from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.intelligence import AIQueryRequest, AIQueryResponse
from app.services.rag_service import RAGService

router = APIRouter(prefix='/assistant', tags=['AI Assistant'])

@router.post('/query', response_model=AIQueryResponse)
def query_assistant(data: AIQueryRequest, db: Session = Depends(get_db)):
    res = RAGService.answer_query(db, data.vehicle_id, data.query)
    return AIQueryResponse(**res)
