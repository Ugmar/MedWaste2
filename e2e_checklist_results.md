# E2E Checklist Results

- Date (UTC): 2026-03-22T06:08:21.946601
- Environment: docker-compose (postgres + api + nginx)
- API base: http://localhost:8000
- Total checks: 28
- Passed: 28
- Failed: 0

| # | Check | Result | Details |
|---|---|---|---|
| 1 | AUTH admin | PASS | status=200 |
| 2 | AUTH educator | PASS | status=200 |
| 3 | AUTH driver | PASS | status=200 |
| 4 | AUTH processor | PASS | status=200 |
| 5 | AUTH inspector | PASS | status=200 |
| 6 | PROFILE admin | PASS | status=200, role=admin |
| 7 | PROFILE educator | PASS | status=200, role=educator |
| 8 | PROFILE driver | PASS | status=200, role=driver |
| 9 | PROFILE processor | PASS | status=200, role=processor |
| 10 | PROFILE inspector | PASS | status=200, role=inspector |
| 11 | EDUCATOR get directories | PASS | waste_types=9, orgs=8 |
| 12 | EDUCATOR get processor drivers | PASS | status=200, count=1 |
| 13 | EDUCATOR create batch | PASS | status=200 |
| 14 | EDUCATOR generate QR token | PASS | status=200 |
| 15 | DRIVER scan QR | PASS | status=200 |
| 16 | DRIVER confirm pickup | PASS | status=200, payload={'message': 'Партия передана водителю', 'batch_id': 'a801d3ae-3ad9-418f-8f23-f0c97bf3bfc1', 'new_status': 'in_transit'} |
| 17 | PROCESSOR sees assigned batch | PASS | status=200, found=True |
| 18 | PROCESSOR receive batch | PASS | status=200, payload={'message': 'Партия принята переработчиком', 'batch_id': 'a801d3ae-3ad9-418f-8f23-f0c97bf3bfc1', 'new_status': 'received', 'received_at': '2026-03-22T06:08:21.530419'} |
| 19 | INSPECTOR summary | PASS | status=200 |
| 20 | INSPECTOR read waste-batches | PASS | status=200, count=69 |
| 21 | INSPECTOR export CSV | PASS | status=200, content-type=text/csv; charset=utf-8 |
| 22 | ADMIN create organization | PASS | status=200 |
| 23 | ADMIN create waste type | PASS | status=200 |
| 24 | ADMIN create user | PASS | status=200 |
| 25 | ACCESS educator cannot read admin organizations | PASS | status=403, payload={'detail': 'Доступ запрещен для вашей роли'} |
| 26 | ACCESS driver cannot read inspector summary | PASS | status=403, payload={'detail': 'Доступ запрещен для вашей роли'} |
| 27 | ACCESS inspector cannot create admin entities | PASS | status=403, payload={'detail': 'Доступ запрещен для вашей роли'} |
| 28 | EDUCATOR export CSV | PASS | status=200, content-type=text/csv; charset=utf-8 |
