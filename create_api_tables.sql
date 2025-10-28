-- Create extractor_api_keys table
CREATE TABLE IF NOT EXISTS extractor_api_keys (
    id SERIAL PRIMARY KEY,
    extractor_id INTEGER NOT NULL UNIQUE REFERENCES extractors(id) ON DELETE CASCADE,
    api_key VARCHAR(128) NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    created_by_user_id INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_extractor_api_keys_extractor_id ON extractor_api_keys(extractor_id);
CREATE INDEX IF NOT EXISTS ix_extractor_api_keys_api_key ON extractor_api_keys(api_key);

-- Create api_extraction_jobs table
CREATE TABLE IF NOT EXISTS api_extraction_jobs (
    id SERIAL PRIMARY KEY,
    job_id VARCHAR(128) NOT NULL UNIQUE,
    api_key_id INTEGER NOT NULL REFERENCES extractor_api_keys(id) ON DELETE CASCADE,
    extractor_id INTEGER NOT NULL REFERENCES extractors(id) ON DELETE CASCADE,
    requester_user_id INTEGER NOT NULL REFERENCES users(id),
    request_label VARCHAR(512) NOT NULL,
    file_name VARCHAR(512) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    result_content TEXT,
    result_path VARCHAR(1024),
    error_message TEXT,
    prompt_tokens INTEGER,
    completion_tokens INTEGER,
    total_tokens INTEGER,
    cached_tokens INTEGER,
    model_used VARCHAR(128),
    is_cached_result BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_api_extraction_jobs_job_id ON api_extraction_jobs(job_id);
CREATE INDEX IF NOT EXISTS ix_api_extraction_jobs_api_key_id ON api_extraction_jobs(api_key_id);
CREATE INDEX IF NOT EXISTS ix_api_extraction_jobs_extractor_id ON api_extraction_jobs(extractor_id);
CREATE INDEX IF NOT EXISTS ix_api_extraction_jobs_requester_user_id ON api_extraction_jobs(requester_user_id);
CREATE INDEX IF NOT EXISTS ix_api_extraction_jobs_created_at ON api_extraction_jobs(created_at);

-- Update alembic version
UPDATE alembic_version SET version_num = 'd5f7e8a9b2c3';
