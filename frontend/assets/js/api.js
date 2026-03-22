const API_URL = '/api';

class MedWasteAPI {
    constructor() {
        this.token = localStorage.getItem('token');
        this.headers = {
            'Content-Type': 'application/json',
            ...(this.token && { 'Authorization': `Bearer ${this.token}` })
        };
    }

    setToken(token) {
        this.token = token;
        localStorage.setItem('token', token);
        this.headers.Authorization = `Bearer ${token}`;
    }

    async request(method, endpoint, data = null) {
        const url = `${API_URL}${endpoint}`;
        const options = { method, headers: this.headers };

        if (data) options.body = JSON.stringify(data);

        try {
            const response = await fetch(url, options);
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || `HTTP ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    // Auth
    login(username, password) {
        return this.request('POST', '/auth/login', { username, password });
    }

    signup(userData) {
        return this.request('POST', '/auth/signup', userData);
    }

    // Batches
    getBatches(skip = 0, limit = 100) {
        return this.request('GET', `/educator/batches?skip=${skip}&limit=${limit}`);
    }

    getBatch(batchId) {
        return this.request('GET', `/educator/batches/${batchId}`);
    }

    createBatch(batchData) {
        return this.request('POST', '/educator/batches', batchData);
    }

    // Organizations
    getOrganizations(skip = 0, limit = 100) {
        return this.request('GET', `/organizations?skip=${skip}&limit=${limit}`);
    }

    // Profile
    getProfile() {
        return this.request('GET', '/auth/profile');
    }
}
