import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.db.session import SessionLocal
from app.db.models import User, Role
from app.core.security import create_access_token

client = TestClient(app)

@pytest.fixture(scope="module")
def db_session():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()

@pytest.fixture(scope="module")
def super_admin_token(db_session: Session):
    admin = db_session.query(User).filter(User.email == "admin@ambedkar-archive.gov.in").first()
    if not admin:
        role = db_session.query(Role).filter(Role.name == "SUPER_ADMIN").first()
        admin = User(
            email="admin@ambedkar-archive.gov.in",
            full_name="National Archive Director",
            hashed_password="mock",
            role_id=role.id,
            is_active=True
        )
        db_session.add(admin)
        db_session.commit()
        db_session.refresh(admin)
    return create_access_token(subject=admin.id, role="SUPER_ADMIN")

def test_list_admin_users(super_admin_token: str):
    res = client.get(
        "/api/v1/admin/users",
        headers={"Authorization": f"Bearer {super_admin_token}"}
    )
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    emails = [u["email"] for u in data]
    assert "admin@ambedkar-archive.gov.in" in emails

def test_create_and_manage_admin_user(super_admin_token: str, db_session: Session):
    import uuid
    rand_email = f"curator_{uuid.uuid4().hex[:6]}@archive.gov.in"

    # 1. Create user
    res = client.post(
        "/api/v1/admin/users",
        headers={"Authorization": f"Bearer {super_admin_token}"},
        json={
            "email": rand_email,
            "full_name": "Special Assistant Curator",
            "password": "SecurePassword123!",
            "role_name": "RESEARCHER",
            "is_active": True
        }
    )
    assert res.status_code == 200
    user_data = res.json()
    user_id = user_data["id"]
    assert user_data["email"] == rand_email
    assert user_data["role"]["name"] == "RESEARCHER"
    assert user_data["is_active"] is True

    # 2. Update status
    res = client.put(
        f"/api/v1/admin/users/{user_id}/status",
        headers={"Authorization": f"Bearer {super_admin_token}"},
        json={"is_active": False}
    )
    assert res.status_code == 200
    assert res.json()["is_active"] is False

    # 3. Update role
    res = client.put(
        f"/api/v1/admin/users/{user_id}/role",
        headers={"Authorization": f"Bearer {super_admin_token}"},
        json={"role_name": "REVIEWER"}
    )
    assert res.status_code == 200
    assert res.json()["role"]["name"] == "REVIEWER"

def test_unauthorized_user_management():
    # No auth
    res = client.get("/api/v1/admin/users")
    assert res.status_code in (401, 403)

    # Visitor token with non-existent or unprivileged subject
    visitor_token = create_access_token(subject="999", role="VISITOR")
    res = client.get(
        "/api/v1/admin/users",
        headers={"Authorization": f"Bearer {visitor_token}"}
    )
    assert res.status_code in (401, 403)
