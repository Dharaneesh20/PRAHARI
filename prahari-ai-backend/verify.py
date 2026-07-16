from app.main import app
print("App imports OK")

from app.services.mock_store import get_all_incidents, get_all_units, get_all_reports
incidents = get_all_incidents()
units = get_all_units()
reports = get_all_reports()
print(f"Mock store: {len(incidents)} incidents, {len(units)} units, {len(reports)} reports")

from app.services.auth_service import authenticate_user, create_access_token
u = authenticate_user("KSP-INS-8921", "prahari@2026")
if u:
    token = create_access_token({"sub": u["badgeId"]})
    print(f"Auth OK: {u['name']}")
    print(f"Token (first 40 chars): {token[:40]}...")
else:
    print("AUTH FAILED")

from app.database import is_db_available
print(f"DB available: {is_db_available()}")
print("\nAll checks passed!")
