class DashboardComponent {
    constructor() {
        this.educatorFilterStorageKey = 'educator_dashboard_filter_mode';
    }

    async render() {
        const container = document.createElement('div');
        container.className = 'container-lg';

        try {
            const profile = await api.getProfile();

            if (profile.role === 'educator') {
                container.innerHTML = await this.renderEducatorDashboard(profile);
                this.bindEducatorDashboardActions(container);
            } else if (profile.role === 'driver') {
                container.innerHTML = await this.renderDriverDashboard(profile);
            } else if (profile.role === 'processor') {
                container.innerHTML = await this.renderProcessorDashboard(profile);
                this.bindProcessorDashboardActions(container);
            } else if (profile.role === 'inspector') {
                container.innerHTML = await this.renderInspectorDashboard(profile);
            } else {
                container.innerHTML = await this.renderAdminDashboard(profile);
            }
        } catch (error) {
            container.innerHTML = `<div class="alert alert-danger mt-4">Ошибка загрузки dashboard: ${error.message}</div>`;
        }

        return container;
    }

    async renderEducatorDashboard(profile) {
        const batches = await api.getEducatorBatches();
        this.educatorBatches = batches;
        const created = batches.filter((b) => b.status === 'created').length;
        const inTransit = batches.filter((b) => b.status === 'in_transit').length;
        const received = batches.filter((b) => b.status === 'received').length;
        const savedMode = this.getSavedEducatorFilterMode();
        const defaultStatus = savedMode === 'all' ? 'all' : 'created';

        return `
            <div class="row mb-4">
                <div class="col-12">
                    <h1 class="fw-bold mb-2"><i class="bi bi-person-workspace"></i> Dashboard - Образователь</h1>
                    <p class="text-muted mb-0">${profile.full_name}</p>
                </div>
            </div>

            <div class="row g-3 mb-4">
                <div class="col-md-3"><div class="stat-card"><h3>${batches.length}</h3><p>Всего партий</p></div></div>
                <div class="col-md-3"><div class="stat-card"><h3>${created}</h3><p>Созданы</p></div></div>
                <div class="col-md-3"><div class="stat-card"><h3>${inTransit}</h3><p>В пути</p></div></div>
                <div class="col-md-3"><div class="stat-card"><h3>${received}</h3><p>Приняты</p></div></div>
            </div>

            <div class="card">
                <div class="card-body d-flex gap-2 flex-wrap">
                    <a href="#/batches" class="btn btn-primary">Управление партиями</a>
                    <button class="btn btn-outline-secondary" onclick="downloadEducatorCsv()">Выгрузить CSV</button>
                </div>
            </div>

            <div class="card mt-4">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <span>Партии образователя</span>
                    <span class="badge bg-info" id="educator-filtered-count">0</span>
                </div>
                <div class="card-body table-responsive">
                    <div class="row g-2 mb-3">
                        <div class="col-12">
                            <div class="btn-group btn-group-sm" role="group" aria-label="Быстрые фильтры">
                                <button type="button" class="btn ${savedMode === 'active' ? 'btn-primary' : 'btn-outline-primary'}" data-filter-mode="active">Только активные</button>
                                <button type="button" class="btn ${savedMode === 'all' ? 'btn-primary' : 'btn-outline-primary'}" data-filter-mode="all">Все</button>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <label class="form-label mb-1">Статус</label>
                            <select class="form-select form-select-sm" id="educator-filter-status">
                                <option value="created" ${defaultStatus === 'created' ? 'selected' : ''}>created</option>
                                <option value="in_transit">in_transit</option>
                                <option value="received">received</option>
                                <option value="all" ${defaultStatus === 'all' ? 'selected' : ''}>Все статусы</option>
                            </select>
                        </div>
                        <div class="col-md-8">
                            <label class="form-label mb-1">Поиск</label>
                            <input class="form-control form-control-sm" id="educator-filter-query" placeholder="ID, тип отходов, адрес вывоза">
                        </div>
                    </div>
                    <table class="table table-sm table-hover align-middle mb-0">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Тип</th>
                                <th>Количество</th>
                                <th>Адрес вывоза</th>
                                <th>Создана</th>
                                <th>Действия</th>
                            </tr>
                        </thead>
                        <tbody id="educator-batches-tbody"></tbody>
                    </table>
                </div>
            </div>
        `;
    }

