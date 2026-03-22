const API_BASE_URL = 'http://localhost:8000';

class MedWasteAPI {
  constructor() {
    this.token = localStorage.getItem('token');
  }

  setToken(token) {
    this.token = token;
    localStorage.setItem('token', token);
  }

  getHeaders() {
    return {
      'Content-Type': 'application/json',
      ...(this.token && { 'Authorization': `Bearer ${this.token}` })
    };
  }

  async request(endpoint, method = 'GET', body = null) {
    const options = {
      method,
      headers: this.getHeaders()
    };

    if (body) options.body = JSON.stringify(body);

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
      
      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('token');
          window.location.href = '/frontend/login.html';
        }
        const error = await response.json();
        throw new Error(error.detail || 'API Error');
      }

      return await response.json();
    } catch (error) {
      console.error('API Request Error:', error);
      throw error;
    }
  }

  // Auth endpoints
  login(username, password) {
    const params = new URLSearchParams();
    params.append('username', username);
    params.append('password', password);
    return fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      body: params
    }).then(r => r.json());
  }

  signup(userData) {
    return this.request('/auth/signup', 'POST', userData);
  }

  // Educator endpoints
  createBatch(batchData) {
    return this.request('/educator/batches', 'POST', batchData);
  }

  getBatches(skip = 0, limit = 100) {
    return this.request(`/educator/batches?skip=${skip}&limit=${limit}`);
  }

  getBatch(batchId) {
    return this.request(`/educator/batches/${batchId}`);
  }

  requestQRToken(batchId) {
    return this.request(`/educator/batches/${batchId}/qr-token`, 'POST');
  }

  // Driver endpoints
  getMyBatches(skip = 0, limit = 100) {
    return this.request(`/driver/batches?skip=${skip}&limit=${limit}`);
  }

  confirmPickup(batchId, qrCode) {
    return this.request(`/driver/batches/${batchId}/confirm-pickup`, 'POST', { qr_code: qrCode });
  }

  // Processor endpoints
  getAssignedBatches(skip = 0, limit = 100) {
    return this.request(`/processor/batches?skip=${skip}&limit=${limit}`);
  }

  receiveBatch(batchId) {
    return this.request(`/processor/batches/${batchId}/receive`, 'POST');
  }

  // Inspector endpoints
  getAllBatches(skip = 0, limit = 100) {
    return this.request(`/inspector/batches?skip=${skip}&limit=${limit}`);
  }

  getBatchStatuses(batchId) {
    return this.request(`/inspector/batches/${batchId}/statuses`);
  }

  getBatchEvents(batchId) {
    return this.request(`/inspector/batches/${batchId}/events`);
  }

  // Admin endpoints
  getUsers(skip = 0, limit = 100) {
    return this.request(`/admin/users?skip=${skip}&limit=${limit}`);
  }
}

const api = new MedWasteAPI();
