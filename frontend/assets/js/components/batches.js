class BatchesComponent {
    async render() {
        const container = document.createElement('div');
        container.className = 'container-lg';

        try {
            const profile = await api.getProfile();

            if (profile.role === 'educator') {
                await this.renderEducator(container);
            } else if (profile.role === 'driver') {
                await this.renderDriver(container);
            } else if (profile.role === 'processor') {
                await this.renderProcessor(container);
            } else if (profile.role === 'inspector') {
                await this.renderInspector(container);
            } else {
                await this.renderAdmin(container);
            }
        } catch (error) {
            container.innerHTML = `<div class="alert alert-danger mt-4">Ошибка: ${error.message}</div>`;
        }

        return container;
    }

    statusBadge(status) {
        const map = {
            created: 'info',
            in_transit: 'warning',
            received: 'success',
        };
        return `<span class="badge bg-${map[status] || 'secondary'}">${status}</span>`;
    }

    async renderEducator(container) {
        const [batches, wasteTypes, organizations] = await Promise.all([
            api.getEducatorBatches(),
            api.getWasteTypes(),
            api.getOrganizations(),
        ]);

        container.innerHTML = `
            <div class="row mb-4">
                <div class="col-md-8">
                    <h1 class="fw-bold"><i class="bi bi-boxes"></i> Партии образователя</h1>
                </div>
                <div class="col-md-4 text-end d-flex justify-content-end gap-2">
                    <button class="btn btn-outline-secondary" id="download-educator-csv">CSV</button>
                    <button class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#createBatchModal">Новая партия</button>
                </div>
            </div>

            <div class="card mb-4">
                <div class="card-body table-responsive">
                    <table class="table table-hover align-middle">
                        <thead><tr><th>ID</th><th>Тип</th><th>Количество</th><th>Статус</th><th>Действия</th></tr></thead>
                        <tbody>
                            ${batches.length ? batches.map((b) => `
                                <tr>
                                    <td>${b.id.slice(0, 8)}</td>
                                    <td>${b.waste_type?.name || '-'}</td>
                                    <td>${b.quantity} ${b.unit}</td>
                                    <td>${this.statusBadge(b.status)}</td>
                                    <td><button class="btn btn-sm btn-outline-primary" data-action="qr" data-id="${b.id}">QR</button></td>
                                </tr>
                            `).join('') : '<tr><td colspan="5" class="text-center text-muted">Нет партий</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="modal fade" id="createBatchModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Создание партии</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <form id="educator-create-batch-form">
                            <div class="modal-body">
                                <div class="row g-3">
                                    <div class="col-md-6">
                                        <label class="form-label">Тип отходов</label>
                                        <select class="form-select" id="waste_type_id" required>
                                            ${wasteTypes.map((w) => `<option value="${w.id}">${w.name} (${w.waste_class})</option>`).join('')}
                                        </select>
                                    </div>
                                    <div class="col-md-3">
                                        <label class="form-label">Количество</label>
                                        <input class="form-control" type="number" step="0.01" min="0.01" id="quantity" required>
                                    </div>
                                    <div class="col-md-3">
                                        <label class="form-label">Единица</label>
                                        <select class="form-select" id="unit" required>
                                            <option value="кг">кг</option>
                                            <option value="л">л</option>
                                            <option value="шт">шт</option>
                                        </select>
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label">Организация-переработчик</label>
                                        <select class="form-select" id="processor_org" required>
                                            <option value="">Выберите...</option>
                                            ${organizations.map((o) => `<option value="${o.id}">${o.name}</option>`).join('')}
                                        </select>
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label">Водитель</label>
                                        <select class="form-select" id="driver_id" required>
                                            <option value="">Сначала выберите переработчика</option>
                                        </select>
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label">Адрес вывоза</label>
                                        <input class="form-control" id="pickup_address" required>
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label">Адрес доставки</label>
                                        <input class="form-control" id="delivery_address" required>
                                    </div>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button class="btn btn-secondary" type="button" data-bs-dismiss="modal">Отмена</button>
                                <button class="btn btn-primary" type="submit">Создать</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;

        container.querySelector('#download-educator-csv').addEventListener('click', async () => {
            try {
                await api.downloadCsv(api.getEducatorBatchesReportUrl(), 'educator_batches_report.csv');
            } catch (error) {
                alert(error.message);
            }
        });

        const processorSelect = container.querySelector('#processor_org');
        const driversSelect = container.querySelector('#driver_id');

        processorSelect.addEventListener('change', async () => {
            const orgId = processorSelect.value;
            if (!orgId) {
                driversSelect.innerHTML = '<option value="">Сначала выберите переработчика</option>';
                return;
            }
            try {
                const drivers = await api.getAvailableDrivers(orgId);
                driversSelect.innerHTML = drivers.length
                    ? drivers.map((d) => `<option value="${d.id}">${d.full_name || d.username}</option>`).join('')
                    : '<option value="">Водители не найдены</option>';
            } catch (error) {
                driversSelect.innerHTML = '<option value="">Ошибка загрузки водителей</option>';
            }
        });

        container.querySelector('#educator-create-batch-form').addEventListener('submit', async (event) => {
            event.preventDefault();
            try {
                const payload = {
                    waste_type_id: container.querySelector('#waste_type_id').value,
                    quantity: Number(container.querySelector('#quantity').value),
                    unit: container.querySelector('#unit').value,
                    processor_organization_id: container.querySelector('#processor_org').value,
                    driver_id: container.querySelector('#driver_id').value,
                    pickup_address: container.querySelector('#pickup_address').value,
                    delivery_address: container.querySelector('#delivery_address').value,
                };
                await api.createBatch(payload);
                window.location.hash = '/dashboard';
            } catch (error) {
                alert(error.message);
            }
        });

        container.querySelectorAll('[data-action="qr"]').forEach((btn) => {
            btn.addEventListener('click', async () => {
                const batchId = btn.dataset.id;
                try {
                    const tokenData = await getOrCreateBatchQrToken(batchId);
                    if (!tokenData) {
                        return;
                    }
                    if (typeof showGeneratedQrModal === 'function') {
                        showGeneratedQrModal({
                            token: tokenData.token,
                            batchId,
                            expiresAt: tokenData.expires_at,
                        });
                    } else {
                        alert(`QR токен создан:\n${tokenData.token}\nДействует до: ${new Date(tokenData.expires_at).toLocaleString('ru-RU')}`);
                    }
                } catch (error) {
                    alert(error.message);
                }
            });
        });
    }

    async renderDriver(container) {
        const batches = await api.getDriverBatches();

        container.innerHTML = `
            <div class="row mb-4">
                <div class="col-12">
                    <h1 class="fw-bold"><i class="bi bi-truck"></i> Партии водителя</h1>
                    <p class="text-muted">Просмотр назначенных партий и подтверждение передачи по QR</p>
                </div>
            </div>

            <div class="card mb-4">
                <div class="card-header">Назначенные партии</div>
                <div class="card-body table-responsive">
                    <table class="table table-hover align-middle">
                        <thead><tr><th>ID</th><th>Тип</th><th>Количество</th><th>Точка забора</th><th>Статус</th></tr></thead>
                        <tbody>
                            ${batches.length ? batches.map((b) => `
                                <tr>
                                    <td>${b.id.slice(0, 8)}</td>
                                    <td>${b.waste_type?.name || '-'}</td>
                                    <td>${b.quantity} ${b.unit}</td>
                                    <td>${b.pickup_address || '-'}</td>
                                    <td>${this.statusBadge(b.status)}</td>
                                </tr>
                            `).join('') : '<tr><td colspan="5" class="text-center text-muted">Нет назначенных партий</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="card">
                <div class="card-body d-flex gap-2">
                    <a href="#/scan-qr" class="btn btn-primary">Сканировать QR</a>
                </div>
            </div>
        `;
    }

    async renderProcessor(container) {
        const batches = await api.getAssignedBatches();

        container.innerHTML = `
            <div class="row mb-4">
                <div class="col-12"><h1 class="fw-bold"><i class="bi bi-recycle"></i> Партии переработчика</h1></div>
            </div>

            <div class="card mb-4">
                <div class="card-header">Партии моей организации</div>
                <div class="card-body table-responsive">
                    <table class="table table-hover align-middle">
                        <thead><tr><th>ID</th><th>Тип</th><th>Количество</th><th>Статус</th><th>Действия</th></tr></thead>
                        <tbody>
                            ${batches.length ? batches.map((b) => `
                                <tr>
                                    <td>${b.id.slice(0, 8)}</td>
                                    <td>${b.waste_type?.name || '-'}</td>
                                    <td>${b.quantity} ${b.unit}</td>
                                    <td>${this.statusBadge(b.status)}</td>
                                    <td>${b.status === 'in_transit' ? `<button class="btn btn-sm btn-success" data-action="receive" data-id="${b.id}">Принять</button>` : ''}</td>
                                </tr>
                            `).join('') : '<tr><td colspan="5" class="text-center text-muted">Нет партий</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        container.querySelectorAll('[data-action="receive"]').forEach((btn) => {
            btn.addEventListener('click', async () => {
                try {
                    await api.receiveBatch(btn.dataset.id);
                    window.location.hash = '/dashboard';
                } catch (error) {
                    alert(error.message);
                }
            });
        });
    }

    async renderInspector(container) {
        const batches = await api.getInspectorWasteBatches();

        container.innerHTML = `
            <div class="row mb-4">
                <div class="col-md-8"><h1 class="fw-bold"><i class="bi bi-journal-check"></i> Журнал инспектора</h1></div>
                <div class="col-md-4 text-end">
                    <button class="btn btn-outline-secondary" id="download-inspector-csv">Выгрузка CSV</button>
                </div>
            </div>

            <div class="card">
                <div class="card-body table-responsive">
                    <table class="table table-hover align-middle">
                        <thead><tr><th>ID</th><th>Тип</th><th>Количество</th><th>Статус</th><th>Дата</th></tr></thead>
                        <tbody>
                            ${batches.length ? batches.map((b) => `
                                <tr>
                                    <td>${b.id.slice(0, 8)}</td>
                                    <td>${b.waste_type?.name || '-'}</td>
                                    <td>${b.quantity} ${b.unit}</td>
                                    <td>${this.statusBadge(b.status)}</td>
                                    <td>${new Date(b.created_at).toLocaleString('ru-RU')}</td>
                                </tr>
                            `).join('') : '<tr><td colspan="5" class="text-center text-muted">Нет записей</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        container.querySelector('#download-inspector-csv').addEventListener('click', async () => {
            try {
                await api.downloadCsv(api.getInspectorBatchesReportUrl(), 'inspector_batches_report.csv');
            } catch (error) {
                alert(error.message);
            }
        });
    }

    async renderAdmin(container) {
        const [organizations, wasteTypes] = await Promise.all([
            api.getAdminOrganizations(),
            api.getAdminWasteTypes(),
        ]);

        container.innerHTML = `
            <div class="row mb-4">
                <div class="col-12"><h1 class="fw-bold"><i class="bi bi-gear"></i> Управление системой</h1></div>
            </div>

            <div class="row g-3 mb-4">
                <div class="col-lg-4">
                    <div class="card h-100">
                        <div class="card-header">Новая организация</div>
                        <div class="card-body">
                            <form id="admin-org-form">
                                <div class="mb-2"><input id="admin_org_name" class="form-control" placeholder="Название" required></div>
                                <div class="mb-2"><input id="admin_org_inn" class="form-control" placeholder="ИНН" required></div>
                                <div class="mb-2"><input id="admin_org_kpp" class="form-control" placeholder="КПП"></div>
                                <button class="btn btn-primary w-100" type="submit">Создать</button>
                            </form>
                        </div>
                    </div>
                </div>

                <div class="col-lg-4">
                    <div class="card h-100">
                        <div class="card-header">Новый тип отходов</div>
                        <div class="card-body">
                            <form id="admin-wt-form">
                                <div class="mb-2"><input id="admin_wt_code" class="form-control" placeholder="Код" required></div>
                                <div class="mb-2"><input id="admin_wt_name" class="form-control" placeholder="Название" required></div>
                                <div class="mb-2">
                                    <select id="admin_wt_class" class="form-select" required>
                                        <option value="class_1">class_1</option>
                                        <option value="class_2">class_2</option>
                                        <option value="class_3">class_3</option>
                                        <option value="class_4">class_4</option>
                                        <option value="class_5">class_5</option>
                                    </select>
                                </div>
                                <div class="mb-2"><input id="admin_wt_desc" class="form-control" placeholder="Описание"></div>
                                <button class="btn btn-success w-100" type="submit">Создать</button>
                            </form>
                        </div>
                    </div>
                </div>

                <div class="col-lg-4">
                    <div class="card h-100">
                        <div class="card-header">Новый пользователь</div>
                        <div class="card-body">
                            <form id="admin-user-form">
                                <div class="mb-2"><input id="admin_user_username" class="form-control" placeholder="Username" required></div>
                                <div class="mb-2"><input id="admin_user_email" type="email" class="form-control" placeholder="Email" required></div>
                                <div class="mb-2"><input id="admin_user_full_name" class="form-control" placeholder="ФИО" required></div>
                                <div class="mb-2"><input id="admin_user_password" type="password" class="form-control" placeholder="Пароль" required></div>
                                <div class="mb-2">
                                    <select id="admin_user_role" class="form-select" required>
                                        <option value="educator">educator</option>
                                        <option value="driver">driver</option>
                                        <option value="processor">processor</option>
                                        <option value="inspector">inspector</option>
                                        <option value="admin">admin</option>
                                    </select>
                                </div>
                                <div class="mb-2">
                                    <select id="admin_user_org" class="form-select">
                                        <option value="">Без организации</option>
                                        ${organizations.map((o) => `<option value="${o.id}">${o.name}</option>`).join('')}
                                    </select>
                                </div>
                                <button class="btn btn-dark w-100" type="submit">Создать</button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>

            <div class="row g-3">
                <div class="col-lg-6">
                    <div class="card"><div class="card-header">Организации (${organizations.length})</div>
                    <div class="card-body"><ul class="list-group">${organizations.map((o) => `<li class="list-group-item">${o.name} (${o.inn})</li>`).join('')}</ul></div></div>
                </div>
                <div class="col-lg-6">
                    <div class="card"><div class="card-header">Типы отходов (${wasteTypes.length})</div>
                    <div class="card-body"><ul class="list-group">${wasteTypes.map((w) => `<li class="list-group-item">${w.code}: ${w.name} (${w.waste_class})</li>`).join('')}</ul></div></div>
                </div>
            </div>
        `;

        container.querySelector('#admin-org-form').addEventListener('submit', async (event) => {
            event.preventDefault();
            try {
                await api.createOrganization({
                    name: container.querySelector('#admin_org_name').value.trim(),
                    inn: container.querySelector('#admin_org_inn').value.trim(),
                    kpp: container.querySelector('#admin_org_kpp').value.trim() || null,
                });
                window.location.hash = '/dashboard';
            } catch (error) {
                alert(error.message);
            }
        });

        container.querySelector('#admin-wt-form').addEventListener('submit', async (event) => {
            event.preventDefault();
            try {
                await api.createWasteType({
                    code: container.querySelector('#admin_wt_code').value.trim(),
                    name: container.querySelector('#admin_wt_name').value.trim(),
                    waste_class: container.querySelector('#admin_wt_class').value,
                    description: container.querySelector('#admin_wt_desc').value.trim() || null,
                });
                window.location.hash = '/dashboard';
            } catch (error) {
                alert(error.message);
            }
        });

        container.querySelector('#admin-user-form').addEventListener('submit', async (event) => {
            event.preventDefault();
            try {
                const orgId = container.querySelector('#admin_user_org').value;
                await api.createAdminUser({
                    username: container.querySelector('#admin_user_username').value.trim(),
                    email: container.querySelector('#admin_user_email').value.trim(),
                    full_name: container.querySelector('#admin_user_full_name').value.trim(),
                    password: container.querySelector('#admin_user_password').value,
                    role: container.querySelector('#admin_user_role').value,
                    organization_id: orgId || null,
                });
                window.location.hash = '/dashboard';
            } catch (error) {
                alert(error.message);
            }
        });
    }
}