    bindEducatorDashboardActions(container) {
        const statusSelect = container.querySelector('#educator-filter-status');
        const queryInput = container.querySelector('#educator-filter-query');
        const modeButtons = container.querySelectorAll('[data-filter-mode]');

        const rerender = () => this.renderEducatorTable(container);
        statusSelect.addEventListener('change', rerender);
        queryInput.addEventListener('input', rerender);
        modeButtons.forEach((button) => {
            button.addEventListener('click', () => {
                const mode = button.dataset.filterMode;
                this.setSavedEducatorFilterMode(mode);
                if (mode === 'all') {
                    statusSelect.value = 'all';
                } else if (statusSelect.value === 'all') {
                    statusSelect.value = 'created';
                }
                modeButtons.forEach((btn) => {
                    const isActive = btn.dataset.filterMode === mode;
                    btn.classList.toggle('btn-primary', isActive);
                    btn.classList.toggle('btn-outline-primary', !isActive);
                });
                this.renderEducatorTable(container);
            });
        });

        container.addEventListener('click', async (event) => {
            const button = event.target.closest('[data-action="educator-create-qr"]');
            if (!button) {
                return;
            }
            const batchId = button.dataset.id;
            try {
                const tokenData = await getOrCreateBatchQrToken(batchId);
                if (!tokenData) {
                    return;
                }
                showGeneratedQrModal({
                    token: tokenData.token,
                    batchId,
                    expiresAt: tokenData.expires_at,
                });
            } catch (error) {
                alert(error.message);
            }
        });

        this.renderEducatorTable(container);
    }

    getSavedEducatorFilterMode() {
        const value = localStorage.getItem(this.educatorFilterStorageKey);
        return value === 'all' ? 'all' : 'active';
    }

    setSavedEducatorFilterMode(mode) {
        localStorage.setItem(this.educatorFilterStorageKey, mode === 'all' ? 'all' : 'active');
    }

    renderEducatorTable(container) {
        const statusSelect = container.querySelector('#educator-filter-status');
        const queryInput = container.querySelector('#educator-filter-query');
        const tbody = container.querySelector('#educator-batches-tbody');
        const countBadge = container.querySelector('#educator-filtered-count');

        const mode = this.getSavedEducatorFilterMode();
        const selectedStatus = statusSelect?.value || 'created';
        const query = (queryInput?.value || '').trim().toLowerCase();

        const filtered = (this.educatorBatches || [])
            .filter((batch) => mode === 'all' || batch.status === 'created' || batch.status === 'in_transit')
            .filter((batch) => selectedStatus === 'all' || batch.status === selectedStatus)
            .filter((batch) => {
                if (!query) {
                    return true;
                }
                const haystack = [
                    batch.id,
                    batch.waste_type?.name,
                    batch.pickup_address,
                    batch.status,
                ]
                    .filter(Boolean)
                    .join(' ')
                    .toLowerCase();
                return haystack.includes(query);
            })
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        countBadge.textContent = String(filtered.length);

        tbody.innerHTML = filtered.length
            ? filtered.slice(0, 20).map((b) => `
                <tr>
                    <td>${b.id.slice(0, 8)}</td>
                    <td>${b.waste_type?.name || '-'}</td>
                    <td>${b.quantity} ${b.unit}</td>
                    <td>${b.pickup_address || '-'}</td>
                    <td>${b.created_at ? new Date(b.created_at).toLocaleString('ru-RU') : '-'}</td>
                    <td>
                        ${b.status === 'created'
                            ? `<button class="btn btn-sm btn-outline-primary" data-action="educator-create-qr" data-id="${b.id}">QR код</button>`
                            : '<span class="text-muted">QR недоступен</span>'}
                    </td>
                </tr>
            `).join('')
            : '<tr><td colspan="6" class="text-center text-muted py-3">По фильтру ничего не найдено</td></tr>';
    }

