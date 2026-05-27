import { scanReceipt } from '../ocr.js';

export const scanScreen = {
  init(app) {
    this.app = app;
    this.container = document.getElementById('screen-scan');
    
    this.cameraInput = document.getElementById('camera-file-input');
    this.galleryInput = document.getElementById('gallery-file-input');
    
    this.snapBtn = document.getElementById('scan-snap-photo-btn');
    this.uploadBtn = document.getElementById('scan-upload-photo-btn');
    this.backBtn = document.getElementById('scan-back-btn');
    this.skipBtn = document.getElementById('scan-skip-btn');
    
    this.previewBox = document.getElementById('camera-placeholder');
    this.previewImg = document.getElementById('scan-preview-img');
    
    this.progressContainer = document.getElementById('ocr-progress-container');
    this.progressFill = document.getElementById('ocr-progress-fill');
    this.progressPct = document.getElementById('ocr-status-pct');
    this.progressLabel = document.getElementById('ocr-status-label');

    // Bind triggers
    this.snapBtn.addEventListener('click', () => this.cameraInput.click());
    this.uploadBtn.addEventListener('click', () => this.galleryInput.click());
    
    this.cameraInput.addEventListener('change', (e) => this.handleImageSelect(e));
    this.galleryInput.addEventListener('change', (e) => this.handleImageSelect(e));

    this.backBtn.addEventListener('click', () => {
      this.app.navigate('home');
    });

    this.skipBtn.addEventListener('click', () => {
      // Clear OCR items and skip straight to manual inputs
      this.app.splitState.items = [];
      this.app.splitState.taxPercent = 8.875;
      this.app.splitState.tipPercent = 20;
      this.app.navigate('editItems');
    });
  },

  reset() {
    this.cameraInput.value = '';
    this.galleryInput.value = '';
    this.previewBox.style.display = 'flex';
    this.previewImg.style.display = 'none';
    this.previewImg.src = '';
    this.progressContainer.style.display = 'none';
    this.progressFill.style.style = 'width: 0%;';
    this.progressPct.textContent = '0%';
    this.progressLabel.textContent = 'Preparing scanner...';
    
    this.snapBtn.disabled = false;
    this.uploadBtn.disabled = false;
    this.backBtn.disabled = false;
    this.skipBtn.disabled = false;
  },

  async handleImageSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    // Show image preview
    const reader = new FileReader();
    reader.onload = (event) => {
      this.previewBox.style.display = 'none';
      this.previewImg.src = event.target.result;
      this.previewImg.style.display = 'block';
    };
    reader.readAsDataURL(file);

    // Disable triggers during OCR
    this.snapBtn.disabled = true;
    this.uploadBtn.disabled = true;
    this.backBtn.disabled = true;
    this.skipBtn.disabled = true;

    // Show loader
    this.progressContainer.style.display = 'block';
    this.progressFill.style.width = '0%';
    this.progressPct.textContent = '0%';
    this.progressLabel.textContent = 'Analyzing receipt layout...';

    try {
      // Run Tesseract OCR scan
      const result = await scanReceipt(file, (progress) => {
        const percent = Math.round(progress * 100);
        this.progressFill.style.width = `${percent}%`;
        this.progressPct.textContent = `${percent}%`;
        this.progressLabel.textContent = 'Parsing words & prices...';
      });

      // Load resulting arrays directly to state
      this.app.splitState.items = result.items || [];
      this.app.splitState.taxPercent = result.tax && result.subtotal ? (result.tax / result.subtotal) * 100 : 8.875;
      this.app.splitState.tipPercent = result.tip && result.subtotal ? (result.tip / result.subtotal) * 100 : 20;
      this.app.splitState.restaurant = '';
      
      this.app.navigate('editItems');
    } catch (err) {
      console.error('OCR Parsing Error:', err);
      alert('Could not parse the receipt image automatically. Switching to manual entry mode.');
      
      this.app.splitState.items = [];
      this.app.splitState.taxPercent = 8.875;
      this.app.splitState.tipPercent = 20;
      this.app.navigate('editItems');
    }
  }
};
