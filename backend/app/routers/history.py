from fastapi import APIRouter, HTTPException, Query

from app.history_store import delete_evaluation, get_evaluation, list_evaluations
from app.schemas import HistoryDetail, HistoryListResponse

router = APIRouter()


@router.get("/api/history", response_model=HistoryListResponse)
async def list_history(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
) -> HistoryListResponse:
    items, total = await list_evaluations(limit=limit, offset=offset)
    return HistoryListResponse(items=items, total=total, limit=limit, offset=offset)


@router.get("/api/history/{evaluation_id}", response_model=HistoryDetail)
async def get_history_detail(evaluation_id: str) -> HistoryDetail:
    detail = await get_evaluation(evaluation_id)
    if detail is None:
        raise HTTPException(404, "Unknown evaluation_id")
    return detail


@router.delete("/api/history/{evaluation_id}", status_code=204)
async def delete_history_entry(evaluation_id: str) -> None:
    deleted = await delete_evaluation(evaluation_id)
    if not deleted:
        raise HTTPException(404, "Unknown evaluation_id")