    async renderDriverDashboard(profile) {
        const batches = await api.getDriverBatches();
        const created = batches.filter((b) => b.status === 'created').length;
        const inTransit = batches.filter((b) => b.status === 'in_transit').length;
        const received = batches.filter((b) => b.status === 'received').length;
        const active = batches
            .filter((b) => b.status === 'created' || b.status === 'in_transit')
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        return `
            <div class="row mb-4">
                <div class="col-12">
                    <h1 class="fw-bold mb-2"><i class="bi bi-truck"></i> Dashboard - Водитель</h1>
                    <p class="text-muted mb-0">${profile.full_name}</p>
                </div>
            </div>

            <div class="row g-3 mb-4">
                <div class="col-md-3"><div class="stat-card"><h3>${batches.length}</h3><p>Всего назначено</p></div></div>
                <div class="col-md-3"><div class="stat-card"><h3>${created}</h3><p>Ожидают забора</p></div></div>
                <div class="col-md-3"><div class="stat-card"><h3>${inTransit}</h3><p>В пути</p></div></div>
                <div class="col-md-3"><div class="stat-card"><h3>${received}</h3><p>Доставлены</p></div></div>
            </div>

            <div class="card">
                <div class="card-body d-flex gap-2 flex-wrap">
                    <a href="#/scan-qr" class="btn btn-primary">Сканирование QR</a>
                    <a href="#/batches" class="btn btn-outline-secondary">Мои партии</a>
                </div>
            </div>

            <div class="card mt-4">
                <div class="card-header">Ближайшие точки забора</div>
                <div class="card-body table-responsive">
                    <table class="table table-sm table-hover align-middle mb-0">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Тип</th>
                                <th>Точка забора</th>
                                <th>Статус</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${active.length
                                ? active.slice(0, 10).map((b) => `
                                    <tr>
                                        <td>${b.id.slice(0, 8)}</td>
                                        <td>${b.waste_type?.name || '-'}</td>
                                        <td>${b.pickup_address || '-'}</td>
                                        <td><span class="badge bg-${b.status === 'created' ? 'info' : 'warning'}">${b.status}</span></td>
                                    </tr>
                                `).join('')
                                : '<tr><td colspan="4" class="text-center text-muted py-3">Нет активных точек забора</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    async renderProcessorDashboard(profile) {
        const batches = await api.getAssignedBatches();
        const inTransit = batches.filter((b) => b.status === 'in_transit').length;
        const received = batches.filter((b) => b.status === 'received').length;
        const recentBatches = batches
            .slice()
            .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

        return `
            <div class="row mb-4">
                <div class="col-12">
                    <h1 class="fw-bold mb-2"><i class="bi bi-recycle"></i> Dashboard - Переработчик</h1>
                    <p class="text-muted mb-0">${profile.full_name}</p>
                </div>
            </div>

            <div class="row g-3 mb-4">
                <div class="col-md-4"><div class="stat-card"><h3>${batches.length}</h3><p>Всего партий</p></div></div>
                <div class="col-md-4"><div class="stat-card"><h3>${inTransit}</h3><p>Ожидают приемки</p></div></div>
                <div class="col-md-4"><div class="stat-card"><h3>${received}</h3><p>Приняты</p></div></div>
            </div>

            <div class="card mb-4">
                <div class="card-body d-flex gap-2 flex-wrap">
                    <a href="#/scan-qr" class="btn btn-primary">Сканирование QR</a>
                </div>
            </div>

            <div class="card">
                <div class="card-header">Партии моей организации</div>
                <div class="card-body table-responsive">
                    <table class="table table-sm table-hover align-middle mb-0">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Тип</th>
                                <th>Количество</th>
                                <th>Статус</th>
                                <th>Действия</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${recentBatches.length
                                ? recentBatches.map((b) => `
                                    <tr>
                                        <td>${b.id.slice(0, 8)}</td>
                                        <td>${b.waste_type?.name || '-'}</td>
                                        <td>${b.quantity} ${b.unit}</td>
                                        <td><span class="badge bg-${b.status === 'received' ? 'success' : (b.status === 'in_transit' ? 'warning text-dark' : 'secondary')}">${b.status}</span></td>
                                        <td>
                                            ${b.status === 'in_transit'
                                                ? `<button class="btn btn-sm btn-success" data-action="processor-receive-batch" data-id="${b.id}">Принять</button>`
                                                : '<span class="text-muted">-</span>'}
                                        </td>
                                    </tr>
                                `).join('')
                                : '<tr><td colspan="5" class="text-center text-muted py-3">Нет партий</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    bindProcessorDashboardActions(container) {
        container.addEventListener('click', async (event) => {
            const button = event.target.closest('[data-action="processor-receive-batch"]');
            if (!button) {
                return;
            }
            try {
                await api.receiveBatch(button.dataset.id);
                window.location.hash = '/dashboard';
            } catch (error) {
                alert(error.message);
            }
        });
    }

    async renderInspectorDashboard(profile) {
        const summary = await api.getInspectorSummary();

        return `
            <div class="row mb-4">
                <div class="col-12">
                    <h1 class="fw-bold mb-2"><i class="bi bi-shield-check"></i> Dashboard - Инспектор</h1>
                    <p class="text-muted mb-0">${profile.full_name}</p>
                </div>
            </div>

            <div class="row g-3 mb-4">
                <div class="col-md-3"><div class="stat-card"><h3>${summary.total_batches}</h3><p>Всего партий</p></div></div>
                <div class="col-md-3"><div class="stat-card"><h3>${summary.batches_created}</h3><p>Созданы</p></div></div>
                <div class="col-md-3"><div class="stat-card"><h3>${summary.batches_in_transit}</h3><p>В пути</p></div></div>
                <div class="col-md-3"><div class="stat-card"><h3>${summary.batches_received}</h3><p>Приняты</p></div></div>
            </div>

            <div class="card">
                <div class="card-body d-flex gap-2 flex-wrap">
                    <a href="#/batches" class="btn btn-primary">Журнал партий</a>
                    <button class="btn btn-outline-secondary" onclick="downloadInspectorBatchesCsv()">CSV партий</button>
                    <button class="btn btn-outline-secondary" onclick="downloadInspectorEventsCsv()">CSV событий</button>
                </div>
            </div>
        `;
    }

    async renderAdminDashboard(profile) {
        const [orgs, wasteTypes] = await Promise.all([
            api.getAdminOrganizations(),
            api.getAdminWasteTypes(),
        ]);

        return `
            <div class="row mb-4">
                <div class="col-12">
                    <h1 class="fw-bold mb-2"><i class="bi bi-gear"></i> Dashboard - Администратор</h1>
                    <p class="text-muted mb-0">${profile.full_name}</p>
                </div>
            </div>

            <div class="row g-3 mb-4">
                <div class="col-md-4"><div class="stat-card"><h3>${orgs.length}</h3><p>Организации</p></div></div>
                <div class="col-md-4"><div class="stat-card"><h3>${wasteTypes.length}</h3><p>Типы отходов</p></div></div>
                <div class="col-md-4"><div class="stat-card"><h3>5</h3><p>Ролей</p></div></div>
            </div>

            <div class="card">
                <div class="card-body">
                    <a href="#/batches" class="btn btn-primary">Управление системой</a>
                </div>
            </div>
        `;
    }
}

function findActiveQrToken(tokens) {
    const now = Date.now();
    return [...tokens]
        .filter((token) => token.is_valid && new Date(token.expires_at).getTime() > now)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0] || null;
}

