import csv
import io
import os
import random
import json
import re  
from dotenv import load_dotenv
load_dotenv()
from datetime import date, datetime, timedelta 
from typing import List, Dict, Optional
from fastapi import FastAPI, Depends, WebSocket, WebSocketDisconnect, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from sqlalchemy import Column, Integer, String, DateTime
from pydantic import BaseModel
import jwt # PyJWT

# Import local modules
import models
import security
from database import SessionLocal, engine 

# --- JWT CONFIGURATION ---
SECRET_KEY = os.getenv("SECRET_KEY", "attendsync_secret_key_2026_super_secure_jwt")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 # 24 Hours

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta if expires_delta else timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

# --- DYNAMICALLY ADD OVERALL GRADE TABLE ---
class OverallGrade(models.Base):
    __tablename__ = "overall_grades"
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(String, index=True)
    section_code = Column(String, index=True)
    grading_period = Column(String)
    scores_data = Column(String) 
    timestamp = Column(DateTime, default=datetime.utcnow)

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="AttendSync API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

pending_verifications = {}

# --- PYDANTIC SCHEMAS ---
class ScanRequest(BaseModel):
    qr_token: str
    section_code: str

class OverallScanRequest(BaseModel):
    student_id: str
    section_code: str
    grading_period: str
    scores_data: str

class StudentCreate(BaseModel):
    student_number: str
    name: str
    program: str
    email: str
    section_code: str

class ClassCreate(BaseModel):
    name: str
    section_code: str
    teacher_id: str

class LoginRequest(BaseModel):
    school_id: str
    password: str
    role: str

class StudentRegister(BaseModel):
    student_number: str
    password: str
    email: str
    first_name: str
    last_name: str
    middle_name: str = ""
    birthdate: str
    gender: str
    program: str

class VerifyEmail(BaseModel):
    email: str
    code: str
    student_data: StudentRegister


# --- WEBSOCKET MANAGER ---
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, section_code: str):
        await websocket.accept()
        if section_code not in self.active_connections:
            self.active_connections[section_code] = []
        self.active_connections[section_code].append(websocket)

    def disconnect(self, websocket: WebSocket, section_code: str):
        if section_code in self.active_connections:
            self.active_connections[section_code].remove(websocket)

    async def broadcast_scan(self, section_code: str, scan_data: dict):
        if section_code in self.active_connections:
            for connection in self.active_connections[section_code]:
                await connection.send_json(scan_data)

manager = ConnectionManager()

@app.websocket("/ws/attendance/{section_code}")
async def websocket_endpoint(websocket: WebSocket, section_code: str):
    await manager.connect(websocket, section_code)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, section_code)


# --- REST ENDPOINTS (API) ---

# 1. Login Endpoint with JWT Token Generation
@app.post("/api/login")
async def login(credentials: LoginRequest, db: Session = Depends(get_db)):
    if credentials.role == "student":
        student = db.query(models.Student).filter(models.Student.student_number == credentials.school_id).first()
        
        if not student:
            raise HTTPException(status_code=404, detail="Student ID not found. Ask your teacher to enroll you first.")
        if not student.password:
            raise HTTPException(status_code=400, detail="Account not registered yet. Please click 'Register here' to set up your password.")
        if student.password != credentials.password:
            raise HTTPException(status_code=401, detail="Incorrect password.")
            
        token = create_access_token({"sub": student.student_number, "role": "student"})
        return {"msg": "Login successful", "access_token": token, "token_type": "bearer", "name": student.name}
        
    elif credentials.role == "teacher":
        if credentials.password == "admin123": 
            token = create_access_token({"sub": credentials.school_id, "role": "teacher"})
            return {"msg": "Teacher login successful", "access_token": token, "token_type": "bearer", "name": credentials.school_id}
        else:
            raise HTTPException(status_code=401, detail="Incorrect teacher password.")

# 2. Fetch Teacher's Classes
@app.get("/api/classes/{teacher_id}")
async def get_teacher_classes(teacher_id: str, db: Session = Depends(get_db)):
    classes = db.query(models.Section).filter(models.Section.teacher_id == teacher_id).all()
    result = []
    for cls in classes:
        student_count = db.query(models.Student).filter(models.Student.section_code == cls.section_code).count()
        result.append({
            "id": cls.id,
            "name": cls.name,
            "section": cls.section_code,
            "students": student_count
        })
    return result

