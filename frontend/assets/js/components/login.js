class LoginComponent {
    async render() {
        const container = document.createElement('div');
        container.className = 'login-wrapper';
        container.innerHTML = `
            <div class="login-container">
                <div class="login-card">
                    <div class="text-center mb-4">
                        <i class="bi bi-hospital" style="font-size: 3rem; color: #0d6efd;"></i>
                        <h1 class="mt-3 fw-bold">MedWaste</h1>
                        <p class="text-muted">Система управления медицинскими отходами</p>
                    </div>

                    <ul class="nav nav-tabs mb-4" role="tablist">
                        <li class="nav-item" role="presentation">
                            <button class="nav-link active" id="login-tab" type="button" role="tab" data-bs-toggle="tab" data-bs-target="#login">Вход</button>
                        </li>
                        <li class="nav-item" role="presentation">
                            <button class="nav-link" id="register-tab" type="button" role="tab" data-bs-toggle="tab" data-bs-target="#register">Регистрация</button>
                        </li>
                    </ul>

                    <div class="tab-content">
                        <div class="tab-pane fade show active" id="login" role="tabpanel">
                            <form id="login-form">
                                <div class="mb-3">
                                    <label class="form-label"><i class="bi bi-person"></i> Имя пользователя</label>
                                    <input type="text" class="form-control" id="username" required placeholder="администратор">
                                </div>
                                <div class="mb-3">
                                    <label class="form-label"><i class="bi bi-lock"></i> Пароль</label>
                                    <input type="password" class="form-control" id="password" required placeholder="••••••••">
                                </div>
                                <button type="submit" class="btn btn-primary w-100 py-2">Вход</button>
                            </form>
                        </div>

                        <div class="tab-pane fade" id="register" role="tabpanel">
                            <form id="register-form">
                                <div class="mb-3">
                                    <label class="form-label"><i class="bi bi-building"></i> Организация</label>
                                    <input type="text" class="form-control" required>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label"><i class="bi bi-person"></i> ФИО</label>
                                    <input type="text" class="form-control" required>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label"><i class="bi bi-envelope"></i> Email</label>
                                    <input type="email" class="form-control" required>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label"><i class="bi bi-lock"></i> Пароль</label>
                                    <input type="password" class="form-control" required>
                                </div>
                                <button type="submit" class="btn btn-success w-100 py-2">Зарегистрироваться</button>
                            </form>
                        </div>
                    </div>

                    <div id="alert-container" class="mt-3"></div>
                </div>
            </div>
        `;

        container.querySelector('#login-form').addEventListener('submit', (e) => this.handleLogin(e, container));
        container.querySelector('#register-form').addEventListener('submit', (e) => this.handleRegister(e, container));

        return container;
    }

    async handleLogin(e, container) {
        e.preventDefault();
        const username = container.querySelector('#username').value;
        const password = container.querySelector('#password').value;

        try {
            const response = await api.login(username, password);
            api.setToken(response.access_token);
            window.location.hash = '/dashboard';
        } catch (error) {
            this.showAlert(container, 'Ошибка входа: ' + error.message, 'danger');
        }
    }

    async handleRegister(e, container) {
        e.preventDefault();
        this.showAlert(container, 'Функция регистрации пока не реализована', 'info');
    }

    showAlert(container, message, type) {
        const alertContainer = container.querySelector('#alert-container');
        alertContainer.innerHTML = `
            <div class="alert alert-${type} alert-dismissible fade show" role="alert">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
    }
}
