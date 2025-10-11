"""FastAPI application for Document Information Extraction."""

import logging
import uuid
from pathlib import Path
from typing import List

from fastapi import FastAPI, File, UploadFile, HTTPException, BackgroundTasks, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from celery.result import AsyncResult

from autoglean.core.config import get_config_loader
from autoglean.core.storage import get_storage_manager
from autoglean.extractors.document import get_document_extractor
from autoglean.api.celery_app import celery_app
from autoglean.api import tasks
from autoglean.api.models import (
    ExtractorInfo,
    ExtractorsListResponse,
    ExtractionRequest,
    ExtractionResponse,
    TaskStatusResponse,
    FileUploadResponse,
    HealthResponse,
    UpdateExtractorRequest
)
from autoglean.auth.routes import router as auth_router
from autoglean.extractors.routes import router as extractors_router
from autoglean.jobs.routes import router as jobs_router
from autoglean.leaderboard.routes import router as leaderboard_router
from autoglean.auth.dependencies import get_current_active_user
from autoglean.db.base import get_db
from autoglean.jobs.service import create_extraction_job

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load configuration
config_loader = get_config_loader()
api_config = config_loader.load_api_config()
app_config = config_loader.load_app_config()

# Create FastAPI app
app = FastAPI(
    title=api_config['api']['title'],
    description=api_config['api']['description'],
    version=api_config['api']['version']
)

# Setup CORS
cors_config = api_config['cors']
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_config['allow_origins'],
    allow_credentials=cors_config['allow_credentials'],
    allow_methods=cors_config['allow_methods'],
    allow_headers=cors_config['allow_headers'],
)

# Get storage manager
storage_manager = get_storage_manager()

# Include routers
app.include_router(auth_router)
app.include_router(extractors_router)
app.include_router(jobs_router)
app.include_router(leaderboard_router)


# === Health Check ===

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    return HealthResponse(
        status="healthy",
        service="docinfo-api",
        version=api_config['api']['version']
    )


# === Extractors Endpoints ===

@app.get("/api/extractors", response_model=ExtractorsListResponse)
async def list_extractors():
    """List all available extractors from configuration."""
    try:
        extractor = get_document_extractor()
        extractors_dict = extractor.list_extractors()

        # Convert to response format
        extractors_info = {}
        for extractor_id, config in extractors_dict.items():
            extractors_info[extractor_id] = ExtractorInfo(
                id=config.get('id', extractor_id),
                name=config['name'],
                icon=config['icon'],
                description=config.get('description'),
                prompt=config.get('prompt'),
                llm=config.get('llm', 'gemini-flash'),
                temperature=config.get('temperature', 0.7),
                max_tokens=config.get('max_tokens', 2000)
            )

        return ExtractorsListResponse(extractors=extractors_info)

    except Exception as e:
        logger.error(f"Failed to list extractors: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/api/extractors/{extractor_id}")
async def update_extractor_prompt(extractor_id: str, request: UpdateExtractorRequest):
    """Update an extractor's prompt and save to YAML file."""
    import yaml
    try:
        # Load current extractors config
        config_path = Path("config/extractors.yaml")
        with open(config_path, 'r', encoding='utf-8') as f:
            config = yaml.safe_load(f)

        # Update the prompt
        if extractor_id not in config.get('extractors', {}):
            raise HTTPException(status_code=404, detail=f"Extractor '{extractor_id}' not found")

        config['extractors'][extractor_id]['prompt'] = request.prompt

        # Save back to file
        with open(config_path, 'w', encoding='utf-8') as f:
            yaml.dump(config, f, allow_unicode=True, default_flow_style=False, sort_keys=False)

        logger.info(f"Updated extractor '{extractor_id}' prompt")

        return {"message": "Extractor updated successfully", "extractor_id": extractor_id}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update extractor: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# === File Upload Endpoints ===