async function getOrCreateBatchQrToken(batchId) {
    const existingTokens = await api.getBatchQRTokens(batchId, 0, 100);
    const activeToken = findActiveQrToken(existingTokens || []);

    if (activeToken) {
        return activeToken;
    }

    const lifetimeInput = prompt('Для этой партии нет действующего QR. Укажите срок действия (1-7 дней):', '3');
    if (lifetimeInput === null) {
        return null;
    }

    const days = Number(lifetimeInput || 3);
    if (!days || days < 1 || days > 7) {
        alert('Укажите число от 1 до 7');
        return null;
    }

    return api.generateQRToken(batchId, days);
}

async function downloadEducatorCsv() {
    try {
        await api.downloadCsv(api.getEducatorBatchesReportUrl(), 'educator_batches_report.csv');
    } catch (error) {
        alert(error.message);
    }
}

async function downloadInspectorBatchesCsv() {
    try {
        await api.downloadCsv(api.getInspectorBatchesReportUrl(), 'inspector_batches_report.csv');
    } catch (error) {
        alert(error.message);
    }
}

async function downloadInspectorEventsCsv() {
    try {
        await api.downloadCsv(api.getInspectorEventsReportUrl(), 'inspector_events_report.csv');
    } catch (error) {
        alert(error.message);
    }
}

