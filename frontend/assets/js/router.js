class Router {
    constructor() {
        this.routes = {
            '/': LoginComponent,
            '/login': LoginComponent,
            '/register': LoginComponent,
            '/dashboard': DashboardComponent,
            '/batches': BatchesComponent,
            '/organizations': OrganizationsComponent,
            '/profile': ProfileComponent,
            '/scan-qr': QRScannerComponent,
        };
        window.addEventListener('hashchange', () => this.handleRoute());
        this.handleRoute();
    }

    getRoute() {
        return window.location.hash.slice(1) || '/';
    }

    async handleRoute() {
        const path = this.getRoute();
        
        // Handle detail views
        if (path.startsWith('/batch/')) {
            const batchId = path.split('/')[2];
            this.viewBatch(batchId);
            return;
        }
        
        if (path.startsWith('/organization/')) {
            const orgId = path.split('/')[2];
            this.viewOrganization(orgId);
            return;
        }

        const Component = this.routes[path] || LoginComponent;

        const token = localStorage.getItem('token');
        const isAuthPage = ['/', '/login', '/register'].includes(path);

        if (!token && !isAuthPage) {
            window.location.hash = '/login';
            return;
        }

        if (token && isAuthPage) {
            window.location.hash = '/dashboard';
            return;
        }

        const appContainer = document.getElementById('app');
        appContainer.innerHTML = '';
        const component = new Component();
        appContainer.appendChild(await component.render());
    }

    async viewBatch(batchId) {
        try {
            const batch = await api.getBatch(batchId);
            const profile = await api.getProfile();
            const appContainer = document.getElementById('app');
            
            const isEducator = profile.role === 'EDUCATOR';
            const canGenerateQR = isEducator && batch.educator_id === profile.id;
            
            const qrButtonHTML = canGenerateQR ? `
                <button class="btn btn-primary" onclick="generateQRCode('${batch.id}')">
                    <i class="bi bi-qr-code"></i> Генерировать QR код
                </button>` : '';
            
            appContainer.innerHTML = `
                <div class="container-lg mt-4">
                    <div class="row mb-3">
                        <div class="col-12">
                            <button class="btn btn-secondary" onclick="window.location.hash='/batches'">← Назад</button>
                            ${qrButtonHTML}
                        </div>
                    </div>
                    <div class="card">
                        <div class="card-header">
                            <h3 class="mb-0"><i class="bi bi-box"></i> Партия отходов</h3>
                        </div>
                        <div class="card-body">
                            <div class="row">
                                <div class="col-md-6">
                                    <p><strong>Номер партии:</strong> ${batch.id}</p>
                                    <p><strong>Тип отходов:</strong> ${batch.waste_type?.name || batch.waste_type_id}</p>
                                    <p><strong>Количество:</strong> ${batch.quantity} ${batch.unit}</p>
                                    <p><strong>Статус:</strong> <span class="badge bg-info">${batch.status}</span></p>
                                </div>
                                <div class="col-md-6">
                                    <p><strong>Адрес сбора:</strong> ${batch.pickup_address}</p>
                                    <p><strong>Адрес доставки:</strong> ${batch.delivery_address}</p>
                                    <p><strong>Создана:</strong> ${new Date(batch.created_at).toLocaleString('ru-RU')}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        } catch (error) {
            alert('Ошибка загрузки деталей партии: ' + error.message);
            window.location.hash = '/batches';
        }
    }

    async viewOrganization(orgId) {
        try {
            // Для организаций пока просто показываем уведомление
            alert('Детальный просмотр организации в разработке');
            window.location.hash = '/organizations';
        } catch (error) {
            alert('Ошибка: ' + error.message);
        }
    }
}

const router = new Router();
