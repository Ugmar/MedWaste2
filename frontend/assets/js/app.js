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
    app = new App();
});
