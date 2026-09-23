import sys
import os
import pytest

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.db.session import engine, SessionLocal
from app.db.base import Base
from app.db.seed import seed_database

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    seed_database(db)
    db.close()
    yield
