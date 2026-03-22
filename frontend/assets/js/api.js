const API_BASE_URL = '/api';

class MedWasteAPI {
    constructor() {
        this.token = localStorage.getItem('token');
        this.profile = null;
    }

    setToken(token) {
        this.token = token;
        localStorage.setItem('token', token);
        this.profile = null;
    }

    clearToken() {
        this.token = null;
        this.profile = null;
        localStorage.removeItem('token');
    }

    getHeaders() {
        return {
            'Content-Type': 'application/json',
            ...(this.token && { Authorization: `Bearer ${this.token}` }),
        };
    }

    async request(method, endpoint, data = null) {
        const options = {
            method,
            headers: this.getHeaders(),
        };

        if (data !== null) {
            options.body = JSON.stringify(data);
        }

        const response = await fetch(`${API_BASE_URL}${endpoint}`, options);

        if (!response.ok) {
            if (response.status === 401) {
                this.clearToken();
                window.location.hash = '/login';
            }

            let detail = `HTTP ${response.status}`;
            try {
                const error = await response.json();
                detail = error.detail || detail;
            } catch (_) {
                // no-op
            }
            throw new Error(detail);
        }

        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
            return response.json();
        }

        return null;
    }

    // Auth
    login(username, password) {
        return this.request('POST', '/auth/login', { username, password });
    }

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

    // Public
    getOrganizations(skip = 0, limit = 100) {
        return this.request('GET', `/organizations?skip=${skip}&limit=${limit}`);
    }

    getWasteTypes(skip = 0, limit = 100) {
        return this.request('GET', `/waste-types?skip=${skip}&limit=${limit}`);
    }

    // Educator
    getEducatorBatches(skip = 0, limit = 100) {
        return this.request('GET', `/educator/batches?skip=${skip}&limit=${limit}`);
    }

    getBatches(skip = 0, limit = 100) {
        return this.getEducatorBatches(skip, limit);
    }

    getBatch(batchId) {
        return this.request('GET', `/educator/batches/${batchId}`);
    }

    createBatch(batchData) {
        return this.request('POST', '/educator/batches', batchData);
    }

    getEducatorDrivers(processorOrganizationId, skip = 0, limit = 100) {
        return this.request(
            'GET',
            `/educator/drivers?processor_organization_id=${processorOrganizationId}&skip=${skip}&limit=${limit}`
        );
    }

    getAvailableDrivers(processorOrganizationId, skip = 0, limit = 100) {
        return this.getEducatorDrivers(processorOrganizationId, skip, limit);
    }

    generateQRToken(batchId, lifetimeDays = 7) {
        return this.request('POST', `/educator/batches/${batchId}/qr-tokens`, {
            batch_id: batchId,
            lifetime_days: lifetimeDays,
        });
    }

    getBatchQRTokens(batchId, skip = 0, limit = 100) {
        return this.request('GET', `/educator/batches/${batchId}/qr-tokens?skip=${skip}&limit=${limit}`);
    }

    // Driver
    getDriverBatches(skip = 0, limit = 100) {
        return this.request('GET', `/driver/batches?skip=${skip}&limit=${limit}`);
    }

    scanDriverQr(token) {
        return this.request('POST', '/driver/scan-qr', { token });
    }

    confirmPickup(batchId, token) {
        return this.request('POST', `/driver/batch/${batchId}/pickup?token=${encodeURIComponent(token)}`);
    }

    // Processor
    getAssignedBatches(skip = 0, limit = 100) {
        return this.request('GET', `/processor/assigned-batches?skip=${skip}&limit=${limit}`);
    }

    getProcessorAssignedBatches(skip = 0, limit = 100) {
        return this.getAssignedBatches(skip, limit);
    }

    receiveBatch(batchId) {
        return this.request('POST', `/processor/batches/${batchId}/receive`);
    }

    createProcessorDriver(userData) {
        return this.request('POST', '/processor/drivers', userData);
    }

    // Inspector
    getInspectorSummary() {
        return this.request('GET', '/inspector/summary');
    }

    getInspectorWasteBatches(skip = 0, limit = 100) {
        return this.request('GET', `/inspector/waste-batches?skip=${skip}&limit=${limit}`);
    }

    // Admin
    getAdminOrganizations(skip = 0, limit = 100) {
        return this.request('GET', `/admin/organizations?skip=${skip}&limit=${limit}`);
    }

    createOrganization(payload) {
        return this.request('POST', '/admin/organizations', payload);
    }

    getAdminWasteTypes(skip = 0, limit = 100) {
        return this.request('GET', `/admin/waste-types?skip=${skip}&limit=${limit}`);
    }

    createWasteType(payload) {
        return this.request('POST', '/admin/waste-types', payload);
    }

    createAdminUser(payload) {
        return this.request('POST', '/admin/users', payload);
    }

    getEducatorBatchesReportUrl() {
        return `${API_BASE_URL}/educator/reports/batches/csv`;
    }

    getInspectorBatchesReportUrl() {
        return `${API_BASE_URL}/inspector/reports/batches/csv`;
    }

    getInspectorEventsReportUrl() {
        return `${API_BASE_URL}/inspector/reports/events/csv`;
    }

    async downloadCsv(url, filename) {
        const response = await fetch(url, {
            headers: this.getHeaders(),
        });

        if (!response.ok) {
            throw new Error(`Ошибка выгрузки CSV: HTTP ${response.status}`);
        }

        const blob = await response.blob();
        const fileUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = fileUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(fileUrl);
    }
}

const api = new MedWasteAPI();
