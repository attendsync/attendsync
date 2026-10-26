from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Date
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()

class Section(Base):
    __tablename__ = "sections"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    section_code = Column(String, unique=True, index=True, nullable=False)
    teacher_id = Column(String, nullable=False)

class Student(Base):
    __tablename__ = "students"
    id = Column(Integer, primary_key=True, index=True)
    student_number = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    program = Column(String, nullable=False)
    email = Column(String, unique=True)
    section_code = Column(String, ForeignKey("sections.section_code"))
    
    # Registration Columns (Nullable because teacher adds student first)
    password = Column(String, nullable=True)
    gender = Column(String, nullable=True)
    birthdate = Column(String, nullable=True)

class AttendanceLog(Base):
    __tablename__ = "attendance_logs"
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(String, ForeignKey("students.student_number"), nullable=False)
    section_code = Column(String, ForeignKey("sections.section_code"), nullable=False)
    status = Column(String, default="PRESENT")
    timestamp = Column(DateTime, default=datetime.utcnow)
    scan_date = Column(Date, default=datetime.utcnow().date)