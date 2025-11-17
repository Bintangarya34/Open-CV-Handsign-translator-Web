class YOLODetector {
    constructor() {
        this.backendUrl = 'http://localhost:5000';
        this.currentMediaType = 'image';
        this.isLiveDetection = false;
        this.animationId = null;
        this.lastTime = 0;
        this.fps = 0;
        this.frameCount = 0;
        this.initializeElements();
        this.setupEventListeners();
    }

    initializeElements() {
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');
        this.uploadTitle = document.getElementById('uploadTitle');
        this.uploadSubtitle = document.getElementById('uploadSubtitle');
        
        // Camera elements
        this.cameraBtn = document.getElementById('cameraBtn');
        this.liveDetectionBtn = document.getElementById('liveDetectionBtn');
        this.video = document.getElementById('video');
        this.canvas = document.getElementById('canvas');
        
        // Results elements
        this.resultsSection = document.getElementById('resultsSection');
        this.resultImage = document.getElementById('resultImage');
        this.resultVideo = document.getElementById('resultVideo');
        this.detectionInfo = document.getElementById('detectionInfo');
        
        // Live detection elements
        this.liveDetectionSection = document.getElementById('liveDetectionSection');
        this.stopLiveBtn = document.getElementById('stopLiveBtn');
        this.liveVideo = document.getElementById('liveVideo');
        this.liveCanvas = document.getElementById('liveCanvas');
        this.liveDetections = document.getElementById('liveDetections');
        this.fpsCounter = document.getElementById('fpsCounter');
        
        this.loading = document.getElementById('loading');
        
        // Tab buttons
        this.tabBtns = document.querySelectorAll('.tab-btn');
    }

    setupEventListeners() {
        // File upload events
        this.uploadArea.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        
        // Drag and drop events
        this.uploadArea.addEventListener('dragover', (e) => this.handleDragOver(e));
        this.uploadArea.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        this.uploadArea.addEventListener('drop', (e) => this.handleDrop(e));
        
        // Camera buttons
        this.cameraBtn.addEventListener('click', () => this.toggleCamera());
        this.liveDetectionBtn.addEventListener('click', () => this.startLiveDetection());
        this.stopLiveBtn.addEventListener('click', () => this.stopLiveDetection());
        
        // Tab buttons
        this.tabBtns.forEach(btn => {
            btn.addEventListener('click', (e) => this.switchMediaType(e.target.dataset.type));
        });
    }

    switchMediaType(type) {
        this.currentMediaType = type;
        
        // Update active tab
        this.tabBtns.forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-type="${type}"]`).classList.add('active');
        
        // Update file input accept
        if (type === 'image') {
            this.fileInput.accept = 'image/*';
            this.uploadTitle.textContent = 'Drop your image here or click to upload';
            this.uploadSubtitle.textContent = 'Supports JPG, PNG, GIF';
        } else {
            this.fileInput.accept = 'video/*';
            this.uploadTitle.textContent = 'Drop your video here or click to upload';
            this.uploadSubtitle.textContent = 'Supports MP4, AVI, MOV';
        }
    }

    handleDragOver(e) {
        e.preventDefault();
        this.uploadArea.classList.add('dragover');
    }

    handleDragLeave(e) {
        e.preventDefault();
        this.uploadArea.classList.remove('dragover');
    }

    handleDrop(e) {
        e.preventDefault();
        this.uploadArea.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            this.processFile(files[0]);
        }
    }

    handleFileSelect(e) {
        const file = e.target.files[0];
        if (file) {
            this.processFile(file);
        }
    }

    async processFile(file) {
        const isImage = file.type.startsWith('image/');
        const isVideo = file.type.startsWith('video/');
        
        if (!isImage && !isVideo) {
            this.showError('Please select a valid image or video file');
            return;
        }
        
        this.showLoading(true);
        this.hideResults();

        const formData = new FormData();
        formData.append(isImage ? 'image' : 'video', file);

        try {
            const endpoint = isImage ? '/detect' : '/detect';
            const response = await fetch(`${this.backendUrl}${endpoint}`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            this.displayResults(result, isVideo);
        } catch (error) {
            console.error('Error:', error);
            this.showError('Failed to process file. Make sure the backend server is running.');
        } finally {
            this.showLoading(false);
        }
    }

    async toggleCamera() {
        if (this.video.style.display === 'none') {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                this.video.srcObject = stream;
                this.video.style.display = 'block';
                this.cameraBtn.textContent = 'Capture Image';
            } catch (error) {
                this.showError('Could not access camera');
            }
        } else {
            this.captureImage();
        }
    }

    captureImage() {
        const context = this.canvas.getContext('2d');
        this.canvas.width = this.video.videoWidth;
        this.canvas.height = this.video.videoHeight;
        context.drawImage(this.video, 0, 0);
        
        this.canvas.toBlob((blob) => {
            this.processFile(blob);
        });

        // Stop camera
        const stream = this.video.srcObject;
        const tracks = stream.getTracks();
        tracks.forEach(track => track.stop());
        this.video.style.display = 'none';
        this.cameraBtn.textContent = 'Use Camera';
    }

    async startLiveDetection() {
        if (this.isLiveDetection) return;
        
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            this.liveVideo.srcObject = stream;
            this.isLiveDetection = true;
            
            // Hide other sections and show live detection
            this.hideResults();
            this.showLiveDetection(true);
            
            // Setup canvas
            this.liveVideo.addEventListener('loadedmetadata', () => {
                this.liveCanvas.width = this.liveVideo.videoWidth;
                this.liveCanvas.height = this.liveVideo.videoHeight;
                this.startLiveLoop();
            });
            
        } catch (error) {
            this.showError('Could not access camera for live detection');
        }
    }

    startLiveLoop() {
        const detectFrame = async (currentTime) => {
            if (!this.isLiveDetection) return;
            
            // Calculate FPS
            if (currentTime - this.lastTime >= 1000) {
                this.fps = this.frameCount;
                this.frameCount = 0;
                this.lastTime = currentTime;
                this.fpsCounter.textContent = this.fps;
            }
            this.frameCount++;
            
            // Capture frame and send for detection (every 5 frames to reduce load)
            if (this.frameCount % 5 === 0) {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = this.liveVideo.videoWidth;
                canvas.height = this.liveVideo.videoHeight;
                ctx.drawImage(this.liveVideo, 0, 0);
                
                canvas.toBlob(async (blob) => {
                    if (!this.isLiveDetection) return;
                    
                    try {
                        const formData = new FormData();
                        formData.append('image', blob);
                        
                        const response = await fetch(`${this.backendUrl}/detect`, {
                            method: 'POST',
                            body: formData
                        });
                        
                        if (response.ok) {
                            const result = await response.json();
                            this.drawLiveDetections(result);
                            this.updateLiveDetections(result.detections || []);
                        }
                    } catch (error) {
                        console.error('Live detection error:', error);
                    }
                }, 'image/jpeg', 0.7);
            }
            
            this.animationId = requestAnimationFrame(detectFrame);
        };
        
        this.animationId = requestAnimationFrame(detectFrame);
    }

    drawLiveDetections(result) {
        if (!result.success || !result.detections) return;
        
        const ctx = this.liveCanvas.getContext('2d');
        ctx.clearRect(0, 0, this.liveCanvas.width, this.liveCanvas.height);
        
        result.detections.forEach((detection, index) => {
            const [x1, y1, x2, y2] = detection.bbox;
            const width = x2 - x1;
            const height = y2 - y1;
            
            // Scale coordinates to canvas size
            const scaleX = this.liveCanvas.width / this.liveVideo.videoWidth || 1;
            const scaleY = this.liveCanvas.height / this.liveVideo.videoHeight || 1;
            
            const scaledX = x1 * scaleX;
            const scaledY = y1 * scaleY;
            const scaledWidth = width * scaleX;
            const scaledHeight = height * scaleY;
            
            // Choose color
            const colors = ['#ff6b9d', '#74b9ff', '#6c5ce7', '#f8b500', '#fd79a8'];
            const color = colors[index % colors.length];
            
            // Draw bounding box
            ctx.strokeStyle = color;
            ctx.lineWidth = 3;
            ctx.strokeRect(scaledX, scaledY, scaledWidth, scaledHeight);
            
            // Draw label background
            const label = `${detection.class}: ${(detection.confidence * 100).toFixed(1)}%`;
            ctx.font = '16px Inter';
            const textWidth = ctx.measureText(label).width;
            
            ctx.fillStyle = color;
            ctx.fillRect(scaledX, scaledY - 25, textWidth + 10, 25);
            
            // Draw label text
            ctx.fillStyle = 'white';
            ctx.fillText(label, scaledX + 5, scaledY - 5);
        });
    }

    updateLiveDetections(detections) {
        if (!detections || detections.length === 0) {
            this.liveDetections.innerHTML = '<div class="detection-item">No objects detected in current frame</div>';
            return;
        }

        this.liveDetections.innerHTML = detections.map(detection => {
            const confidence = (detection.confidence * 100).toFixed(1);
            return `
                <div class="detection-item">
                    <span class="detection-label">${detection.class}</span>
                    <span class="detection-confidence">${confidence}%</span>
                </div>
            `;
        }).join('');
    }

    stopLiveDetection() {
        this.isLiveDetection = false;
        
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        
        // Stop camera
        const stream = this.liveVideo.srcObject;
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
        
        this.showLiveDetection(false);
    }

    displayResults(result, isVideo = false) {
        if (result.success) {
            if (isVideo) {
                this.resultImage.style.display = 'none';
                this.resultVideo.style.display = 'block';
                this.resultVideo.src = `data:video/mp4;base64,${result.video}`;
            } else {
                this.resultVideo.style.display = 'none';
                this.resultImage.style.display = 'block';
                this.resultImage.src = `data:image/jpeg;base64,${result.image}`;
            }
            
            this.detectionInfo.innerHTML = this.formatDetections(result.detections);
            this.showResults(true);
        } else {
            this.showError(result.error || 'Detection failed');
        }
    }

    formatDetections(detections) {
        if (!detections || detections.length === 0) {
            return '<div class="detection-item">No objects detected</div>';
        }

        return detections.map(detection => {
            const confidence = (detection.confidence * 100).toFixed(1);
            return `
                <div class="detection-item">
                    <span class="detection-label">${detection.class}</span>
                    <span class="detection-confidence">${confidence}%</span>
                </div>
            `;
        }).join('');
    }

    showLoading(show) {
        this.loading.style.display = show ? 'block' : 'none';
    }

    showResults(show) {
        this.resultsSection.style.display = show ? 'block' : 'none';
    }

    showLiveDetection(show) {
        this.liveDetectionSection.style.display = show ? 'block' : 'none';
    }

    hideResults() {
        this.resultsSection.style.display = 'none';
        this.liveDetectionSection.style.display = 'none';
    }

    showError(message) {
        // Remove existing error messages
        const existingError = document.querySelector('.error');
        if (existingError) {
            existingError.remove();
        }

        // Create and show new error message
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error';
        errorDiv.textContent = message;
        
        const container = document.querySelector('.container');
        container.appendChild(errorDiv);

        // Remove error after 5 seconds
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.remove();
            }
        }, 5000);
    }
}

// Initialize the detector when page loads
document.addEventListener('DOMContentLoaded', () => {
    new YOLODetector();
});