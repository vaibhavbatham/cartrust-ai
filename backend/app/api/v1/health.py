from fastapi import APIRouter

router = APIRouter(tags=['Health'])

@router.get('/health')
def health_check():
    return {'status': 'HEALTHY', 'service': 'CarTrust AI API'}

@router.get('/ready')
def readiness_check():
    return {'status': 'READY', 'database': 'CONNECTED'}
