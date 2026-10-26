import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base
from dotenv import load_dotenv

# Load environment variables from a .env file (if you have one)
load_dotenv()

# PostgreSQL connection string
# Format: postgresql://<username>:<password>@<host>:<port>/<database_name>
# We use a fallback default for local development if the .env variable is missing
SQLALCHEMY_DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "postgresql://postgres:your_password@localhost:5432/attendsync_db"
)

# Create the SQLAlchemy engine
# This is the core interface to the database
engine = create_engine(SQLALCHEMY_DATABASE_URL)

# Create a configured "Session" class
# autocommit=False prevents accidental saves; we manually call db.commit()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create a Base class for our models (in models.py) to inherit from
Base = declarative_base()