// Initialize dashboard
document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    const userRole = localStorage.getItem('user_role');
    
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    api.setToken(token);
    document.getElementById('userInfo').textContent = `Роль: ${userRole.toUpperCase()}`;

    // Show appropriate section based on role
    if (userRole === 'educator') {
        loadEducatorDashboard();
    } else if (userRole === 'driver') {
        loadDriverDashboard();
    } else if (userRole === 'processor') {
        loadProcessorDashboard();
    } else if (userRole === 'inspector') {
        loadInspectorDashboard();
    } else if (userRole === 'admin') {
        loadAdminDashboard();
    }
});

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user_role');
    window.location.href = 'login.html';
}

async function loadEducatorDashboard() {
    document.getElementById('educatorSection').style.display = 'block';
    showLoading(true);

    try {
        const batches = await api.getBatches();
        
        // Display stats
        const stats = `
            <div class="stat-card">
                <div class="number">${batches.length}</div>
                <div class="label">Всего партий</div>
            </div>
        `;
        document.getElementById('educatorStats').innerHTML = stats;

        // Display batches
        displayBatches(batches);
    } catch (error) {
        console.error('Error loading educator dashboard:', error);
    } finally {
        showLoading(false);
    }
}

function displayBatches(batches) {
    const batchesList = document.getElementById('batchesList');
    batchesList.innerHTML = '';

    if (!batches || batches.length === 0) {
        batchesList.innerHTML = '<tr><td colspan="6" class="text-center text-muted">Нет партий</td></tr>';
        return;
    }

    batches.forEach(batch => {
        const statusBadge = getStatusBadge(batch.status);
        const row = `
            <tr>
                <td>${batch.id.substring(0, 8)}...</td>
                <td>${batch.waste_type?.name || 'Unknown'}</td>
                <td>${batch.quantity}</td>
                <td>${statusBadge}</td>
                <td>${new Date(batch.created_at).toLocaleDateString('ru-RU')}</td>
                <td>
                    <button class="btn btn-sm btn-info" onclick="viewBatch('${batch.id}')">Просмотр</button>
                </td>
            </tr>
        `;
        batchesList.innerHTML += row;
    });
}

async function loadDriverDashboard() {
    document.getElementById('driverSection').style.display = 'block';
    showLoading(true);

    try {
        const batches = await api.getMyBatches();
        
        // Display stats
        const inTransit = batches.filter(b => b.status === 'IN_TRANSIT').length;
        const stats = `
            <div class="stat-card">
                <div class="number">${batches.length}</div>
                <div class="label">Всего партий</div>
            </div>
            <div class="stat-card">
                <div class="number">${inTransit}</div>
                <div class="label">В пути</div>
            </div>
        `;
        document.getElementById('driverStats').innerHTML = stats;

        // Display batches
        const driverBatchesList = document.getElementById('driverBatchesList');
        driverBatchesList.innerHTML = '';

        if (batches.length === 0) {
            driverBatchesList.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Нет партий</td></tr>';
        } else {
            batches.forEach(batch => {
                const statusBadge = getStatusBadge(batch.status);
                driverBatchesList.innerHTML += `
                    <tr>
                        <td>${batch.id.substring(0, 8)}...</td>
                        <td>${batch.organization?.name || 'Unknown'}</td>
                        <td>${statusBadge}</td>
                        <td>
                            <button class="btn btn-sm btn-success" onclick="confirmPickup('${batch.id}')">Подтвердить вывоз</button>
                        </td>
                    </tr>
                `;
            });
        }
    } catch (error) {
        console.error('Error loading driver dashboard:', error);
    } finally {
        showLoading(false);
    }
}

async function loadProcessorDashboard() {
    document.getElementById('processorSection').style.display = 'block';
    showLoading(true);

    try {
        const batches = await api.getAssignedBatches();
        
        // Display stats
        const received = batches.filter(b => b.status === 'RECEIVED').length;
        const stats = `
            <div class="stat-card">
                <div class="number">${batches.length}</div>
                <div class="label">Всего партий</div>
            </div>
            <div class="stat-card">
                <div class="number">${received}</div>
                <div class="label">Получено</div>
            </div>
        `;
        document.getElementById('processorStats').innerHTML = stats;

        // Display batches
        const processorBatchesList = document.getElementById('processorBatchesList');
        processorBatchesList.innerHTML = '';

        if (batches.length === 0) {
            processorBatchesList.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Нет партий</td></tr>';
        } else {
            batches.forEach(batch => {
                const statusBadge = getStatusBadge(batch.status);
                processorBatchesList.innerHTML += `
                    <tr>
                        <td>${batch.id.substring(0, 8)}...</td>
                        <td>${batch.organization?.name || 'Unknown'}</td>
                        <td>${statusBadge}</td>
                        <td>
                            ${batch.status === 'IN_TRANSIT' ? 
                                `<button class="btn btn-sm btn-success" onclick="receiveBatch('${batch.id}')">Получить</button>` :
                                '<span class="text-muted">Получено</span>'
                            }
                        </td>
                    </tr>
                `;
            });
        }
    } catch (error) {
        console.error('Error loading processor dashboard:', error);
    } finally {
        showLoading(false);
    }
}

