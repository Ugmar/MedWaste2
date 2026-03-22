class App {
    constructor() {
        this.router = new Router();
        this.updateNavbar();
        window.addEventListener('hashchange', () => this.updateNavbar());
    }

    updateNavbar() {
        const token = localStorage.getItem('token');
        const navbarMenu = document.getElementById('navbar-menu');
        const path = window.location.hash.slice(1) || '/';
        
        if (!token || ['/', '/login', '/register'].includes(path)) {
            navbarMenu.style.display = 'none';
        } else {
            navbarMenu.style.display = 'flex';
        }
    }
}

let app;
document.addEventListener('DOMContentLoaded', () => {
    window.api = new MedWasteAPI();
    window.logout = () => {
        localStorage.removeItem('token');
        window.location.hash = '/login';
    };
    
    window.receiveBatch = async (batchId) => {
        try {
            if (!confirm('Вы уверены, что хотите принять эту партию на переработку?')) {
                return;
            }
            await api.receiveBatch(batchId);
            alert('Партия успешно принята на переработку!');
            // Reload dashboard
            app.router.handleRoute();
        } catch (error) {
            alert('Ошибка: ' + error.message);
        }
    };
    
    window.completeBatch = async (batchId) => {
        try {
            if (!confirm('Вы уверены, что хотите отметить эту партию как обработанную?')) {
                return;
            }
            await api.completeBatch(batchId);
            alert('Партия успешно отмечена как обработанная!');
            // Reload dashboard
            app.router.handleRoute();
        } catch (error) {
            alert('Ошибка: ' + error.message);
        }
    };
    
    window.generateQRCode = async (batchId) => {
        try {
            const token = await api.generateQRToken(batchId, 7);
            alert(`QR код сгенерирован успешно!\n\nТокен: ${token.token}\n\nДействителен до: ${new Date(token.expires_at).toLocaleString('ru-RU')}`);
        } catch (error) {
            alert('Ошибка при генерации QR кода: ' + error.message);
        }
    };
    
    window.exportReport = (type) => {
        try {
            const endpoint = type === 'batches' ? '/inspector/reports/batches/csv' : '/inspector/reports/events/csv';
            const url = `/api${endpoint}`;
            const link = document.createElement('a');
            link.href = url;
            link.download = `report_${type}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            alert('Ошибка при экспорте: ' + error.message);
        }
    };
    
    app = new App();
});
