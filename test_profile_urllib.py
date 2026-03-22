#!/usr/bin/env python3
import urllib.request
import json

def test_profile_api():
    """Test API profile endpoint"""
    
    # Login
    login_data = json.dumps({"username": "educator_1", "password": "password123"}).encode()
    req = urllib.request.Request(
        'http://api:8000/auth/login',
        data=login_data,
        headers={'Content-Type': 'application/json'},
        method='POST'
    )
    
    try:
        with urllib.request.urlopen(req) as response:
            login_result = json.loads(response.read())
            print(f"✅ Login successful")
            token = login_result.get('access_token')
            
            # Get Profile
            req2 = urllib.request.Request(
                'http://api:8000/auth/profile',
                headers={'Authorization': f'Bearer {token}'}
            )
            
            with urllib.request.urlopen(req2) as response2:
                profile = json.loads(response2.read())
                print(f"\n✅ Profile retrieved:")
                print(json.dumps(profile, indent=2, ensure_ascii=False, default=str))
                
                if profile.get('organization'):
                    print(f"\n✅ Organization present!")
                    print(f"   Name: {profile['organization'].get('name')}")
                    print(f"   INN: {profile['organization'].get('inn')}")
                else:
                    print(f"\n❌ Organization is null!")
    except urllib.error.HTTPError as e:
        print(f"Error: {e.read().decode()}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    test_profile_api()