async function loadInspectorDashboard() {
    document.getElementById('inspectorSection').style.display = 'block';
    showLoading(true);

    try {
        const batches = await api.getAllBatches();
        
        // Display stats
        const statuses = {
            'CREATED': batches.filter(b => b.status === 'CREATED').length,
            'IN_TRANSIT': batches.filter(b => b.status === 'IN_TRANSIT').length,
            'RECEIVED': batches.filter(b => b.status === 'RECEIVED').length
        };

        const stats = `
            <div class="stat-card">
                <div class="number">${batches.length}</div>
                <div class="label">Всего партий</div>
            </div>
            <div class="stat-card">
                <div class="number">${statuses.CREATED}</div>
                <div class="label">Создано</div>
            </div>
            <div class="stat-card">
                <div class="number">${statuses.IN_TRANSIT}</div>
                <div class="label">В пути</div>
            </div>
            <div class="stat-card">
                <div class="number">${statuses.RECEIVED}</div>
                <div class="label">Получено</div>
            </div>
        `;
        document.getElementById('inspectorStats').innerHTML = stats;

        // Display batches
        const inspectorBatchesList = document.getElementById('inspectorBatchesList');
        inspectorBatchesList.innerHTML = '';

        if (batches.length === 0) {
            inspectorBatchesList.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Нет партий</td></tr>';
        } else {
            batches.forEach(batch => {
                const statusBadge = getStatusBadge(batch.status);
                inspectorBatchesList.innerHTML += `
                    <tr>
                        <td>${batch.id.substring(0, 8)}...</td>
                        <td>${batch.waste_type?.name || 'Unknown'}</td>
                        <td>${statusBadge}</td>
                        <td>${batch.organization?.name || 'Unknown'}</td>
                        <td>
                            <button class="btn btn-sm btn-info" onclick="viewBatchDetails('${batch.id}')">История</button>
                        </td>
                    </tr>
                `;
            });
        }
    } catch (error) {
        console.error('Error loading inspector dashboard:', error);
    } finally {
        showLoading(false);
    }
}

async function loadAdminDashboard() {
    document.getElementById('adminSection').style.display = 'block';
    showLoading(true);

    try {
        const users = await api.getUsers();
        
        // Display users
        const usersList = document.getElementById('usersList');
        usersList.innerHTML = '';

        if (users.length === 0) {
            usersList.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Нет пользователей</td></tr>';
        } else {
            users.forEach(user => {
                usersList.innerHTML += `
                    <tr>
                        <td>${user.id.substring(0, 8)}...</td>
                        <td>${user.username}</td>
                        <td>${user.email}</td>
                        <td><span class="badge badge-info">${user.role}</span></td>
                        <td>${user.organization?.name || '—'}</td>
                    </tr>
                `;
            });
        }
    } catch (error) {
        console.error('Error loading admin dashboard:', error);
    } finally {
        showLoading(false);
    }
}

function showLoading(show) {
    document.getElementById('loadingSpinner').style.display = show ? 'block' : 'none';
}

function getStatusBadge(status) {
    const badges = {
        'CREATED': '<span class="badge-status badge-created">Создано</span>',
        'IN_TRANSIT': '<span class="badge-status badge-in-transit">В пути</span>',
        'RECEIVED': '<span class="badge-status badge-received">Получено</span>'
    };
    return badges[status] || status;
}

function showEducator() {
    hideAllSections();
    document.getElementById('educatorSection').style.display = 'block';
}

function showDriver() {
    hideAllSections();
    document.getElementById('driverSection').style.display = 'block';
}

function showProcessor() {
    hideAllSections();
    document.getElementById('processorSection').style.display = 'block';
}

function showInspector() {
    hideAllSections();
    document.getElementById('inspectorSection').style.display = 'block';
}

function showAdmin() {
    hideAllSections();
    document.getElementById('adminSection').style.display = 'block';
}

function hideAllSections() {
    document.getElementById('educatorSection').style.display = 'none';
    document.getElementById('driverSection').style.display = 'none';
    document.getElementById('processorSection').style.display = 'none';
    document.getElementById('inspectorSection').style.display = 'none';
    document.getElementById('adminSection').style.display = 'none';
}

async function viewBatch(batchId) {
    alert(`Просмотр партии: ${batchId}`);
}

async function confirmPickup(batchId) {
    const qrCode = prompt('Введите QR-код:');
    if (qrCode) {
        try {
            await api.confirmPickup(batchId, qrCode);
            alert('Вывоз подтвержден!');
            loadDriverDashboard();
        } catch (error) {
            alert('Ошибка: ' + error.message);
        }
    }
}

async function receiveBatch(batchId) {
    try {
        await api.receiveBatch(batchId);
        alert('Партия получена!');
        loadProcessorDashboard();
    } catch (error) {
        alert('Ошибка: ' + error.message);
    }
}

async function viewBatchDetails(batchId) {
    try {
        const statuses = await api.getBatchStatuses(batchId);
        alert('История изменений:\n' + JSON.stringify(statuses, null, 2));
    } catch (error) {
        alert('Ошибка: ' + error.message);
    }
}
