const API_URL = '/api';
let token = localStorage.getItem('token');

class MedWasteApp {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    async init() {
        if (!token) {
            this.showLogin();
        } else {
            this.showDashboard();
        }
    }

    showLogin() {
        document.getElementById('content').innerHTML = `
            <div class="login-container">
                <div class="login-form">
                    <h2 class="text-center mb-4">🏥 MedWaste</h2>
                    <form onsubmit="app.handleLogin(event)">
                        <div class="mb-3">
                            <label class="form-label">Имя пользователя</label>
                            <input type="text" class="form-control" id="username" required>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Пароль</label>
                            <input type="password" class="form-control" id="password" required>
                        </div>
                        <button type="submit" class="btn btn-primary w-100">Вход</button>
                    </form>
                </div>
            </div>
        `;
    }

    async handleLogin(event) {
        event.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            if (!response.ok) throw new Error('Ошибка входа');

            const data = await response.json();
            token = data.access_token;
            localStorage.setItem('token', token);
            this.showDashboard();
        } catch (error) {
            alert('Ошибка входа: ' + error.message);
        }
    }

    showDashboard() {
        document.getElementById('content').innerHTML = `
            <h1>Dashboard</h1>
            <div class="dashboard-grid">
                <div class="stat-card">
                    <h3>120</h3>
                    <p>Партии</p>
                </div>
                <div class="stat-card">
                    <h3>25</h3>
                    <p>В пути</p>
                </div>
                <div class="stat-card">
                    <h3>850 кг</h3>
                    <p>Обработано</p>
                </div>
            </div>
            <div class="row">
                <div class="col-md-6">
                    <div class="card">
                        <div class="card-header">Последние партии</div>
                        <div class="card-body">
                            <table class="table table-sm">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Статус</th>
                                        <th>Вес</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td>#001</td>
                                        <td><span class="batch-status in-transit">В пути</span></td>
                                        <td>50 кг</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}

function logout() {
    localStorage.removeItem('token');
    token = null;
    app.init();
}

const app = new MedWasteApp();
