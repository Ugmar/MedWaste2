class DashboardComponent {
    async render() {
        const container = document.createElement('div');
        container.className = 'container-lg';
        container.innerHTML = `
            <div class="row mb-4">
                <div class="col-12">
                    <h1 class="fw-bold mb-2">
                        <i class="bi bi-graph-up"></i> Dashboard
                    </h1>
                    <p class="text-muted">Обзор деятельности</p>
                </div>
            </div>

            <div class="row g-3 mb-4">
                <div class="col-md-3">
                    <div class="stat-card">
                        <div class="stat-icon bg-primary">
                            <i class="bi bi-boxes"></i>
                        </div>
                        <h3>120</h3>
                        <p>Партии отходов</p>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="stat-card">
                        <div class="stat-icon bg-warning">
                            <i class="bi bi-truck"></i>
                        </div>
                        <h3>25</h3>
                        <p>В пути доставки</p>
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
                        <div class="stat-icon bg-danger">
                            <i class="bi bi-exclamation-triangle"></i>
                        </div>
                        <h3>3</h3>
                        <p>Ждут внимания</p>
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
                                            <th>Номер</th>
                                            <th>Тип отходов</th>
                                            <th>Вес</th>
                                            <th>Статус</th>
                                            <th>Последнее обновление</th>
                                            <th>Действия</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td>#001</td>
                                            <td>Медикаменты</td>
                                            <td>50 кг</td>
                                            <td><span class="badge bg-warning">В пути</span></td>
                                            <td>2 часа назад</td>
                                            <td>
                                                <button class="btn btn-sm btn-info"><i class="bi bi-eye"></i></button>
                                                <button class="btn btn-sm btn-primary"><i class="bi bi-pencil"></i></button>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td>#002</td>
                                            <td>Инструменты</td>
                                            <td>120 кг</td>
                                            <td><span class="badge bg-success">Получено</span></td>
                                            <td>1 день назад</td>
                                            <td>
                                                <button class="btn btn-sm btn-info"><i class="bi bi-eye"></i></button>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="col-lg-4">
                    <div class="card">
                        <div class="card-header">
                            <i class="bi bi-info-circle"></i> Быстрые действия
                        </div>
                        <div class="card-body">
                            <a href="#/batches" class="btn btn-outline-primary w-100 mb-2">
                                <i class="bi bi-plus-circle"></i> Новая партия
                            </a>
                            <a href="#/organizations" class="btn btn-outline-secondary w-100 mb-2">
                                <i class="bi bi-search"></i> Поиск организации
                            </a>
                            <a href="#/profile" class="btn btn-outline-info w-100">
                                <i class="bi bi-gear"></i> Настройки профиля
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        `;

        return container;
    }
}
