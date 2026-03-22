class BatchesComponent {
    async render() {
        const container = document.createElement('div');
        container.className = 'container-lg';
        container.innerHTML = `
            <div class="row mb-4">
                <div class="col-md-8">
                    <h1 class="fw-bold"><i class="bi bi-boxes"></i> Партии отходов</h1>
                </div>
                <div class="col-md-4 text-end">
                    <button class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#createBatchModal">
                        <i class="bi bi-plus-circle"></i> Новая партия
                    </button>
                </div>
            </div>

            <div class="card">
                <div class="card-body">
                    <div class="table-responsive">
                        <table class="table table-hover" id="batches-table">
                            <thead>
                                <tr>
                                    <th>Номер</th>
                                    <th>Тип отходов</th>
                                    <th>Класс</th>
                                    <th>Количество</th>
                                    <th>Статус</th>
                                    <th>Дата создания</th>
                                    <th>Действия</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td colspan="7" class="text-center py-3">
                                        <div class="spinner-border" role="status">
                                            <span class="visually-hidden">Загрузка...</span>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- Modal -->
            <div class="modal fade" id="createBatchModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Создать новую партию</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <form id="create-batch-form">
                            <div class="modal-body">
                                <div class="mb-3">
                                    <label class="form-label">Тип отходов</label>
                                    <select class="form-select" required>
                                        <option>Медикаменты</option>
                                        <option>Инструменты</option>
                                        <option>Органические отходы</option>
                                    </select>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Вес (кг)</label>
                                    <input type="number" class="form-control" required min="0.1" step="0.1">
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Описание</label>
                                    <textarea class="form-control" rows="3" placeholder="Дополнительная информация..."></textarea>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Отмена</button>
                                <button type="submit" class="btn btn-primary">Создать</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;

        this.loadBatches(container);
        container.querySelector('#create-batch-form').addEventListener('submit', (e) => this.handleCreateBatch(e));

        return container;
    }

    async loadBatches(container) {
        try {
            const batches = await api.getBatches();
            const tbody = container.querySelector('tbody');
            
            if (batches.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" class="text-center py-3 text-muted">Партий не найдено</td></tr>';
                return;
            }

            const self = this;
            tbody.innerHTML = batches.map((batch, idx) => {
                return `
                <tr>
                    <td><strong>#${String(idx + 1).padStart(3, '0')}</strong></td>
                    <td>${batch.waste_type?.name || 'Не указано'}</td>
                    <td><span class="badge bg-secondary">${batch.waste_type?.waste_class || '-'}</span></td>
                    <td>${batch.quantity} ${batch.unit}</td>
                    <td>
                        <span class="badge bg-${self.getStatusColor(batch.status)}">
                            ${batch.status}
                        </span>
                    </td>
                    <td>${new Date(batch.created_at).toLocaleDateString('ru-RU')}</td>
                    <td>
                        <button class="btn btn-sm btn-info" onclick="app.router.viewBatch('${batch.id}')"><i class="bi bi-eye"></i></button>
                        <button class="btn btn-sm btn-warning"><i class="bi bi-pencil"></i></button>
                    </td>
                </tr>
            `}).join('');
        } catch (error) {
            console.error('Ошибка загрузки партий:', error);
            const tbody = container.querySelector('tbody');
            tbody.innerHTML = '<tr><td colspan="7" class="text-center py-3 text-danger"><i class="bi bi-exclamation-triangle"></i> Ошибка загрузки данных: ' + error.message + '</td></tr>';
        }
    }

    getStatusColor(status) {
        const statusMap = {
            'created': 'info',
            'in_transit': 'warning', 
            'received': 'success',
            'CREATED': 'info',
            'IN_TRANSIT': 'warning',
            'RECEIVED': 'success'
        };
        return statusMap[status] || 'secondary';
    }

    async handleCreateBatch(e) {
        e.preventDefault();
        alert('Функция добавления партии пока в разработке');
    }
}
