"""Celery application configuration."""

import os
from celery import Celery

# Get Celery broker and backend from environment
CELERY_BROKER_URL = os.environ.get('CELERY_BROKER_URL', 'redis://localhost:6380/0')
CELERY_RESULT_BACKEND = os.environ.get('CELERY_RESULT_BACKEND', 'redis://localhost:6380/0')

# Create Celery app
celery_app = Celery(
    'autoglean',
    broker=CELERY_BROKER_URL,
    backend=CELERY_RESULT_BACKEND
)

# Configure Celery
celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    task_track_started=True,
    task_time_limit=30 * 60,  # 30 minutes
    task_soft_time_limit=25 * 60,  # 25 minutes
    worker_prefetch_multiplier=1,
    worker_max_tasks_per_child=1000,
)

# Import tasks to register them
try:
    from autoglean.api import tasks  # noqa
except ImportError:
    pass
