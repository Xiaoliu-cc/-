class MediaCompressor {
    constructor() {
        this.files = new Map(); // 存储文件信息
        this.compressedFiles = new Map(); // 存储压缩后的文件
        
        // 获取DOM元素
        this.fileInput = document.getElementById('fileInput');
        this.uploadArea = document.getElementById('uploadArea');
        this.compressionRate = document.getElementById('compressionRate');
        this.compressionRateValue = document.getElementById('compressionRateValue');
        this.compressAllBtn = document.getElementById('compressAllBtn');
        this.downloadAllBtn = document.getElementById('downloadAllBtn');
        
        this.initEventListeners();
    }
    
    initEventListeners() {
        // 上传区域点击事件
        this.uploadArea.onclick = () => this.fileInput.click();
        
        // 文件选择事件
        this.fileInput.onchange = (e) => this.handleFileSelect(e);
        
        // 拖拽事件
        this.uploadArea.ondragover = (e) => {
            e.preventDefault();
            this.uploadArea.style.borderColor = '#0071e3';
        };
        
        this.uploadArea.ondragleave = () => {
            this.uploadArea.style.borderColor = '#d2d2d7';
        };
        
        this.uploadArea.ondrop = (e) => {
            e.preventDefault();
            this.uploadArea.style.borderColor = '#d2d2d7';
            this.handleFileSelect({ target: { files: e.dataTransfer.files } });
        };
        
        // 压缩率变化事件
        this.compressionRate.oninput = () => {
            this.compressionRateValue.textContent = this.compressionRate.value;
        };
        
        // 批量压缩按钮事件
        this.compressAllBtn.onclick = () => this.compressAll();
        
        // 批量下载按钮事件
        this.downloadAllBtn.onclick = () => this.downloadAllCompressedFiles();
    }
    
    handleFileSelect(event) {
        const files = Array.from(event.target.files);
        
        files.forEach(file => {
            // 检查文件类型
            if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
                alert('请上传图片或视频文件');
                return;
            }
            
            const fileId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
            this.files.set(fileId, {
                file,
                status: 'pending',
                progress: 0
            });
            
            this.addFileToList(fileId, file);
        });
        
        this.fileInput.value = '';
    }
    
    async compressFile(file, fileId) {
        try {
            if (file.type.startsWith('image/')) {
                await this.compressImage(file, fileId, this.compressionRate.value / 100);
            } else if (file.type.startsWith('video/')) {
                await this.compressVideo(file, fileId, this.compressionRate.value / 100);
            }
        } catch (error) {
            console.error('压缩失败:', error);
            this.updateFileStatus(fileId, 'error');
        }
    }
    
    async compressImage(file, fileId, quality) {
        try {
            this.updateFileStatus(fileId, 'processing', 0);
            
            const img = new Image();
            img.src = URL.createObjectURL(file);
            
            await new Promise(resolve => {
                img.onload = resolve;
            });
            
            this.updateFileStatus(fileId, 'processing', 50);
            
            const canvas = document.createElement('canvas');
            const scale = 0.5 + (quality * 0.5);
            canvas.width = img.width * scale;
            canvas.height = img.height * scale;
            
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            
            const jpegQuality = 0.3 + (quality * 0.5);
            const compressedDataUrl = canvas.toDataURL('image/jpeg', jpegQuality);
            
            this.updateFileStatus(fileId, 'processing', 75);
            
            const response = await fetch(compressedDataUrl);
            const blob = await response.blob();
            
            this.compressedFiles.set(file.name, {
                blob,
                originalName: file.name
            });
            
            URL.revokeObjectURL(img.src);
            
            this.updateFileStatus(fileId, 'done', 100);
            this.downloadAllBtn.disabled = false;
            
            // 更新文件大小显示
            const fileItem = document.getElementById(`file-${fileId}`);
            const compressedSize = fileItem.querySelector('.compressed-size');
            compressedSize.textContent = this.formatFileSize(blob.size);
            
        } catch (error) {
            console.error('压缩失败:', error);
            this.updateFileStatus(fileId, 'error');
        }
    }
    
    async compressVideo(file, fileId, quality) {
        // 视频压缩需要使用特定的库或服务
        console.log('视频压缩功能待实现');
        this.updateFileStatus(fileId, 'error');
    }
    
    async compressAll() {
        const pendingFiles = Array.from(this.files.entries())
            .filter(([_, fileData]) => fileData.status === 'pending' || fileData.status === 'error');
        
        this.compressAllBtn.disabled = true;
        this.compressAllBtn.textContent = '压缩中...';
        
        for (const [fileId, fileData] of pendingFiles) {
            await this.compressFile(fileData.file, fileId);
        }
        
        this.compressAllBtn.disabled = false;
        this.compressAllBtn.textContent = '压缩全部';
    }
    
    async downloadAllCompressedFiles() {
        if (this.compressedFiles.size === 0) return;
        
        const zip = new JSZip();
        
        this.compressedFiles.forEach((file, originalName) => {
            zip.file(`compressed_${originalName}`, file.blob);
        });
        
        const zipBlob = await zip.generateAsync({type: 'blob'});
        const a = document.createElement('a');
        a.href = URL.createObjectURL(zipBlob);
        a.download = 'compressed_files.zip';
        a.click();
        URL.revokeObjectURL(a.href);
    }
    
    addFileToList(fileId, file) {
        const fileList = document.getElementById('fileList');
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.id = `file-${fileId}`;
        
        // 创建缩略图
        const thumbnailContainer = document.createElement('div');
        thumbnailContainer.className = 'thumbnail-container';
        
        const thumbnail = document.createElement('img');
        thumbnail.className = 'thumbnail';
        
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                thumbnail.src = e.target.result;
            };
            reader.readAsDataURL(file);
        } else if (file.type.startsWith('video/')) {
            const video = document.createElement('video');
            video.src = URL.createObjectURL(file);
            video.onloadeddata = () => {
                video.currentTime = 1;
                const canvas = document.createElement('canvas');
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                thumbnail.src = canvas.toDataURL();
                URL.revokeObjectURL(video.src);
            };
        }
        
        thumbnailContainer.appendChild(thumbnail);
        
        // 创建文件信息
        const fileInfo = document.createElement('div');
        fileInfo.className = 'file-info';
        
        const fileName = document.createElement('div');
        fileName.className = 'file-name';
        fileName.textContent = file.name;
        
        const fileMeta = document.createElement('div');
        fileMeta.className = 'file-meta';
        
        const originalSize = document.createElement('span');
        originalSize.textContent = `原始大小：${this.formatFileSize(file.size)}`;
        
        const compressedSize = document.createElement('span');
        compressedSize.className = 'compressed-size';
        compressedSize.textContent = '压缩后：-';
        
        const fileStatus = document.createElement('span');
        fileStatus.className = 'file-status';
        fileStatus.textContent = '待处理';
        
        fileMeta.appendChild(originalSize);
        fileMeta.appendChild(compressedSize);
        fileMeta.appendChild(fileStatus);
        
        fileInfo.appendChild(fileName);
        fileInfo.appendChild(fileMeta);
        
        // 创建进度条
        const progressBar = document.createElement('div');
        progressBar.className = 'progress-bar';
        
        const progressInner = document.createElement('div');
        progressInner.className = 'progress-inner';
        progressBar.appendChild(progressInner);
        
        fileInfo.appendChild(progressBar);
        
        // 创建删除按钮
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-btn';
        removeBtn.textContent = '删除';
        removeBtn.onclick = () => {
            fileItem.remove();
            this.files.delete(fileId);
            if (this.compressedFiles.has(file.name)) {
                this.compressedFiles.delete(file.name);
            }
            if (this.compressedFiles.size === 0) {
                this.downloadAllBtn.disabled = true;
            }
        };
        
        fileItem.appendChild(thumbnailContainer);
        fileItem.appendChild(fileInfo);
        fileItem.appendChild(removeBtn);
        fileList.appendChild(fileItem);
    }
    
    updateFileStatus(fileId, status, progress = 0) {
        const fileItem = document.getElementById(`file-${fileId}`);
        if (!fileItem) return;
        
        const statusMap = {
            pending: '待处理',
            processing: '处理中',
            done: '已完成',
            error: '失败'
        };
        
        const fileStatus = fileItem.querySelector('.file-status');
        fileStatus.textContent = statusMap[status];
        
        const progressInner = fileItem.querySelector('.progress-inner');
        progressInner.style.width = `${progress}%`;
    }
    
    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

// 初始化应用
window.onload = () => {
    new MediaCompressor();
}; 