# 3. Assign a New Class
@app.post("/api/classes")
async def create_class(class_data: ClassCreate, db: Session = Depends(get_db)):
    existing_section = db.query(models.Section).filter(models.Section.section_code == class_data.section_code).first()
    if existing_section:
        raise HTTPException(status_code=400, detail="Section code already exists.")

    new_class = models.Section(
        name=class_data.name,
        section_code=class_data.section_code,
        teacher_id=class_data.teacher_id
    )
    db.add(new_class)
    db.commit()
    db.refresh(new_class)
    return {"msg": "Class assigned successfully", "class": new_class}

# 4. Fetch the Official Class Roster
@app.get("/api/roster/{section_code}")
async def get_class_roster(section_code: str, db: Session = Depends(get_db)):
    students = db.query(models.Student).filter(models.Student.section_code == section_code).all()
    return students

# 5. Teacher Enrolls a New Student
@app.post("/api/students")
async def enroll_student(student_data: StudentCreate, db: Session = Depends(get_db)):
    existing_student = db.query(models.Student).filter(models.Student.student_number == student_data.student_number).first()
    if existing_student:
        raise HTTPException(status_code=400, detail="Student number already registered.")

    new_student = models.Student(
        student_number=student_data.student_number,
        name=student_data.name,
        program=student_data.program,
        email=student_data.email,
        section_code=student_data.section_code
    )
    db.add(new_student)
    db.commit()
    db.refresh(new_student)
    return {"msg": "Student enrolled successfully", "student": new_student}

# 6. Remove a Student
@app.delete("/api/students/{student_number}")
async def remove_student(student_number: str, db: Session = Depends(get_db)):
    student = db.query(models.Student).filter(models.Student.student_number == student_number).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")
    db.delete(student)
    db.commit()
    return {"msg": "Student removed successfully"}

# 7. Request Verification (Cloud Free-Tier Bypassed)
@app.post("/api/students/request-verification")
async def request_verification(student: StudentRegister, db: Session = Depends(get_db)):
    existing_student = db.query(models.Student).filter(models.Student.student_number == student.student_number).first()
    
    if not existing_student:
        raise HTTPException(status_code=404, detail="Student ID not found. Your teacher must enroll you in a class first.")
    if existing_student.password:
        raise HTTPException(status_code=400, detail="This Student ID is already registered. Please log in.")

    # Assign a universal bypass code for smooth cloud operations
    verification_code = "123456"
    pending_verifications[student.email] = verification_code

    return {"msg": "Verification code generated successfully", "debug_code": verification_code}

# 8. Verify Code and Create Account
@app.post("/api/students/verify-and-create")
async def verify_and_create(data: VerifyEmail, db: Session = Depends(get_db)):
    expected_code = pending_verifications.get(data.email)
    if not expected_code or expected_code != data.code:
        raise HTTPException(status_code=400, detail="Invalid or expired verification code. Use '123456'.")

    existing_student = db.query(models.Student).filter(models.Student.student_number == data.student_data.student_number).first()
    full_name = f"{data.student_data.first_name} {data.student_data.middle_name} {data.student_data.last_name}".replace("  ", " ").strip()
    
    existing_student.name = full_name
    existing_student.password = data.student_data.password
    existing_student.gender = data.student_data.gender
    existing_student.birthdate = data.student_data.birthdate
    existing_student.program = data.student_data.program

    db.commit()
    if data.email in pending_verifications:
        del pending_verifications[data.email]
    
    return {"msg": "Account registered successfully!"}

