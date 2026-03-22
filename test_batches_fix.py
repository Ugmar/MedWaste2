#!/usr/bin/env python3
import urllib.request
import json

try:
    # Login first
    login_data = json.dumps({"username": "educator_1", "password": "password123"}).encode()
    req = urllib.request.Request(
        'http://api:8000/auth/login',
        data=login_data,
        headers={'Content-Type': 'application/json'},
        method='POST'
    )
    
    with urllib.request.urlopen(req) as response:
        login_result = json.loads(response.read())
        token = login_result.get('access_token')
        
        # Get batches
        req2 = urllib.request.Request(
            'http://api:8000/educator/batches?skip=0&limit=10',
            headers={'Authorization': f'Bearer {token}'}
        )
        
        with urllib.request.urlopen(req2) as response2:
            batches = json.loads(response2.read())
            print(f"✅ Batches endpoint working!")
            print(f"   Total batches: {len(batches)}")
            if batches:
                print(f"   First batch driver_id: {batches[0].get('driver_id')}")
except Exception as e:
    print(f"❌ Error: {e}")
