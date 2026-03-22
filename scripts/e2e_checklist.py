#!/usr/bin/env python3
import json
import urllib.request
import urllib.error
from datetime import datetime

BASE = 'http://localhost:8000'
REPORT_PATH = '/app/e2e_checklist_results.md'
results = []
ctx = {}


def add(name, ok, detail=''):
    results.append((name, ok, detail))


def request(method, path, token=None, data=None, expect_json=True):
    url = BASE + path
    headers = {}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    body = None
    if data is not None:
        body = json.dumps(data).encode('utf-8')
        headers['Content-Type'] = 'application/json'

    req = urllib.request.Request(
        url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            raw = resp.read()
            ctype = resp.headers.get('Content-Type', '')
            if expect_json and 'application/json' in ctype:
                return resp.status, json.loads(raw.decode('utf-8')), ctype
            return resp.status, raw.decode('utf-8', errors='replace'), ctype
    except urllib.error.HTTPError as e:
        raw = e.read().decode('utf-8', errors='replace')
        try:
            payload = json.loads(raw)
        except Exception:
            payload = raw
        return e.code, payload, e.headers.get('Content-Type', '')


users = {
    'admin': 'admin',
    'educator': 'educator_1',
    'driver': 'driver_1',
    'processor': 'processor_1',
    'inspector': 'inspector_1',
}

tokens = {}
for role, username in users.items():
    status, payload, _ = request(
        'POST', '/auth/login', data={'username': username, 'password': 'password123'})
    ok = status == 200 and isinstance(
        payload, dict) and payload.get('access_token')
    add(f'AUTH {role}', ok, f'status={status}')
    if ok:
        tokens[role] = payload['access_token']

for role in ['admin', 'educator', 'driver', 'processor', 'inspector']:
    t = tokens.get(role)
    if not t:
        add(f'PROFILE {role}', False, 'no token')
        continue
    status, payload, _ = request('GET', '/auth/profile', token=t)
    ok = status == 200 and payload.get('role') == role
    add(f'PROFILE {role}', ok,
        f"status={status}, role={payload.get('role') if isinstance(payload, dict) else payload}")

if tokens.get('educator'):
    et = tokens['educator']
    s1, waste_types, _ = request(
        'GET', '/waste-types?skip=0&limit=100', token=et)
    s2, orgs, _ = request('GET', '/organizations?skip=0&limit=100', token=et)
    ok_dirs = s1 == 200 and s2 == 200 and isinstance(waste_types, list) and isinstance(
        orgs, list) and len(waste_types) > 0 and len(orgs) > 0
    add('EDUCATOR get directories', ok_dirs,
        f'waste_types={len(waste_types) if isinstance(waste_types, list) else "?"}, orgs={len(orgs) if isinstance(orgs, list) else "?"}')

    processor_org = None
    if isinstance(orgs, list):
        for o in orgs:
            n = (o.get('name') or '').lower()
            if 'эко' in n or 'переработ' in n or 'утилиз' in n:
                processor_org = o
                break
        if processor_org is None and orgs:
            processor_org = orgs[0]

    waste_type = waste_types[0] if isinstance(
        waste_types, list) and waste_types else None

    if processor_org and waste_type:
        s3, drivers, _ = request(
            'GET', f"/educator/drivers?processor_organization_id={processor_org['id']}&skip=0&limit=100", token=et)
        ok_drivers = s3 == 200 and isinstance(
            drivers, list) and len(drivers) > 0
        add('EDUCATOR get processor drivers', ok_drivers,
            f'status={s3}, count={len(drivers) if isinstance(drivers, list) else "?"}')

        if ok_drivers:
            driver = drivers[0]
            batch_payload = {
                'waste_type_id': waste_type['id'],
                'driver_id': driver['id'],
                'processor_organization_id': processor_org['id'],
                'quantity': 12.5,
                'unit': 'кг',
                'pickup_address': 'г. Москва, ул. Тестовая, 1',
                'delivery_address': 'г. Москва, ул. Заводская, 10',
            }
            s4, created_batch, _ = request(
                'POST', '/educator/batches', token=et, data=batch_payload)
            ok_create = s4 == 200 and isinstance(
                created_batch, dict) and created_batch.get('id')
            add('EDUCATOR create batch', ok_create, f'status={s4}')
            if ok_create:
                ctx['batch_id'] = created_batch['id']
                s5, qr, _ = request('POST', f"/educator/batches/{ctx['batch_id']}/qr-tokens", token=et, data={
                                    'batch_id': ctx['batch_id'], 'lifetime_days': 3})
                ok_qr = s5 == 200 and isinstance(qr, dict) and qr.get('token')
                add('EDUCATOR generate QR token', ok_qr, f'status={s5}')
                if ok_qr:
                    ctx['qr_token'] = qr['token']

if tokens.get('driver') and ctx.get('qr_token') and ctx.get('batch_id'):
    dt = tokens['driver']
    s6, scan, _ = request('POST', '/driver/scan-qr',
                          token=dt, data={'token': ctx['qr_token']})
    ok_scan = s6 == 200 and isinstance(scan, dict) and str(
        scan.get('batch_id')) == str(ctx['batch_id'])
    add('DRIVER scan QR', ok_scan, f'status={s6}')

    s7, pickup, _ = request(
        'POST', f"/driver/batch/{ctx['batch_id']}/pickup?token={ctx['qr_token']}", token=dt)
    ok_pickup = s7 == 200 and isinstance(
        pickup, dict) and pickup.get('new_status') == 'in_transit'
    add('DRIVER confirm pickup', ok_pickup, f'status={s7}, payload={pickup}')

if tokens.get('processor') and ctx.get('batch_id'):
    pt = tokens['processor']
    s8, assigned, _ = request(
        'GET', '/processor/assigned-batches?skip=0&limit=200', token=pt)
    found = False
    if isinstance(assigned, list):
        found = any(str(b.get('id')) == str(ctx['batch_id']) for b in assigned)
    add('PROCESSOR sees assigned batch', s8 ==
        200 and found, f'status={s8}, found={found}')

    s9, rec, _ = request(
        'POST', f"/processor/batches/{ctx['batch_id']}/receive", token=pt)
    ok_rec = s9 == 200 and isinstance(
        rec, dict) and rec.get('new_status') == 'received'
    add('PROCESSOR receive batch', ok_rec, f'status={s9}, payload={rec}')

if tokens.get('inspector'):
    it = tokens['inspector']
    s10, summary, _ = request('GET', '/inspector/summary', token=it)
    ok_sum = s10 == 200 and isinstance(
        summary, dict) and 'total_batches' in summary
    add('INSPECTOR summary', ok_sum, f'status={s10}')

    s11, wb, _ = request(
        'GET', '/inspector/waste-batches?skip=0&limit=200', token=it)
    ok_wb = s11 == 200 and isinstance(wb, list)
    add('INSPECTOR read waste-batches', ok_wb,
        f'status={s11}, count={len(wb) if isinstance(wb, list) else "?"}')

    s12, csv_data, ctype = request(
        'GET', '/inspector/reports/batches/csv', token=it, expect_json=False)
    ok_csv = s12 == 200 and 'text/csv' in ctype and isinstance(
        csv_data, str) and 'batch_id' in csv_data.splitlines()[0]
    add('INSPECTOR export CSV', ok_csv, f'status={s12}, content-type={ctype}')

if tokens.get('admin'):
    at = tokens['admin']
    uniq = datetime.utcnow().strftime('%H%M%S')
    inn = f'99{uniq}0000'
    kpp = f'99{uniq}001'[:9]

    s13, new_org, _ = request('POST', '/admin/organizations', token=at,
                              data={'inn': inn, 'kpp': kpp, 'name': f'E2E Org {uniq}'})
    ok_org = s13 == 200 and isinstance(new_org, dict) and new_org.get('id')
    add('ADMIN create organization', ok_org, f'status={s13}')

    s14, new_wt, _ = request('POST', '/admin/waste-types', token=at, data={
                             'code': f'E2E_{uniq}', 'name': f'E2E Waste {uniq}', 'waste_class': 'class_4', 'description': 'e2e'})
    ok_wt = s14 == 200 and isinstance(new_wt, dict) and new_wt.get('id')
    add('ADMIN create waste type', ok_wt, f'status={s14}')

    if ok_org:
        username = f'e2e_user_{uniq}'
        s15, new_user, _ = request('POST', '/admin/users', token=at, data={
            'username': username,
            'email': f'{username}@example.com',
            'full_name': 'E2E User',
            'role': 'inspector',
            'password': 'password123',
            'organization_id': new_org['id'],
        })
        ok_user = s15 == 200 and isinstance(
            new_user, dict) and new_user.get('id')
        add('ADMIN create user', ok_user, f'status={s15}')

if tokens.get('educator'):
    s16, payload, _ = request(
        'GET', '/admin/organizations', token=tokens['educator'])
    add('ACCESS educator cannot read admin organizations',
        s16 in (401, 403), f'status={s16}, payload={payload}')

if tokens.get('driver'):
    s17, payload, _ = request(
        'GET', '/inspector/summary', token=tokens['driver'])
    add('ACCESS driver cannot read inspector summary',
        s17 in (401, 403), f'status={s17}, payload={payload}')

if tokens.get('inspector'):
    s18, payload, _ = request('POST', '/admin/waste-types', token=tokens['inspector'], data={
                              'code': 'NOPE', 'name': 'Nope', 'waste_class': 'class_5', 'description': ''})
    add('ACCESS inspector cannot create admin entities',
        s18 in (401, 403), f'status={s18}, payload={payload}')

if tokens.get('educator'):
    s19, csv_data, ctype = request(
        'GET', '/educator/reports/batches/csv', token=tokens['educator'], expect_json=False)
    ok_ecsv = s19 == 200 and 'text/csv' in ctype and isinstance(
        csv_data, str) and 'batch_id' in csv_data.splitlines()[0]
    add('EDUCATOR export CSV', ok_ecsv, f'status={s19}, content-type={ctype}')

passed = sum(1 for _, ok, _ in results if ok)
failed = len(results) - passed

lines = [
    '# E2E Checklist Results',
    '',
    f'- Date (UTC): {datetime.utcnow().isoformat()}',
    '- Environment: docker-compose (postgres + api + nginx)',
    f'- API base: {BASE}',
    f'- Total checks: {len(results)}',
    f'- Passed: {passed}',
    f'- Failed: {failed}',
    '',
    '| # | Check | Result | Details |',
    '|---|---|---|---|',
]

for i, (name, ok, detail) in enumerate(results, 1):
    lines.append(
        f"| {i} | {name} | {'PASS' if ok else 'FAIL'} | {str(detail).replace('|', '/').replace(chr(10), ' ')} |")

with open(REPORT_PATH, 'w', encoding='utf-8') as f:
    f.write('\n'.join(lines) + '\n')

print(f'CHECKS_TOTAL={len(results)}')
print(f'CHECKS_PASSED={passed}')
print(f'CHECKS_FAILED={failed}')
print(f'REPORT_PATH={REPORT_PATH}')
if failed:
    print('FAILED_CHECKS:')
    for name, ok, detail in results:
        if not ok:
            print(f'- {name}: {detail}')
