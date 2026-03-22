class BatchesComponent {
    async render() {
        const container = document.createElement('div');
        container.className = 'container-lg';
        
        // Check user role
        const userRole = await api.getUserRole();
        const canCreateBatch = userRole === 'EDUCATOR' || userRole === 'ADMIN';
        
        const createButtonHTML = canCreateBatch ? `
            <button class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#createBatchModal">
                <i class="bi bi-plus-circle"></i> Новая партия
            </button>` : '';
        
        const createModalHTML = canCreateBatch ? `
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
                                    <select class="form-select" id="waste-type-select" required>
                                        <option value="">Выберите тип отходов...</option>
                                    </select>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Количество (кг)</label>
                                    <input type="number" class="form-control" id="quantity-input" required min="0.1" step="0.1">
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Точка вызова (адрес)</label>
                                    <input type="text" class="form-control" id="pickup-address-input" required placeholder="Адрес сбора отходов...">
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Точка переработки (адрес)</label>
                                    <input type="text" class="form-control" id="delivery-address-input" required placeholder="Адрес доставки...">
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Переработчик</label>
                                    <select class="form-select" id="processor-org-select" required>
                                        <option value="">Выберите переработчика...</option>
                                    </select>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Отмена</button>
                                <button type="submit" class="btn btn-primary">Создать</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>` : '';
        
        container.innerHTML = `
            <div class="row mb-4">
                <div class="col-md-8">
                    <h1 class="fw-bold"><i class="bi bi-boxes"></i> Партии отходов</h1>
                </div>
                <div class="col-md-4 text-end">
                    ${createButtonHTML}
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

            ${createModalHTML}
        `;

        this.loadBatches(container);
        
        // Add event listener only if form exists
        const form = container.querySelector('#create-batch-form');
        if (form) {
            form.addEventListener('submit', (e) => this.handleCreateBatch(e));
            this.loadWasteTypes(container);
            this.loadProcessorOrganizations(container);
        }

        return container;
    }

    async loadWasteTypes(container) {
        try {
            const wasteTypes = await api.getWasteTypes();
            const select = container.querySelector('#waste-type-select');
            if (select) {
                select.innerHTML = '<option value="">Выберите тип отходов...</option>' + 
                    wasteTypes.map(wt => `<option value="${wt.id}">${wt.name}</option>`).join('');
            }
        } catch (error) {
            console.error('Ошибка загрузки типов отходов:', error);
        }
    }

    async loadProcessorOrganizations(container) {
        try {
            const orgs = await api.getOrganizations();
            const select = container.querySelector('#processor-org-select');
            if (select) {
                select.innerHTML = '<option value="">Выберите переработчика...</option>' + 
                    orgs.map(org => `<option value="${org.id}">${org.name}</option>`).join('');
            }
        } catch (error) {
            console.error('Ошибка загрузки переработчиков:', error);
        }
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
                        <button class="btn btn-sm btn-info" onclick="window.location.hash='/batch/${batch.id}'"><i class="bi bi-eye"></i></button>
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
            'processed': 'dark',
            'CREATED': 'info',
            'IN_TRANSIT': 'warning',
            'RECEIVED': 'success',
            'PROCESSED': 'dark'
        };
        return statusMap[status] || 'secondary';
    }

    async handleCreateBatch(e) {
        e.preventDefault();
        
        try {
            const wasteTypeId = document.querySelector('#waste-type-select').value;
            const quantity = document.querySelector('#quantity-input').value;
            const pickupAddress = document.querySelector('#pickup-address-input').value;
            const deliveryAddress = document.querySelector('#delivery-address-input').value;
            const processorOrgId = document.querySelector('#processor-org-select').value;
            
            if (!wasteTypeId || !quantity || !pickupAddress || !deliveryAddress || !processorOrgId) {
                alert('Пожалуйста, заполните все поля');
                return;
            }
            
            // Get available drivers for the processor organization
            let driverId = null;
            try {
                const drivers = await api.getAvailableDrivers(processorOrgId);
                if (drivers && drivers.length > 0) {
                    driverId = drivers[0].id;
                } else {
                    alert('Нет доступных водителей для выбранной организации-переработчика');
                    return;
                }
            } catch (error) {
                console.warn('Не удалось получить список водителей, используем заглушку');
                driverId = '00000000-0000-0000-0000-000000000000';
            }
            
            const profile = await api.getProfile();
            
            const batchData = {
                waste_type_id: wasteTypeId,
                quantity: parseFloat(quantity),
                unit: 'kg',
                pickup_address: pickupAddress,
                delivery_address: deliveryAddress,
                processor_organization_id: processorOrgId,
                driver_id: driverId,
                status: 'CREATED'
            };
            
            await api.createBatch(batchData);
            
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.querySelector('#createBatchModal'));
            if (modal) {
                modal.hide();
            }
            
            // Reload batches
            const container = document.querySelector('.container-lg');
            await this.loadBatches(container);
            
            alert('Партия успешно создана!');
        } catch (error) {
            console.error('Ошибка создания партии:', error);
            alert('Ошибка при создании партии: ' + error.message);
        }
    }
}
