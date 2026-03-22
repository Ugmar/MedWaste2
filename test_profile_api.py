#!/usr/bin/env python3
import json
import sys
sys.path.insert(0, '/app')

def test_profile():
    """Протестировать profile endpoint"""
    from fastapi.testclient import TestClient
    from app.main import app
    
    client = TestClient(app)
    
    # Логин
    login_response = client.post(
        "/api/auth/login",
        json={"username": "educator_1", "password": "password123"}
    )
    
    print(f"Login Status: {login_response.status_code}")
    if login_response.status_code != 200:
        print(f"Login failed: {login_response.text}")
        return
    
    login_data = login_response.json()
    print(f"✅ Login successful")
    print(f"   Token: {login_data.get('access_token')[:30]}...")
    
    # Profile
    token = login_data.get('access_token')
    profile_response = client.get(
        "/api/auth/profile",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    print(f"\nProfile Status: {profile_response.status_code}")
    if profile_response.status_code != 200:
        print(f"Profile failed: {profile_response.text}")
        return
    
    profile = profile_response.json()
    print(f"✅ Profile retrieved:")
    print(json.dumps(profile, indent=2, ensure_ascii=False, default=str))
    
    if profile.get('organization'):
        print(f"\n✅ Organization present in profile!")
        print(f"   Name: {profile['organization'].get('name')}")
    else:
        print(f"\n❌ Organization is null in profile!")

# Запустить тест
test_profile()
