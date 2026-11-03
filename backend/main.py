from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import os
import json
from datetime import datetime

from agents.orchestrator import OrchestratorAgent
from agents.resume_parser import ResumeParserAgent
from agents.job_matcher import JobMatcherAgent
from agents.application_tracker import ApplicationTrackerAgent

app = FastAPI(title="AI Job Chat Assistant")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Data directories
DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
JOBS_FILE = os.path.join(DATA_DIR, "jobs.json")
APPLICATIONS_FILE = os.path.join(DATA_DIR, "applications.json")
RESUMES_DIR = os.path.join(DATA_DIR, "resumes")

# Ensure directories exist
os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(RESUMES_DIR, exist_ok=True)

# Initialize agents
orchestrator = OrchestratorAgent(JOBS_FILE, APPLICATIONS_FILE)

class ChatMessage(BaseModel):
    message: str
    session_id: Optional[str] = None

class ChatResponse(BaseModel):
    response: str
    session_id: str
    parsed_resume: Optional[dict] = None
    recommended_jobs: Optional[List[dict]] = None
    applied_jobs: Optional[List[dict]] = None

@app.get("/")
async def root():
    return {"message": "AI Job Chat Assistant API"}

@app.post("/api/chat", response_model=ChatResponse)
async def chat(message: ChatMessage):
    """Main chat endpoint for the conversational assistant"""
    try:
        response_data = await orchestrator.process_message(
            message.message, 
            message.session_id
        )
        return ChatResponse(**response_data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/upload-resume")
async def upload_resume(file: UploadFile = File(...)):
    """Upload and parse resume"""
    try:
        # Save uploaded file
        file_path = os.path.join(RESUMES_DIR, file.filename)
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        # Parse resume
        parser = ResumeParserAgent()
        parsed_data = parser.parse_resume(file_path)
        
        return {
            "success": True,
            "parsed_data": parsed_data,
            "file_path": file_path
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse resume: {str(e)}")

@app.get("/api/jobs")
async def get_jobs():
    """Get all jobs from database"""
    try:
        with open(JOBS_FILE, 'r', encoding='utf-8') as f:
            jobs = json.load(f)
        return {"jobs": jobs}
    except FileNotFoundError:
        return {"jobs": []}

@app.get("/api/applications")
async def get_applications():
    """Get all applications"""
    try:
        with open(APPLICATIONS_FILE, 'r', encoding='utf-8') as f:
            applications = json.load(f)
        return {"applications": applications}
    except FileNotFoundError:
        return {"applications": []}

@app.post("/api/apply-job")
async def apply_job(job_id: str, session_id: str):
    """Apply to a specific job"""
    try:
        tracker = ApplicationTrackerAgent(APPLICATIONS_FILE)
        result = tracker.apply_to_job(job_id, session_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
