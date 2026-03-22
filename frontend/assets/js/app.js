class App {
    constructor() {
        this.router = new Router();
        this.updateNavbar();
        window.addEventListener('hashchange', () => this.updateNavbar());
    }

    async updateNavbar() {
        const token = localStorage.getItem('token');
        const navbarMenu = document.getElementById('navbar-menu');
        const path = window.location.hash.slice(1) || '/';
        
        if (!token || ['/', '/login', '/register'].includes(path)) {
            navbarMenu.style.display = 'none';
        } else {
            navbarMenu.style.display = 'flex';

            try {
                const profile = await api.getProfile();
                const isProcessor = profile.role === 'processor';
                const batchesItem = navbarMenu.querySelector('a[href="#/batches"]')?.closest('li');
                if (batchesItem) {
                    batchesItem.style.display = isProcessor ? 'none' : '';
                }
            } catch (error) {
                // Keep default menu on profile load failure.
            }
        }
    }
}

let app;
document.addEventListener('DOMContentLoaded', () => {
    window.api = new MedWasteAPI();
    window.logout = () => {
        api.clearToken();
        window.location.hash = '/login';
    };

    app = new App();
});