# 9. Process QR Scan (DAILY ATTENDANCE)
@app.post("/api/scan")
async def process_scan(scan_data: ScanRequest, db: Session = Depends(get_db)):
    pht_now = datetime.utcnow() + timedelta(hours=8)
    today_pht = pht_now.date()
    current_day_name = pht_now.strftime("%A") 

    SCHEDULE_MAP = {
        "LFAU411A031": "Wednesday",
        "LFAU411A032": "Saturday",
        "LFAU411A033": "Tuesday",
        "LFAU411A034": "Friday"
    }

    if scan_data.section_code in SCHEDULE_MAP:
        expected_day = SCHEDULE_MAP[scan_data.section_code]
        if current_day_name != expected_day:
            raise HTTPException(
                status_code=400, 
                detail=f"Class restricted: {scan_data.section_code} meets on {expected_day}s, but today is {current_day_name}."
            )

    qr_text = scan_data.qr_token.strip()
    student_number = qr_text 
    
    try:
        if qr_text.startswith("{"):
            qr_dict = json.loads(qr_text)
            student_number = qr_dict.get("student_id", qr_text)
    except Exception:
        match = re.search(r'"student_id"\s*:\s*"([^"]+)"', qr_text)
        if match:
            student_number = match.group(1)
            
    student_number = str(student_number).strip()

    student = db.query(models.Student).filter(models.Student.student_number == student_number).first()
    if not student:
        raise HTTPException(status_code=404, detail=f"Student ID '{student_number}' not found.")
    if student.section_code != scan_data.section_code:
        raise HTTPException(status_code=400, detail="Student is not enrolled in this section.")

    existing_log = db.query(models.AttendanceLog).filter(
        models.AttendanceLog.student_id == student_number,
        models.AttendanceLog.section_code == scan_data.section_code,
        models.AttendanceLog.scan_date == today_pht
    ).first()

    if existing_log:
        raise HTTPException(status_code=400, detail="Student already scanned today.")
    
    new_log = models.AttendanceLog(
        student_id=student_number, 
        section_code=scan_data.section_code,
        scan_date=today_pht,
        timestamp=pht_now 
    )
    db.add(new_log)
    db.commit()
    db.refresh(new_log)
    
    live_data = {
        "studentId": student.student_number,
        "name": student.name,
        "type": "QR Pass",
        "status": "SUCCESS",
        "time": pht_now.strftime("%I:%M %p")
    }
    await manager.broadcast_scan(scan_data.section_code, live_data)
    
    return {"msg": "Scan successful", "data": live_data}