function ensureQrModal() {
    let modal = document.getElementById('generated-qr-modal');
    if (modal) {
        return modal;
    }

    modal = document.createElement('div');
    modal.id = 'generated-qr-modal';
    modal.className = 'modal fade';
    modal.tabIndex = -1;
    modal.innerHTML = `
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">QR код для водителя</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body text-center">
                    <div id="generated-qr-canvas" class="d-flex justify-content-center mb-3"></div>
                    <p class="mb-1"><strong>Токен:</strong></p>
                    <code id="generated-qr-token" style="word-break: break-all;"></code>
                    <p class="mt-3 mb-0 text-muted" id="generated-qr-meta"></p>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-outline-dark" id="print-qr-token-btn">Распечатать</button>
                    <button type="button" class="btn btn-outline-secondary" id="copy-qr-token-btn">Копировать токен</button>
                    <button type="button" class="btn btn-primary" data-bs-dismiss="modal">Готово</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    modal.querySelector('#copy-qr-token-btn').addEventListener('click', async () => {
        const token = modal.querySelector('#generated-qr-token').textContent || '';
        try {
            await navigator.clipboard.writeText(token);
            alert('Токен скопирован');
        } catch (_) {
            alert('Не удалось скопировать токен');
        }
    });

    modal.querySelector('#print-qr-token-btn').addEventListener('click', () => {
        alert('Распечатать: функция в разработке');
    });

    return modal;
}

function showGeneratedQrModal({ token, batchId, expiresAt }) {
    const modalEl = ensureQrModal();
    const qrContainer = modalEl.querySelector('#generated-qr-canvas');
    const tokenEl = modalEl.querySelector('#generated-qr-token');
    const metaEl = modalEl.querySelector('#generated-qr-meta');

    qrContainer.innerHTML = '';
    tokenEl.textContent = token;
    metaEl.textContent = `Партия: ${batchId.slice(0, 8)} • Действует до: ${new Date(expiresAt).toLocaleString('ru-RU')}`;

    if (typeof QRCode !== 'undefined') {
        new QRCode(qrContainer, {
            text: token,
            width: 220,
            height: 220,
            correctLevel: QRCode.CorrectLevel.M,
        });
    } else {
        qrContainer.innerHTML = '<div class="alert alert-warning mb-0">Библиотека QR недоступна. Используйте токен вручную.</div>';
    }

    const bsModal = bootstrap.Modal.getOrCreateInstance(modalEl);
    bsModal.show();
}
