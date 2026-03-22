class OrganizationsComponent {
    async render() {
        const container = document.createElement('div');
        container.className = 'container-lg';
        container.innerHTML = `
            <div class="row mb-4">
                <div class="col-12">
                    <h1 class="fw-bold"><i class="bi bi-building"></i> Организации</h1>
                </div>
            </div>

            <div class="row g-3" id="organizations-container">
                <div class="col-12 text-center">
                    <div class="spinner-border" role="status">
                        <span class="visually-hidden">Загрузка...</span>
                    </div>
                </div>
            </div>
        `;

        this.loadOrganizations(container);
        return container;
    }

    async loadOrganizations(container) {
        try {
            const orgs = await api.getOrganizations();
            const orgContainer = container.querySelector('#organizations-container');
            
            if (orgs.length === 0) {
                orgContainer.innerHTML = '<div class="col-12 text-center text-muted">Организаций не найдено</div>';
                return;
            }

            orgContainer.innerHTML = orgs.map(org => `
                <div class="col-md-6 col-lg-4">
                    <div class="card h-100 org-card">
                        <div class="card-body">
                            <h5 class="card-title"><i class="bi bi-hospital"></i> ${org.name}</h5>
                            <p class="card-text text-muted">${org.inn}</p>
                            <div class="row g-2 mt-3">
                                <div class="col-6">
                                    <small class="d-block text-muted">ИНН</small>
                                    <strong>${org.inn}</strong>
                                </div>
                                <div class="col-6">
                                    <small class="d-block text-muted">КПП</small>
                                    <strong>${org.kpp || '-'}</strong>
                                </div>
                            </div>
                            <button class="btn btn-sm btn-primary mt-3 w-100" onclick="window.location.hash='/organization/${org.id}'">
                                <i class="bi bi-arrow-right"></i> Подробнее
                            </button>
                        </div>
                    </div>
                </div>
            `).join('');
        } catch (error) {
            console.error('Ошибка загрузки организаций:', error);
            const orgContainer = container.querySelector('#organizations-container');
            orgContainer.innerHTML = '<div class="col-12 text-center text-danger">Ошибка загрузки данных</div>';
        }
    }
}