# 10. Process Overall Compilation Scan
@app.post("/api/scan/overall")
async def process_overall_scan(scan_data: OverallScanRequest, db: Session = Depends(get_db)):
    pht_now = datetime.utcnow() + timedelta(hours=8)
    
    student = db.query(models.Student).filter(models.Student.student_number == scan_data.student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")
    if student.section_code != scan_data.section_code:
        raise HTTPException(status_code=400, detail="Section mismatch. Student belongs to another section.")

    existing = db.query(OverallGrade).filter(
        OverallGrade.student_id == scan_data.student_id,
        OverallGrade.section_code == scan_data.section_code,
        OverallGrade.grading_period == scan_data.grading_period
    ).first()

    if existing:
        existing.scores_data = scan_data.scores_data
        existing.timestamp = pht_now
    else:
        new_grade = OverallGrade(
            student_id=scan_data.student_id,
            section_code=scan_data.section_code,
            grading_period=scan_data.grading_period,
            scores_data=scan_data.scores_data,
            timestamp=pht_now
        )
        db.add(new_grade)
    
    db.commit()
    
    live_data = {
        "studentId": student.student_number,
        "name": student.name,
        "type": f"{scan_data.grading_period} Compilation",
        "status": "SAVED",
        "time": pht_now.strftime("%I:%M %p")
    }
    await manager.broadcast_scan(scan_data.section_code, live_data)
    
    return {"msg": "Compilation saved successfully", "data": live_data}

# 11. Fetch Overall Compilation Grades
@app.get("/api/grades/{section_code}")
async def get_overall_grades(section_code: str, db: Session = Depends(get_db)):
    grades = db.query(OverallGrade, models.Student).join(
        models.Student, OverallGrade.student_id == models.Student.student_number
    ).filter(OverallGrade.section_code == section_code).order_by(OverallGrade.timestamp.desc()).all()

    result = []
    for grade, student in grades:
        result.append({
            "id": grade.id,
            "student_id": grade.student_id,
            "name": student.name,
            "grading_period": grade.grading_period,
            "scores_data": grade.scores_data,
            "timestamp": grade.timestamp.strftime("%Y-%m-%d %I:%M %p")
        })
    return result

# 12. Export Daily Attendance to CSV (FIXED FOR POSTGRESQL DATE PARSING)
@app.get("/api/export/attendance/{section_code}")
async def export_attendance_csv(section_code: str, date_filter: str, db: Session = Depends(get_db)):
    try:
        parsed_date = datetime.strptime(date_filter, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Expected YYYY-MM-DD.")

    logs = db.query(models.AttendanceLog, models.Student).join(
        models.Student, models.AttendanceLog.student_id == models.Student.student_number
    ).filter(
        models.AttendanceLog.section_code == section_code,
        models.AttendanceLog.scan_date == parsed_date
    ).all()

    if not logs:
        raise HTTPException(status_code=404, detail="No records found for this date and section.")

    stream = io.StringIO()
    csv_writer = csv.writer(stream)
    csv_writer.writerow(["Student ID", "Name", "Section", "Date", "Time", "Status"])
    for log, student in logs:
        csv_writer.writerow([
            log.student_id, student.name, log.section_code, 
            log.scan_date, log.timestamp.strftime("%I:%M %p"), getattr(log, 'status', 'PRESENT')
        ])
    
    stream.seek(0)
    response = StreamingResponse(iter([stream.getvalue()]), media_type="text/csv")
    response.headers["Content-Disposition"] = f"attachment; filename=Attendance_{section_code}_{date_filter}.csv"
    return response

# 13. Export Overall Gradebook to CSV
@app.get("/api/export/grades/{section_code}")
async def export_grades_csv(section_code: str, db: Session = Depends(get_db)):
    grades = db.query(OverallGrade, models.Student).join(
        models.Student, OverallGrade.student_id == models.Student.student_number
    ).filter(OverallGrade.section_code == section_code).all()

    if not grades:
        raise HTTPException(status_code=404, detail="No overall grade compilation records found for this section.")

    stream = io.StringIO()
    csv_writer = csv.writer(stream)
    csv_writer.writerow([
        "Student ID", "Name", "Section", "Grading Period",
        "Quiz 1", "Quiz 2", "Quiz 3", "Quiz 4",
        "Recitation 1", "Recitation 2", "Recitation 3", "Recitation 4",
        "Project 1", "Project 2", "Project 3", "Project 4",
        "Attendance 1", "Attendance 2", "Attendance 3", "Attendance 4",
        "Saved Timestamp"
    ])
    
    for grade, student in grades:
        try:
            data = json.loads(grade.scores_data)
            scores = data.get("scores", {})
            attendance = data.get("attendance", {})
            
            quizzes = [scores.get("quiz", {}).get(str(i), scores.get("quiz", {}).get(i, "")) for i in range(1, 5)]
            recitations = [scores.get("recitation", {}).get(str(i), scores.get("recitation", {}).get(i, "")) for i in range(1, 5)]
            projects = [scores.get("project", {}).get(str(i), scores.get("project", {}).get(i, "")) for i in range(1, 5)]
            att_checks = ["PRESENT" if attendance.get(str(i), attendance.get(i, False)) else "ABSENT" for i in range(1, 5)]

            csv_writer.writerow([
                grade.student_id, student.name, grade.section_code, grade.grading_period,
                *quizzes, *recitations, *projects, *att_checks,
                grade.timestamp.strftime("%Y-%m-%d %I:%M %p")
            ])
        except Exception:
            continue

    stream.seek(0)
    response = StreamingResponse(iter([stream.getvalue()]), media_type="text/csv")
    response.headers["Content-Disposition"] = f"attachment; filename=Gradebook_{section_code}.csv"
    return response

# 14. Student Portal Dashboard Data
@app.get("/api/student/dashboard/{student_number}")
async def get_student_dashboard(student_number: str, db: Session = Depends(get_db)):
    student = db.query(models.Student).filter(models.Student.student_number == student_number).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    section = db.query(models.Section).filter(models.Section.section_code == student.section_code).first()
    logs = db.query(models.AttendanceLog).filter(
        models.AttendanceLog.student_id == student_number
    ).order_by(models.AttendanceLog.timestamp.desc()).all()

    return {
        "student_number": student.student_number,
        "name": student.name,
        "program": student.program,
        "subjects": [
            {
                "name": section.name if section else "Unknown Subject",
                "section_code": student.section_code,
                "teacher_id": section.teacher_id if section else "Unknown",
                "total_present": len([log for log in logs if getattr(log, 'status', 'PRESENT') == "PRESENT"])
            }
        ] if student.section_code else [],
        "recent_activity": [
            {
                "id": log.id,
                "date": log.scan_date.strftime("%b %d, %Y") if log.scan_date else "N/A",
                "time": log.timestamp.strftime("%I:%M %p") if log.timestamp else "N/A",
                "status": getattr(log, 'status', 'PRESENT'),
                "subject": section.name if section else "Unknown"
            } for log in logs
        ]
    }