const API_URL = '/api';

class MedWasteAPI {
    constructor() {
        this.token = localStorage.getItem('token');
        this.profile = null;
        this.headers = {
            'Content-Type': 'application/json',
            ...(this.token && { 'Authorization': `Bearer ${this.token}` })
        };
    }

    setToken(token) {
        this.token = token;
        localStorage.setItem('token', token);
        this.headers.Authorization = `Bearer ${token}`;
        this.profile = null; // Reset profile when token changes
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

    getDriverBatches(skip = 0, limit = 100) {
        return this.request('GET', `/driver/batches?skip=${skip}&limit=${limit}`);
    }

    receiveBatch(batchId) {
        return this.request('POST', `/processor/batches/${batchId}/receive`, {});
    }

    completeBatch(batchId) {
        return this.request('POST', `/processor/batches/${batchId}/complete`, {});
    }

    getAssignedBatches(skip = 0, limit = 100) {
        return this.request('GET', `/processor/assigned-batches?skip=${skip}&limit=${limit}`);
    }

    generateQRToken(batchId, lifetimeDays = 7) {
        return this.request('POST', `/educator/batches/${batchId}/qr-tokens`, { lifetime_days: lifetimeDays });
    }

    getQRTokens(batchId) {
        return this.request('GET', `/educator/batches/${batchId}/qr-tokens`);
    }

    // Export
    exportCSV(endpoint) {
        const url = `${API_URL}${endpoint}`;
        const link = document.createElement('a');
        link.href = url;
        link.headers = this.headers;
        link.download = `report.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    exportBatchesCSV(role = 'inspector') {
        const endpoint = role === 'educator' ? '/educator/reports/batches/csv' : '/inspector/reports/batches/csv';
        window.location.href = `${API_URL}${endpoint}`;
    }

    exportEventsCSV(role = 'inspector') {
        const endpoint = role === 'educator' ? '/educator/reports/events/csv' : '/inspector/reports/events/csv';
        window.location.href = `${API_URL}${endpoint}`;
    }

    // Organizations
    getOrganizations(skip = 0, limit = 100) {
        return this.request('GET', `/organizations?skip=${skip}&limit=${limit}`);
    }

    // Waste Types
    getWasteTypes(skip = 0, limit = 100) {
        return this.request('GET', `/waste-types?skip=${skip}&limit=${limit}`);
    }

    // Profile
    async getProfile() {
        if (!this.profile) {
            this.profile = await this.request('GET', '/auth/profile');
        }
        return this.profile;
    }

    async getUserRole() {
        const profile = await this.getProfile();
        return profile.role;
    }

    // Events
    getRecentEvents(limit = 20) {
        return this.request('GET', `/events/recent?limit=${limit}`);
    }
}

// Create global API instance
const api = new MedWasteAPI();
