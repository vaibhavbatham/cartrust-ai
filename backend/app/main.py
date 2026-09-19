import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.logging import setup_logging, logger
from app.core.database import engine, Base
import app.models

# API Routers
from app.api.v1.auth import router as auth_router
from app.api.v1.profile import router as profile_router
from app.api.v1.vehicles import router as vehicles_router
from app.api.v1.documents import router as documents_router
from app.api.v1.reports import router as reports_router
from app.api.v1.compare import router as compare_router
from app.api.v1.assistant import router as assistant_router
from app.api.v1.admin import router as admin_router
from app.api.v1.health import router as health_router

setup_logging()

app = FastAPI(
    title='CarTrust AI API',
    description='Used-Car Intelligence Platform REST API with Grounded Evidence & Verification Architecture',
    version='1.0.0',
    docs_url='/docs',
    redoc_url='/redoc'
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],  # Permissive for local dev & demo
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

# Include Routers
app.include_router(health_router)
app.include_router(auth_router, prefix=settings.API_V1_PREFIX)
app.include_router(profile_router, prefix=settings.API_V1_PREFIX)
app.include_router(vehicles_router, prefix=settings.API_V1_PREFIX)
app.include_router(documents_router, prefix=settings.API_V1_PREFIX)
app.include_router(reports_router, prefix=settings.API_V1_PREFIX)
app.include_router(compare_router, prefix=settings.API_V1_PREFIX)
app.include_router(assistant_router, prefix=settings.API_V1_PREFIX)
app.include_router(admin_router, prefix=settings.API_V1_PREFIX)

@app.on_event('startup')
def on_startup():
    logger.info('Starting CarTrust AI API service...')
    Base.metadata.create_all(bind=engine)
    logger.info('Database tables verified.')

@app.get('/')
def root():
    return {
        'message': 'Welcome to CarTrust AI - Used-Car Intelligence Platform API',
        'documentation': '/docs',
        'health': '/health'
    }