@app.post("/api/upload", response_model=FileUploadResponse)
async def upload_file(file: UploadFile = File(...)):
    """
    Upload a document file for processing.

    Returns job_id to track the file and results.
    """
    try:
        # Generate job ID
        job_id = str(uuid.uuid4())

        # Read file content
        content = await file.read()

        # Save file
        file_path = storage_manager.save_uploaded_file(
            file_content=content,
            filename=file.filename,
            job_id=job_id
        )

        logger.info(f"File uploaded: {file.filename}, Job ID: {job_id}")

        return FileUploadResponse(
            job_id=job_id,
            file_name=file.filename,
            file_path=str(file_path),
            message="File uploaded successfully"
        )

    except Exception as e:
        logger.error(f"File upload failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# === Extraction Endpoints ===

@app.post("/api/extract", response_model=ExtractionResponse)
async def extract_document(
    request: ExtractionRequest,
    current_user = Depends(get_current_active_user),
    db = Depends(get_db)
):
    """
    Start document extraction task.

    Returns task_id to track extraction progress.
    """
    try:
        # Import here to avoid circular dependency
        from autoglean.db.models import Extractor

        # Get file path
        files = storage_manager.list_job_documents(request.job_id)
        if not files:
            raise HTTPException(status_code=404, detail="No files found for job_id")

        file_path = str(files[0])  # Use first file
        file_name = files[0].name

        # Look up extractor database ID from extractor_id (UUID)
        extractor = db.query(Extractor).filter(Extractor.extractor_id == request.extractor_id).first()
        if not extractor:
            raise HTTPException(status_code=404, detail=f"Extractor with ID '{request.extractor_id}' not found")

        extractor_db_id = extractor.id

        # Create extraction job record (using database integer ID)
        create_extraction_job(
            db=db,
            job_id=request.job_id,
            user_id=current_user.id,
            extractor_id=extractor_db_id,
            file_name=file_name,
            file_path=file_path
        )

        # Start Celery task (using UUID string)
        task = tasks.extract_document_task.delay(
            job_id=request.job_id,
            extractor_id=request.extractor_id,
            file_path=file_path
        )

        logger.info(f"Extraction task started: {task.id}, Job: {request.job_id}, User: {current_user.email}")

        return ExtractionResponse(
            task_id=task.id,
            job_id=request.job_id,
            status="processing",
            message="Extraction task started"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Extraction request failed: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/task/{task_id}", response_model=TaskStatusResponse)
async def get_task_status(task_id: str):
    """
    Get status of extraction task.

    Returns task status and result when complete.
    """
    try:
        task_result = AsyncResult(task_id, app=celery_app)

        if task_result.state == 'PENDING':
            response = TaskStatusResponse(
                task_id=task_id,
                status='pending',
                result=None,
                error=None
            )
        elif task_result.state == 'PROCESSING':
            response = TaskStatusResponse(
                task_id=task_id,
                status='processing',
                result=task_result.info,
                error=None
            )
        elif task_result.state == 'SUCCESS':
            response = TaskStatusResponse(
                task_id=task_id,
                status='success',
                result=task_result.result,
                error=None
            )
        elif task_result.state == 'FAILURE':
            response = TaskStatusResponse(
                task_id=task_id,
                status='failure',
                result=None,
                error=str(task_result.info)
            )
        else:
            response = TaskStatusResponse(
                task_id=task_id,
                status=task_result.state.lower(),
                result=task_result.info if task_result.info else None,
                error=None
            )

        return response

    except Exception as e:
        logger.error(f"Failed to get task status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# === Results Endpoints ===

@app.get("/api/results/{job_id}")
async def get_job_results(job_id: str):
    """Get all extraction results for a job."""
    try:
        results = storage_manager.list_job_results(job_id)

        if not results:
            return JSONResponse(
                status_code=404,
                content={"message": "No results found for this job"}
            )

        # Read and return all results
        results_data = []
        for result_path in results:
            with open(result_path, 'r', encoding='utf-8') as f:
                content = f.read()
            results_data.append({
                'file_name': result_path.name,
                'content': content,
                'path': str(result_path)
            })

        return {
            'job_id': job_id,
            'count': len(results_data),
            'results': results_data
        }

    except Exception as e:
        logger.error(f"Failed to get results: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# === File Serving Endpoints ===

@app.get("/api/files/{job_id}/{filename}")
async def serve_file(job_id: str, filename: str):
    """Serve uploaded document files."""
    try:
        # Construct file path
        file_path = storage_manager.documents_dir / job_id / filename

        if not file_path.exists():
            raise HTTPException(status_code=404, detail="File not found")

        # Determine media type based on file extension
        media_type = None
        if filename.lower().endswith('.pdf'):
            media_type = 'application/pdf'
        elif filename.lower().endswith(('.png', '.jpg', '.jpeg')):
            media_type = f'image/{filename.split(".")[-1].lower()}'

        # Return file with inline disposition to display in browser
        from fastapi.responses import Response
        with open(file_path, 'rb') as f:
            content = f.read()

        return Response(
            content=content,
            media_type=media_type,
            headers={
                'Content-Disposition': 'inline'
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to serve file: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# === Departments and GM Endpoints ===

@app.get("/api/departments")
async def get_departments(
    current_user = Depends(get_current_active_user),
    db = Depends(get_db)
):
    """Get unique departments from public extractors."""
    try:
        from autoglean.db.models import Department, Extractor, User, VisibilityEnum

        # Get distinct departments from users who own public extractors
        departments = db.query(
            Department.name_en,
            Department.name_ar
        ).join(
            User, User.department_id == Department.id
        ).join(
            Extractor, Extractor.owner_id == User.id
        ).filter(
            Extractor.visibility == VisibilityEnum.PUBLIC,
            Extractor.deleted_at == None
        ).distinct().all()

        return [
            {"name_en": dept.name_en, "name_ar": dept.name_ar}
            for dept in departments
        ]

    except Exception as e:
        logger.error(f"Failed to get departments: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/general-managements")
async def get_general_managements(
    current_user = Depends(get_current_active_user),
    db = Depends(get_db)
):
    """Get unique general managements from public extractors."""
    try:
        from autoglean.db.models import GeneralManagement, Department, Extractor, User, VisibilityEnum

        # Get distinct GMs from users who own public extractors
        gms = db.query(
            GeneralManagement.name_en,
            GeneralManagement.name_ar
        ).join(
            Department, Department.gm_id == GeneralManagement.id
        ).join(
            User, User.department_id == Department.id
        ).join(
            Extractor, Extractor.owner_id == User.id
        ).filter(
            Extractor.visibility == VisibilityEnum.PUBLIC,
            Extractor.deleted_at == None
        ).distinct().all()

        return [
            {"name_en": gm.name_en, "name_ar": gm.name_ar}
            for gm in gms
        ]

    except Exception as e:
        logger.error(f"Failed to get general managements: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# === Root Endpoint ===

@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "service": "DocuInfo API",
        "version": api_config['api']['version'],
        "status": "running"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host=api_config['api']['host'],
        port=api_config['api']['port']
    )
