from fastapi import FastAPI, APIRouter, UploadFile, File, HTTPException
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import shutil
from math import radians, sin, cos, sqrt, atan2
import anthropic
import base64

# Configure logging FIRST before using logger
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Validate required environment variables
required_env_vars = ['MONGO_URL', 'DB_NAME']
missing_vars = [var for var in required_env_vars if not os.environ.get(var)]
if missing_vars:
    raise ValueError(f"Missing required environment variables: {', '.join(missing_vars)}")

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

UPLOADS_DIR = ROOT_DIR / "uploads"
UPLOADS_DIR.mkdir(exist_ok=True)

# Anthropic client for AI analysis
anthropic_client = anthropic.Anthropic(api_key=os.environ.get('ANTHROPIC_API_KEY', ''))

# ===== MODELS =====

class ComplaintCreate(BaseModel):
    latitude: float
    longitude: float
    issueType: str
    description: Optional[str] = ""
    userName: str
    userPhone: str

class ComplaintUpdate(BaseModel):
    status: Optional[str] = None
    assignedDepartment: Optional[str] = None
    assignedEngineer: Optional[str] = None
    engineerNotes: Optional[str] = None
    resolutionImageUrl: Optional[str] = None

class Complaint(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    issueId: str = Field(default_factory=lambda: str(uuid.uuid4()))
    latitude: float
    longitude: float
    issueType: str
    description: str = ""
    imageUrl: str = ""
    userName: str = ""
    userPhone: str = ""
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    severity: str = "Medium"
    priority: str = "Medium"
    status: str = "Pending"
    assignedDepartment: str = ""
    assignedEngineer: str = ""
    engineerNotes: str = ""
    resolutionImageUrl: str = ""
    aiAnalysis: Optional[dict] = None
    statusHistory: List[dict] = Field(default_factory=list)

class EngineerUpdate(BaseModel):
    issueId: str
    status: str
    notes: Optional[str] = ""

# ===== AI ANALYSIS =====

async def analyze_image_with_ai(image_path: str, issue_type: str) -> dict:
    """Use Claude to analyze road damage image and determine priority"""
    try:
        with open(image_path, "rb") as image_file:
            image_data = base64.standard_b64encode(image_file.read()).decode("utf-8")
        
        ext = image_path.split('.')[-1].lower()
        media_type_map = {
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'webp': 'image/webp'
        }
        media_type = media_type_map.get(ext, 'image/jpeg')
        
        message = anthropic_client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=1024,
            messages=[{
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": media_type,
                            "data": image_data,
                        },
                    },
                    {
                        "type": "text",
                        "text": f"""Analyze this road damage image (reported as: {issue_type}).
                        
Provide analysis in this exact JSON format:
{{
    "severity": "Low|Medium|High|Critical",
    "priority": "Low|Medium|High|Critical",
    "damage_type": "Pothole|Crack|Waterlogging|Road collapse|Other",
    "estimated_area": "Small (<1m²)|Medium (1-5m²)|Large (>5m²)",
    "safety_risk": "Low|Medium|High|Critical",
    "recommended_action": "Brief description",
    "confidence": "0-100"
}}

Priority Guidelines:
- Critical: Immediate danger, large area, high safety risk
- High: Significant damage, medium area, notable safety risk  
- Medium: Moderate damage, small-medium area, some risk
- Low: Minor damage, small area, minimal risk"""
                    }
                ],
            }]
        )
        
        response_text = message.content[0].text
        if '```json' in response_text:
            response_text = response_text.split('```json')[1].split('```')[0].strip()
        elif '```' in response_text:
            response_text = response_text.split('```')[1].split('```')[0].strip()
        
        import json
        analysis = json.loads(response_text)
        return analysis
        
    except Exception as e:
        logging.error(f"AI analysis failed: {str(e)}")
        return {
            "severity": "Medium",
            "priority": "Medium",
            "damage_type": issue_type,
            "estimated_area": "Unknown",
            "safety_risk": "Medium",
            "recommended_action": "Manual assessment required",
            "confidence": 0,
            "error": str(e)
        }

