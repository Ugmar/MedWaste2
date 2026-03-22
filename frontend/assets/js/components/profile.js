class ProfileComponent {
    async render() {
        const container = document.createElement('div');
        container.className = 'container-lg';
        container.innerHTML = `
            <div class="row mb-4">
                <div class="col-12">
                    <h1 class="fw-bold"><i class="bi bi-person"></i> Профиль</h1>
                </div>
            </div>

            <div class="row g-3">
                <div class="col-lg-4">
                    <div class="card">
                        <div class="card-body text-center">
                            <div class="rounded-circle bg-primary text-white mb-3" style="width: 100px; height: 100px; margin: 0 auto; display: flex; align-items: center; justify-content: center;">
                                <i class="bi bi-person" style="font-size: 3rem;"></i>
                            </div>
                            <h5 id="profile-name">Загрузка...</h5>
                            <p class="text-muted" id="profile-role">-</p>
                            <p class="text-muted small" id="profile-email">-</p>
                        </div>
                    </div>
                </div>

                <div class="col-lg-8">
                    <div class="card">
                        <div class="card-header">
                            <i class="bi bi-info-circle"></i> Основная информация
                        </div>
                        <div class="card-body">
                            <form id="profile-form">
                                <div class="row mb-3">
                                    <div class="col-md-6">
                                        <label class="form-label">Имя пользователя</label>
                                        <input type="text" class="form-control" id="profile-username" readonly>
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label">Email</label>
                                        <input type="email" class="form-control" id="profile-email-input" readonly>
                                    </div>
                                </div>
                                <div class="row mb-3">
                                    <div class="col-md-6">
                                        <label class="form-label">Роль</label>
                                        <input type="text" class="form-control" id="profile-role-input" readonly>
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label">Организация</label>
                                        <input type="text" class="form-control" id="profile-org" readonly>
                                    </div>
                                </div>
                                <div class="row">
                                    <div class="col-md-6">
                                        <button type="button" class="btn btn-primary" disabled>
                                            <i class="bi bi-pencil"></i> Редактировать
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>

                    <div class="card mt-3">
                        <div class="card-header">
                            <i class="bi bi-lock"></i> Безопасность
                        </div>
                        <div class="card-body">
                            <button class="btn btn-outline-warning" disabled>
                                <i class="bi bi-key"></i> Изменить пароль
                            </button>
                            <button class="btn btn-outline-danger float-end" onclick="logout()">
                                <i class="bi bi-box-arrow-right"></i> Выход
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.loadProfile(container);
        return container;
    }

    async loadProfile(container) {
        try {
            const profile = await api.getProfile();
            container.querySelector('#profile-name').textContent = profile.username;
            container.querySelector('#profile-email').textContent = profile.email;
            container.querySelector('#profile-role').textContent = profile.role;
            container.querySelector('#profile-username').value = profile.username;
            container.querySelector('#profile-email-input').value = profile.email;
            container.querySelector('#profile-role-input').value = profile.role;
        } catch (error) {
            console.error('Ошибка загрузки профиля:', error);
        }
    }
}

function logout() {
    localStorage.removeItem('token');
    window.location.hash = '/login';
}
