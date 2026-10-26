import jwt
from datetime import datetime, timedelta
from fastapi import HTTPException

SECRET_KEY = "attendsync_super_secret_key"
ALGORITHM = "HS256"

# The student's mobile app hits this (or generates it locally) to get a 30-second QR payload
def generate_secure_qr_payload(student_number: str):
    expire = datetime.utcnow() + timedelta(seconds=30)
    payload = {"sub": student_number, "exp": expire, "type": "qr_pass"}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

# The IoT Scanner / Web API uses this to verify the scan
def verify_qr_payload(token: str):
    try:
        decoded = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return decoded["sub"] # Returns the student_number if valid
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=400, detail="QR Code Expired. Please refresh.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=400, detail="Invalid QR Code.")