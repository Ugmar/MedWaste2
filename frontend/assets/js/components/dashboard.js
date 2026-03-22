class DashboardComponent {
    async render() {
        const profile = await api.getProfile();
        const userRole = profile.role;
        
        let dashboard = '';
        
        switch(userRole) {
            case 'EDUCATOR':
                dashboard = await this.renderEducatorDashboard();
                break;
            case 'DRIVER':
                dashboard = await this.renderDriverDashboard();
                break;
            case 'PROCESSOR':
                dashboard = await this.renderProcessorDashboard();
                break;
            case 'INSPECTOR':
                dashboard = await this.renderInspectorDashboard();
                break;
            default:
                dashboard = await this.renderAdminDashboard();
        }
        
        return dashboard;
    }

    async renderEducatorDashboard() {
        const container = document.createElement('div');
        container.className = 'container-lg';
        
        try {
            const batches = await api.getBatches();
            const statusStats = {
                created: batches.filter(b => b.status === 'CREATED' || b.status === 'created').length,
                in_transit: batches.filter(b => b.status === 'IN_TRANSIT' || b.status === 'in_transit').length,
                received: batches.filter(b => b.status === 'RECEIVED' || b.status === 'received').length
            };
            
            const totalQuantity = batches.reduce((sum, b) => sum + parseFloat(b.quantity), 0);
            
            container.innerHTML = `
                <div class="row mb-4">
                    <div class="col-12">
                        <h1 class="fw-bold mb-2"><i class="bi bi-graph-up"></i> Dashboard - Образователь</h1>
                        <p class="text-muted">Обзор ваших партий отходов</p>
                    </div>
                </div>

                <div class="row g-3 mb-4">
                    <div class="col-md-3">
                        <div class="stat-card">
                            <div class="stat-icon bg-primary">
                                <i class="bi bi-boxes"></i>
                            </div>
                            <h3>${batches.length}</h3>
                            <p>Всего партий</p>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="stat-card">
                            <div class="stat-icon bg-warning">
                                <i class="bi bi-clock"></i>
                            </div>
                            <h3>${statusStats.created}</h3>
                            <p>В подготовке</p>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="stat-card">
                            <div class="stat-icon bg-info">
                                <i class="bi bi-truck"></i>
                            </div>
                            <h3>${statusStats.in_transit}</h3>
                            <p>В пути</p>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="stat-card">
                            <div class="stat-icon bg-success">
                                <i class="bi bi-check-circle"></i>
                            </div>
                            <h3>${statusStats.received}</h3>
                            <p>Получено</p>
                        </div>
                    </div>
                </div>

                <div class="row g-3">
                    <div class="col-lg-8">
                        <div class="card">
                            <div class="card-header">
                                <i class="bi bi-list-check"></i> Последние партии
                            </div>
                            <div class="card-body">
                                <div class="table-responsive">
                                    <table class="table table-hover">
                                        <thead>
                                            <tr>
                                                <th>Тип отходов</th>
                                                <th>Количество</th>
                                                <th>Статус</th>
                                                <th>Дата создания</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${batches.slice(0, 5).map(b => `
                                                <tr>
                                                    <td>${b.waste_type?.name || '-'}</td>
                                                    <td>${b.quantity} ${b.unit}</td>
                                                    <td><span class="badge bg-${this.getStatusColor(b.status)}">${b.status}</span></td>
                                                    <td>${new Date(b.created_at).toLocaleDateString('ru-RU')}</td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="col-lg-4">
                        <div class="card">
                            <div class="card-header">
                                <i class="bi bi-info-circle"></i> Действия
                            </div>
                            <div class="card-body">
                                <a href="#/batches" class="btn btn-outline-primary w-100 mb-2">
                                    <i class="bi bi-plus-circle"></i> Новая партия
                                </a>
                                <a href="#/profile" class="btn btn-outline-info w-100">
                                    <i class="bi bi-gear"></i> Профиль
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        } catch (error) {
            container.innerHTML = `<div class="alert alert-danger">Ошибка загрузки: ${error.message}</div>`;
        }

        return container;
    }

    async renderDriverDashboard() {
        const container = document.createElement('div');
        container.className = 'container-lg';
        
        const html = `
            <div class="row mb-4">
                <div class="col-12">
                    <h1 class="fw-bold mb-2"><i class="bi bi-truck"></i> Dashboard - Водитель</h1>
                    <p class="text-muted">Ваши назначенные доставки</p>
                </div>
            </div>

            <div class="row g-3 mb-4">
                <div class="col-md-4">
                    <div class="stat-card">
                        <div class="stat-icon bg-warning">
                            <i class="bi bi-exclamation-triangle"></i>
                        </div>
                        <h3 id="pending-count">-</h3>
                        <p>Ожидающих обработки</p>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="stat-card">
                        <div class="stat-icon bg-info">
                            <i class="bi bi-truck"></i>
                        </div>
                        <h3 id="transit-count">-</h3>
                        <p>В пути</p>
                    </div>
                </div>
                <div class="col-md-4">
                    <a href="#/scan-qr" class="stat-card text-decoration-none">
                        <div class="stat-icon bg-success" style="cursor: pointer;">
                            <i class="bi bi-qr-code"></i>
                        </div>
                        <h3>Сканировать</h3>
                        <p><small>Считать QR-код партии</small></p>
                    </a>
                </div>
            </div>

            <div class="card">
                <div class="card-header">
                    <i class="bi bi-list-check"></i> Назначенные доставки
                </div>
                <div class="card-body">
                    <div class="table-responsive">
                        <table class="table table-hover">
                            <thead>
                                <tr>
                                    <th>Партия</th>
                                    <th>Тип отходов</th>
                                    <th>Количество</th>
                                    <th>Статус</th>
                                    <th>От</th>
                                    <th>До</th>
                                </tr>
                            </thead>
                            <tbody id="driver-batches-table">
                                <tr><td colspan="6" class="text-center text-muted">Загрузка...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = html;

        // Load driver's assigned batches
        setTimeout(async () => {
            try {
                const batches = await api.getDriverBatches();
                const tbody = container.querySelector('#driver-batches-table');
                
                if (batches.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">Нет назначенных доставок</td></tr>';
                } else {
                    const createdCount = batches.filter(b => b.status === 'CREATED' || b.status === 'created').length;
                    const transitCount = batches.filter(b => b.status === 'IN_TRANSIT' || b.status === 'in_transit').length;
                    
                    container.querySelector('#pending-count').textContent = createdCount;
                    container.querySelector('#transit-count').textContent = transitCount;
                    
                    tbody.innerHTML = batches.slice(0, 15).map((b, idx) => `
                        <tr>
                            <td>#${String(idx + 1).padStart(3, '0')}</td>
                            <td>${b.waste_type?.name || '-'}</td>
                            <td>${b.quantity} ${b.unit}</td>
                            <td><span class="badge bg-${this.getStatusColor(b.status)}">${b.status}</span></td>
                            <td>${b.organization?.name || '-'}</td>
                            <td>${b.destination_organization?.name || '-'}</td>
                        </tr>
                    `).join('');
                }
            } catch (error) {
                console.error('Ошибка загрузки партий:', error);
                container.querySelector('#driver-batches-table').innerHTML = `
                    <tr><td colspan="6" class="text-center text-danger">Ошибка загрузки: ${error.message}</td></tr>
                `;
            }
        }, 0);

        return container;
    }

    async renderProcessorDashboard() {
        const container = document.createElement('div');
        container.className = 'container-lg';
        
        const html = `
            <div class="row mb-4">
                <div class="col-12">
                    <h1 class="fw-bold mb-2"><i class="bi bi-tools"></i> Dashboard - Переработчик</h1>
                    <p class="text-muted">Партии для обработки</p>
                </div>
            </div>

            <div class="row g-3 mb-4">
                <div class="col-md-4">
                    <div class="stat-card">
                        <div class="stat-icon bg-danger">
                            <i class="bi bi-exclamation-triangle"></i>
                        </div>
                        <h3 id="processor-pending">-</h3>
                        <p>Ожидают обработки</p>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="stat-card">
                        <div class="stat-icon bg-success">
                            <i class="bi bi-check-circle"></i>
                        </div>
                        <h3 id="processor-completed">-</h3>
                        <p>Обработано</p>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="stat-card">
                        <div class="stat-icon bg-info">
                            <i class="bi bi-archive"></i>
                        </div>
                        <h3 id="processor-total">-</h3>
                        <p>Всего партий</p>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-header">
                    <i class="bi bi-list-check"></i> Партии для обработки
                </div>
                <div class="card-body">
                    <div class="table-responsive">
                        <table class="table table-hover">
                            <thead>
                                <tr>
                                    <th>Партия</th>
                                    <th>Тип отходов</th>
                                    <th>Количество</th>
                                    <th>Статус</th>
                                    <th>Доставлено</th>
                                    <th>Действия</th>
                                </tr>
                            </thead>
                            <tbody id="processor-batches-table">
                                <tr><td colspan="6" class="text-center text-muted">Загрузка...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
        
        container.innerHTML = html;
        
        // Load processor's assigned batches
        setTimeout(async () => {
            try {
                const batches = await api.getAssignedBatches();
                const tbody = container.querySelector('#processor-batches-table');
                
                if (batches.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">Нет партий для обработки</td></tr>';
                } else {
                    const pendingCount = batches.filter(b => (b.status === 'IN_TRANSIT' || b.status === 'in_transit' || b.status === 'RECEIVED' || b.status === 'received')).length;
                    const completedCount = batches.filter(b => b.status === 'PROCESSED' || b.status === 'processed').length;
                    
                    container.querySelector('#processor-pending').textContent = pendingCount;
                    container.querySelector('#processor-completed').textContent = completedCount;
                    container.querySelector('#processor-total').textContent = batches.length;
                    
                    tbody.innerHTML = batches.slice(0, 10).map((b, idx) => `
                        <tr>
                            <td>#${String(idx + 1).padStart(3, '0')}</td>
                            <td>${b.waste_type?.name || '-'}</td>
                            <td>${b.quantity} ${b.unit}</td>
                            <td><span class="badge bg-${this.getStatusColor(b.status)}">${b.status}</span></td>
                            <td><small>${new Date(b.updated_at).toLocaleDateString('ru-RU')}</small></td>
                            <td>
                                ${b.status === 'IN_TRANSIT' || b.status === 'in_transit' ? 
                                    `<button class="btn btn-sm btn-success" onclick="receiveBatch('${b.id}')"><i class="bi bi-check"></i> Принять</button>` : 
                                b.status === 'RECEIVED' || b.status === 'received' ?
                                    `<button class="btn btn-sm btn-primary" onclick="completeBatch('${b.id}')"><i class="bi bi-check-all"></i> Обработано</button>` :
                                    `<button class="btn btn-sm btn-info"><i class="bi bi-eye"></i> Подробнее</button>`}
                            </td>
                        </tr>
                    `).join('');
                }
            } catch (error) {
                console.error('Ошибка загрузки партий:', error);
                container.querySelector('#processor-batches-table').innerHTML = `
                    <tr><td colspan="6" class="text-center text-danger">Ошибка загрузки: ${error.message}</td></tr>
                `;
            }
        }, 0);

        return container;
    }

    async renderInspectorDashboard() {
        const container = document.createElement('div');
        container.className = 'container-lg';
        
        container.innerHTML = `
            <div class="row mb-4">
                <div class="col-12">
                    <h1 class="fw-bold mb-2"><i class="bi bi-clipboard-check"></i> Dashboard - Инспектор</h1>
                    <p class="text-muted">Аудит и отчетность</p>
                </div>
            </div>

            <div class="row g-3 mb-4">
                <div class="col-md-3">
                    <div class="stat-card">
                        <div class="stat-icon bg-primary">
                            <i class="bi bi-boxes"></i>
                        </div>
                        <h3 id="inspector-total-batches">-</h3>
                        <p>Всего партий</p>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="stat-card">
                        <div class="stat-icon bg-success">
                            <i class="bi bi-check-circle"></i>
                        </div>
                        <h3 id="inspector-received-count">-</h3>
                        <p>Обработано</p>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="stat-card">
                        <div class="stat-icon bg-warning">
                            <i class="bi bi-truck"></i>
                        </div>
                        <h3 id="inspector-transit-count">-</h3>
                        <p>В пути</p>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="stat-card">
                        <div class="stat-icon bg-info">
                            <i class="bi bi-file-earmark-excel"></i>
                        </div>
                        <h3 style="font-size: 1.5rem;">
                            <button class="btn btn-sm btn-outline-info" onclick="exportReport('batches')" title="Экспортировать партии">
                                <i class="bi bi-download"></i>
                            </button>
                        </h3>
                        <p>Экспорт партий</p>
                    </div>
                </div>
            </div>

            <div class="card mb-3">
                <div class="card-header">
                    <i class="bi bi-download"></i> Экспорт отчетов
                </div>
                <div class="card-body">
                    <button class="btn btn-outline-primary me-2" onclick="exportReport('batches')">
                        <i class="bi bi-file-earmark-spreadsheet"></i> Экспорт партий CSV
                    </button>
                    <button class="btn btn-outline-secondary" onclick="exportReport('events')">
                        <i class="bi bi-file-earmark-spreadsheet"></i> Экспорт событий CSV
                    </button>
                </div>
            </div>

            <div class="card">
                <div class="card-header">
                    <i class="bi bi-bar-chart"></i> Все партии
                </div>
                <div class="card-body">
                    <div class="table-responsive">
                        <table class="table table-hover">
                            <thead>
                                <tr>
                                    <th>Партия</th>
                                    <th>Тип</th>
                                    <th>Кол-во</th>
                                    <th>Статус</th>
                                    <th>Дата создания</th>
                                </tr>
                            </thead>
                            <tbody id="inspector-batches-table">
                                <tr><td colspan="5" class="text-center text-muted">Загрузка...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div class="card mt-3">
                <div class="card-header">
                    <i class="bi bi-clock-history"></i> Последние события
                </div>
                <div class="card-body">
                    <div id="recent-events-list">
                        <div class="text-center text-muted">Загрузка событий...</div>
                    </div>
                </div>
            </div>
        `;

        // Load summary statistics and recent events
        setTimeout(async () => {
            try {
                const response = await fetch('/api/inspector/summary', {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                });
                const summary = await response.json();
                container.querySelector('#inspector-total-batches').textContent = summary.total_batches;
                container.querySelector('#inspector-received-count').textContent = summary.batches_received;
                container.querySelector('#inspector-transit-count').textContent = summary.batches_in_transit;
                
                // Load recent events
                try {
                    const events = await api.getRecentEvents(10);
                    const eventsList = container.querySelector('#recent-events-list');
                    
                    if (events.length === 0) {
                        eventsList.innerHTML = '<div class="text-center text-muted">Нет событий</div>';
                    } else {
                        eventsList.innerHTML = events.map(event => `
                            <div class="d-flex justify-content-between align-items-start mb-2 pb-2 border-bottom">
                                <div>
                                    <p class="mb-0 fw-bold">${event.event_type}</p>
                                    <small class="text-muted">${event.description || 'Нет описания'}</small>
                                    <br>
                                    <small class="text-secondary">${new Date(event.created_at).toLocaleString('ru-RU')}</small>
                                </div>
                            </div>
                        `).join('');
                    }
                } catch (error) {
                    console.error('Ошибка загрузки событий:', error);
                    container.querySelector('#recent-events-list').innerHTML = '<div class="text-danger text-center">Ошибка загрузки событий</div>';
                }
            } catch (error) {
                console.error('Ошибка загрузки статистики:', error);
            }
        }, 0);

        return container;
    }

    async renderAdminDashboard() {
        const container = document.createElement('div');
        container.className = 'container-lg';
        
        container.innerHTML = `
            <div class="row mb-4">
                <div class="col-12">
                    <h1 class="fw-bold mb-2"><i class="bi bi-speedometer2"></i> Dashboard - Администратор</h1>
                    <p class="text-muted">Полный обзор системы</p>
                </div>
            </div>

            <div class="row g-3 mb-4">
                <div class="col-md-3">
                    <div class="stat-card">
                        <div class="stat-icon bg-primary">
                            <i class="bi bi-boxes"></i>
                        </div>
                        <h3>120</h3>
                        <p>Всего партий</p>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="stat-card">
                        <div class="stat-icon bg-success">
                            <i class="bi bi-check-circle"></i>
                        </div>
                        <h3>850 кг</h3>
                        <p>Обработано</p>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="stat-card">
                        <div class="stat-icon bg-warning">
                            <i class="bi bi-truck"></i>
                        </div>
                        <h3>25</h3>
                        <p>В пути</p>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="stat-card">
                        <div class="stat-icon bg-danger">
                            <i class="bi bi-exclamation-triangle"></i>
                        </div>
                        <h3>3</h3>
                        <p>Проблем</p>
                    </div>
                </div>
            </div>

            <div class="row g-3">
                <div class="col-lg-8">
                    <div class="card">
                        <div class="card-header">
                            <i class="bi bi-list-check"></i> Последние партии
                        </div>
                        <div class="card-body">
                            <div class="table-responsive">
                                <table class="table table-hover">
                                    <thead>
                                        <tr>
                                            <th>ID</th>
                                            <th>Образователь</th>
                                            <th>Статус</th>
                                            <th>Кол-во</th>
                                            <th>Дата</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr><td colspan="5" class="text-center text-muted">Загрузка...</td></tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="col-lg-4">
                    <div class="card">
                        <div class="card-header">
                            <i class="bi bi-gear"></i> Администрирование
                        </div>
                        <div class="card-body">
                            <a href="#/batches" class="btn btn-outline-primary w-100 mb-2">
                                <i class="bi bi-boxes"></i> Все партии
                            </a>
                            <a href="#/organizations" class="btn btn-outline-secondary w-100 mb-2">
                                <i class="bi bi-building"></i> Организации
                            </a>
                            <a href="#/profile" class="btn btn-outline-info w-100">
                                <i class="bi bi-gear"></i> Настройки
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        `;

        return container;
    }

    getStatusColor(status) {
        const statusMap = {
            'created': 'info',
            'in_transit': 'warning',
            'received': 'success',
            'processed': 'dark',
            'CREATED': 'info',
            'IN_TRANSIT': 'warning',
            'RECEIVED': 'success',
            'PROCESSED': 'dark'
        };
        return statusMap[status] || 'secondary';
    }
}
