class QRScannerComponent {
    async render() {
        const container = document.createElement('div');
        container.className = 'container-lg mt-4';
        container.innerHTML = `
            <div class="row mb-4">
                <div class="col-12">
                    <h1 class="fw-bold mb-2"><i class="bi bi-qr-code"></i> Сканирование QR кода</h1>
                    <p class="text-muted">Отсканируйте QR-код партии отходов для получения доступа</p>
                </div>
            </div>

            <div class="row">
                <div class="col-lg-8 offset-lg-2">
                    <div class="card">
                        <div class="card-body text-center">
                            <div id="camera-container" style="display: none;">
                                <video id="qr-video" width="100%" style="max-width: 400px; border-radius: 8px;"></video>
                                <p class="text-muted mt-3">Направьте камеру на QR-код</p>
                            </div>

                            <div id="manual-input-container">
                                <p class="text-muted mb-3">Или введите токен вручную:</p>
                                <div class="input-group mb-3">
                                    <input type="text" class="form-control" id="qr-token-input" 
                                        placeholder="Введите токен QR кода..." autofocus>
                                    <button class="btn btn-primary" onclick="scanQRToken()">
                                        <i class="bi bi-search"></i> Получить доступ
                                    </button>
                                </div>
                                <button class="btn btn-outline-secondary w-100" id="camera-toggle-btn">
                                    <i class="bi bi-camera"></i> Использовать камеру
                                </button>
                            </div>

                            <div id="result-container" style="display: none;" class="mt-4">
                                <div id="batch-info"></div>
                            </div>
                        </div>
                    </div>

                    <div class="card mt-3" id="history-card" style="display: none;">
                        <div class="card-header">
                            <i class="bi bi-clock-history"></i> История сканирований
                        </div>
                        <div class="card-body">
                            <div id="scan-history"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Setup event listeners
        const tokenInput = container.querySelector('#qr-token-input');
        tokenInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                scanQRToken();
            }
        });

        const cameraToggleBtn = container.querySelector('#camera-toggle-btn');
        cameraToggleBtn.addEventListener('click', () => this.toggleCamera());

        // Load scan history
        this.loadScanHistory(container);

        return container;
    }

    async toggleCamera() {
        const cameraContainer = document.querySelector('#camera-container');
        const manualContainer = document.querySelector('#manual-input-container');
        const video = document.querySelector('#qr-video');

        if (cameraContainer.style.display === 'none') {
            // Show camera
            cameraContainer.style.display = 'block';
            manualContainer.style.display = 'none';

            try {
                const stream = await navigator.mediaDevices.getUserMedia({ 
                    video: { facingMode: 'environment' } 
                });
                video.srcObject = stream;
                this.startQRScanning(video);
            } catch (error) {
                alert('Камера недоступна: ' + error.message);
                cameraContainer.style.display = 'none';
                manualContainer.style.display = 'block';
            }
        } else {
            // Hide camera
            cameraContainer.style.display = 'none';
            manualContainer.style.display = 'block';
            const stream = video.srcObject;
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        }
    }

    startQRScanning(video) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        const scanFrame = () => {
            if (video.readyState === video.HAVE_ENOUGH_DATA) {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                
                // Use jsQR if available
                if (typeof jsQR !== 'undefined') {
                    const code = jsQR(imageData.data, canvas.width, canvas.height, {
                        inversionAttempts: 'dontInvert'
                    });
                    
                    if (code) {
                        // QR code detected
                        console.log('QR code detected:', code.data);
                        document.querySelector('#qr-token-input').value = code.data;
                        scanQRToken();
                        return; // Stop scanning
                    }
                } else {
                    console.warn('jsQR library not loaded');
                }
            }
            requestAnimationFrame(scanFrame);
        };
        scanFrame();
    }

    async loadScanHistory(container) {
        // Load from localStorage
        const history = JSON.parse(localStorage.getItem('qr_scan_history') || '[]');
        if (history.length > 0) {
            const historyCard = container.querySelector('#history-card');
            historyCard.style.display = 'block';
            const historyDiv = container.querySelector('#scan-history');
            historyDiv.innerHTML = history.map(scan => `
                <div class="card mb-2">
                    <div class="card-body">
                        <p><strong>Партия:</strong> #${scan.batch_id.substring(0, 8)}</p>
                        <p><strong>Статус:</strong> <span class="badge bg-info">${scan.status}</span></p>
                        <p><strong>Время:</strong> ${new Date(scan.timestamp).toLocaleString('ru-RU')}</p>
                    </div>
                </div>
            `).join('');
        }
    }
}

async function scanQRToken() {
    const token = document.querySelector('#qr-token-input').value.trim();
    if (!token) {
        alert('Пожалуйста, введите токен QR кода');
        return;
    }

    try {
        const payload = {
            token: token
        };

        // Get user role to determine correct endpoint
        const profile = await api.getProfile();
        const endpoint = profile.role === 'driver' || profile.role === 'DRIVER' 
            ? '/api/driver/scan-qr' 
            : '/api/processor/scan-qr';

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const error = await response.json();
            alert('Ошибка доступа: ' + (error.detail || error.message));
            return;
        }

        const batchData = await response.json();

        // Save to history
        const history = JSON.parse(localStorage.getItem('qr_scan_history') || '[]');
        history.push({
            batch_id: batchData.batch_id,
            status: batchData.status,
            timestamp: new Date().toISOString()
        });
        localStorage.setItem('qr_scan_history', JSON.stringify(history));

        // Display batch info
        const resultDiv = document.querySelector('#result-container');
        resultDiv.style.display = 'block';
        resultDiv.innerHTML = `
            <div class="alert alert-success">
                <h5><i class="bi bi-check-circle"></i> Доступ предоставлен!</h5>
                <p>Партия успешно отсканирована</p>
            </div>
            <div class="card">
                <div class="card-header">
                    <h5 class="mb-0"><i class="bi bi-box"></i> Информация о партии</h5>
                </div>
                <div class="card-body">
                    <p><strong>Номер партии:</strong> ${batchData.batch_id}</p>
                    <p><strong>Тип отходов:</strong> ${batchData.waste_type_name}</p>
                    <p><strong>Количество:</strong> ${batchData.quantity} ${batchData.unit}</p>
                    <p><strong>Статус:</strong> <span class="badge bg-info">${batchData.status}</span></p>
                    <p><strong>Адрес сбора:</strong> ${batchData.pickup_address}</p>
                    <p><strong>Адрес доставки:</strong> ${batchData.delivery_address}</p>
                    <p><strong>От:</strong> ${batchData.educator_organization_name}</p>
                    <p><strong>На переработку:</strong> ${batchData.processor_organization_name}</p>
                    <p><strong>Доступ действителен до:</strong> ${new Date(batchData.access_expires_at).toLocaleString('ru-RU')}</p>
                </div>
            </div>
        `;

        // Clear input
        document.querySelector('#qr-token-input').value = '';
    } catch (error) {
        alert('Ошибка при сканировании: ' + error.message);
    }
}
