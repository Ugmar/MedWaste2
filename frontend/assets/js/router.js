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
        };
        window.addEventListener('hashchange', () => this.handleRoute());
        this.handleRoute();
    }

    getRoute() {
        return window.location.hash.slice(1) || '/';
    }

    async handleRoute() {
        const path = this.getRoute();
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
}

const router = new Router();
