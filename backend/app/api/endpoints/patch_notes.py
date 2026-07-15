from fastapi import APIRouter

from app.services import patch_notes

router = APIRouter(prefix="/patch-notes", tags=["patch-notes"])


@router.get("/latest")
async def get_latest_patch_notes():
    """
    최신 패치의 버프/너프/신규 챔피언 요약 (실험적 자동 스크래핑 —
    app/services/patch_notes.py 상단 주석 참고).
    """
    return await patch_notes.get_latest_patch_summary()