def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance between two GPS coordinates in meters"""
    R = 6371000
    phi1, phi2 = radians(lat1), radians(lat2)
    delta_phi = radians(lat2 - lat1)
    delta_lambda = radians(lon2 - lon1)
    
    a = sin(delta_phi/2)**2 + cos(phi1) * cos(phi2) * sin(delta_lambda/2)**2
    c = 2 * atan2(sqrt(a), sqrt(1-a))
    return R * c

async def calculate_contextual_priority(complaint_data: dict, ai_analysis: dict) -> tuple[str, str]:
    """Combine AI analysis with contextual factors"""
    
    severity_map = {'Critical': 4, 'High': 3, 'Medium': 2, 'Low': 1}
    base_score = severity_map.get(ai_analysis.get('severity', 'Medium'), 2)
    
    all_complaints = await db.complaints.find({}, {"_id": 0}).to_list(1000)
    nearby_count = 0
    for comp in all_complaints:
        if comp['issueId'] != complaint_data.get('issueId', ''):
            distance = calculate_distance(
                complaint_data['latitude'], complaint_data['longitude'],
                comp['latitude'], comp['longitude']
            )
            if distance < 500:
                nearby_count += 1
    
    density_factor = min(nearby_count * 0.3, 1.5)
    final_score = base_score + density_factor
    
    if final_score >= 4.5:
        return "Critical", "Critical"
    elif final_score >= 3.5:
        return "High", "High"
    elif final_score >= 2:
        return "Medium", "Medium"
    else:
        return "Low", "Low"

# ===== ENDPOINTS =====

# File upload configuration
ALLOWED_EXTENSIONS = {'jpg', 'jpeg', 'png', 'webp'}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

@api_router.get("/")
async def root():
    return {"message": "RoadFix API - AI-Powered Road Damage Reporting"}

@api_router.get("/health")
async def health_check():
    """Health check endpoint for connectivity testing"""
    try:
        # Test database connection
        await db.command('ping')
        return {
            "status": "ok",
            "message": "Backend is running and database is connected",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=503, detail="Service unavailable")

@api_router.post("/complaints/upload")
async def upload_image(file: UploadFile = File(...)):
    """Upload image for complaint with validation"""
    try:
        # Validate file extension
        if not file.filename:
            raise HTTPException(status_code=400, detail="No filename provided")
        
        file_extension = file.filename.split('.')[-1].lower()
        if file_extension not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid file type. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"
            )
        
        # Read file content and validate size
        content = await file.read()
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400, 
                detail=f"File too large. Maximum size: {MAX_FILE_SIZE // (1024*1024)}MB"
            )
        
        # Generate unique filename and save
        unique_filename = f"{uuid.uuid4()}.{file_extension}"
        file_path = UPLOADS_DIR / unique_filename
        
        with file_path.open("wb") as buffer:
            buffer.write(content)
        
        return {"imageUrl": f"/uploads/{unique_filename}"}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"File upload failed: {str(e)}")
        raise HTTPException(status_code=500, detail="File upload failed")

@api_router.post("/complaints", response_model=Complaint)
async def create_complaint(complaint: ComplaintCreate, imageUrl: Optional[str] = ""):
    """Create a new complaint with AI analysis"""
    complaint_dict = complaint.model_dump()
    complaint_dict['imageUrl'] = imageUrl
    
    ai_analysis = None
    if imageUrl:
        try:
            image_path = str(UPLOADS_DIR / imageUrl.split('/')[-1])
            ai_analysis = await analyze_image_with_ai(image_path, complaint.issueType)
            complaint_dict['aiAnalysis'] = ai_analysis
            
            severity, priority = await calculate_contextual_priority(complaint_dict, ai_analysis)
            complaint_dict['severity'] = severity
            complaint_dict['priority'] = priority
        except Exception as e:
            logging.error(f"AI analysis error: {e}")
            complaint_dict['severity'] = 'Medium'
            complaint_dict['priority'] = 'Medium'
    
    complaint_dict['statusHistory'] = [{
        'status': 'Pending',
        'timestamp': datetime.now(timezone.utc).isoformat(),
        'actor': 'System',
        'note': 'Report submitted by citizen'
    }]
    
    complaint_obj = Complaint(**complaint_dict)
    doc = complaint_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    
    await db.complaints.insert_one(doc)
    return complaint_obj

@api_router.get("/complaints", response_model=List[Complaint])
async def get_complaints(status: Optional[str] = None, userName: Optional[str] = None):
    """Get complaints with optional filters"""
    try:
        query = {}
        if status:
            query['status'] = status
        if userName:
            query['userName'] = userName
        
        complaints = await db.complaints.find(query, {"_id": 0}).to_list(1000)
        
        for complaint in complaints:
            if isinstance(complaint['timestamp'], str):
                complaint['timestamp'] = datetime.fromisoformat(complaint['timestamp'])
        
        return complaints
    except Exception as e:
        logger.error(f"Failed to fetch complaints: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch complaints")

@api_router.get("/complaints/user/{phone}")
async def get_user_complaints(phone: str):
    """Get all complaints by phone number"""
    try:
        complaints = await db.complaints.find(
            {"userPhone": phone}, 
            {"_id": 0}
        ).to_list(1000)
        
        for complaint in complaints:
            if isinstance(complaint['timestamp'], str):
                complaint['timestamp'] = datetime.fromisoformat(complaint['timestamp'])
        
        return complaints
    except Exception as e:
        logger.error(f"Failed to fetch user complaints: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch user complaints")

@api_router.patch("/complaints/{issue_id}", response_model=Complaint)
async def update_complaint(issue_id: str, update: ComplaintUpdate):
    """Update complaint (admin use)"""
    complaint = await db.complaints.find_one({"issueId": issue_id}, {"_id": 0})
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    
    if 'status' in update_data:
        status_entry = {
            'status': update_data['status'],
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'actor': 'Admin',
            'note': update_data.get('engineerNotes', '')
        }
        
        status_history = complaint.get('statusHistory', [])
        status_history.append(status_entry)
        update_data['statusHistory'] = status_history
    
    if update_data:
        await db.complaints.update_one(
            {"issueId": issue_id},
            {"$set": update_data}
        )
    
    updated_complaint = await db.complaints.find_one({"issueId": issue_id}, {"_id": 0})
    if isinstance(updated_complaint['timestamp'], str):
        updated_complaint['timestamp'] = datetime.fromisoformat(updated_complaint['timestamp'])
    
    return Complaint(**updated_complaint)

@api_router.post("/engineer/update")
async def engineer_update(update: EngineerUpdate):
    """Engineer updates status"""
    complaint = await db.complaints.find_one({"issueId": update.issueId}, {"_id": 0})
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    
    status_entry = {
        'status': update.status,
        'timestamp': datetime.now(timezone.utc).isoformat(),
        'actor': 'Engineer',
        'note': update.notes
    }
    
    status_history = complaint.get('statusHistory', [])
    status_history.append(status_entry)
    
    await db.complaints.update_one(
        {"issueId": update.issueId},
        {"$set": {
            "status": update.status,
            "engineerNotes": update.notes,
            "statusHistory": status_history
        }}
    )
    
    return {"message": "Status updated successfully"}

@api_router.get("/engineer/assigned/{engineer_name}")
async def get_engineer_tasks(engineer_name: str):
    """Get tasks assigned to engineer"""
    complaints = await db.complaints.find(
        {"assignedEngineer": engineer_name},
        {"_id": 0}
    ).to_list(1000)
    
    for complaint in complaints:
        if isinstance(complaint['timestamp'], str):
            complaint['timestamp'] = datetime.fromisoformat(complaint['timestamp'])
    
    return complaints

@api_router.get("/stats/dashboard")
async def get_dashboard_stats():
    """Get statistics for dashboard"""
    try:
        total = await db.complaints.count_documents({})
        pending = await db.complaints.count_documents({"status": "Pending"})
        assigned = await db.complaints.count_documents({"status": "Assigned"})
        in_progress = await db.complaints.count_documents({"status": "In Progress"})
        completed = await db.complaints.count_documents({"status": "Completed"})
        
        critical = await db.complaints.count_documents({"priority": "Critical"})
        high = await db.complaints.count_documents({"priority": "High"})
        
        return {
            "total": total,
            "by_status": {
                "pending": pending,
                "assigned": assigned,
                "in_progress": in_progress,
                "completed": completed
            },
            "high_priority": critical + high
        }
    except Exception as e:
        logger.error(f"Failed to fetch dashboard stats: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch dashboard statistics")

# Mount routers and middleware
app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")
app.include_router(api_router)

# Configure CORS - Allow all origins in development, specific origins in production
allowed_origins_env = os.environ.get('ALLOWED_ORIGINS', '')
if allowed_origins_env:
    # Production: use specific origins from environment
    allowed_origins = allowed_origins_env.split(',')
    logger.info(f"CORS configured for specific origins: {allowed_origins}")
else:
    # Development: allow all origins
    allowed_origins = ["*"]
    logger.warning("CORS configured to allow ALL origins (development mode). Set ALLOWED_ORIGINS for production!")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=allowed_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()