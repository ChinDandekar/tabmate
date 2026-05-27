import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { scanReceipt } from '../lib/ocr';
import { useSplit } from '../context/SplitContext';

export default function ScanScreen() {
  const navigate = useNavigate();
  const { setSplitState } = useSplit();

  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  const [previewSrc, setPreviewSrc] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressPct, setProgressPct] = useState(0);
  const [progressLabel, setProgressLabel] = useState('Preparing scanner...');

  const handleImageSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Preview selection
    const reader = new FileReader();
    reader.onload = (event) => {
      setPreviewSrc(event.target.result);
    };
    reader.readAsDataURL(file);

    setIsProcessing(true);
    setProgressPct(0);
    setProgressLabel('Analyzing receipt layout...');

    try {
      const result = await scanReceipt(file, (progress) => {
        const percent = Math.round(progress * 100);
        setProgressPct(percent);
        setProgressLabel('Parsing words & prices...');
      });

      setSplitState({
        restaurant: '',
        items: result.items || [],
        people: [],
        taxPercent: result.tax && result.subtotal ? (result.tax / result.subtotal) * 100 : 8.875,
        tipPercent: result.tip && result.subtotal ? (result.tip / result.subtotal) * 100 : 20,
        subtotal: result.subtotal || 0,
        taxAmount: result.tax || 0,
        tipAmount: result.tip || 0,
        total: result.total || 0
      });

      navigate('/items');
    } catch (err) {
      console.error('OCR Parsing Error:', err);
      alert('Could not parse the receipt image automatically. Switching to manual entry mode.');
      setSplitState({
        restaurant: '',
        items: [],
        people: [],
        taxPercent: 8.875,
        tipPercent: 20,
        subtotal: 0,
        taxAmount: 0,
        tipAmount: 0,
        total: 0
      });
      navigate('/items');
    }
  };

  const handleSkip = () => {
    setSplitState({
      restaurant: '',
      items: [],
      people: [],
      taxPercent: 8.875,
      tipPercent: 20,
      subtotal: 0,
      taxAmount: 0,
      tipAmount: 0,
      total: 0
    });
    navigate('/items');
  };

  return (
    <div id="screen-scan" className="screen-container active">
      <h2 className="text-2xl font-normal mb-1 tracking-tight font-serif">Capture receipt</h2>
      <p className="text-sm text-muted-foreground mb-6">Scan your receipt image to pre-populate line items instantly.</p>

      <div className="flex flex-col gap-4">
        {/* Hidden inputs */}
        <input
          type="file"
          accept="image/*"
          capture="environment"
          id="camera-file-input"
          ref={cameraInputRef}
          style={{ display: 'none' }}
          onChange={handleImageSelect}
        />
        <input
          type="file"
          accept="image/*"
          id="gallery-file-input"
          ref={galleryInputRef}
          style={{ display: 'none' }}
          onChange={handleImageSelect}
        />

        <div className="scan-preview-box flex items-center justify-center border border-border">
          {previewSrc ? (
            <img src={previewSrc} alt="Scan Preview" id="scan-preview-img" style={{ display: 'block' }} />
          ) : (
            <div className="text-center text-muted-foreground/40 flex flex-col items-center gap-3" id="camera-placeholder">
              <svg className="w-12 h-12 opacity-30" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
                <circle cx="12" cy="13" r="3"/>
              </svg>
              <p className="text-xs uppercase font-mono tracking-widest">Camera preview box</p>
            </div>
          )}
        </div>

        {isProcessing && (
          <div className="border border-border rounded-xl p-4 bg-card" id="ocr-progress-container">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-semibold" id="ocr-status-label">{progressLabel}</span>
              <span className="text-xs font-mono font-semibold" id="ocr-status-pct">{progressPct}%</span>
            </div>
            <div className="w-full bg-secondary h-1 rounded-full overflow-hidden">
              <div className="scan-progress-bar" id="ocr-progress-fill" style={{ width: `${progressPct}%` }}></div>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <button
            onClick={() => cameraInputRef.current.click()}
            disabled={isProcessing}
            className="w-full bg-primary text-primary-foreground py-35 rounded-xl text-sm font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
            id="scan-snap-photo-btn"
          >
            <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
              <circle cx="12" cy="13" r="3"/>
            </svg>
            Snap Receipt Photo
          </button>

          <button
            onClick={() => galleryInputRef.current.click()}
            disabled={isProcessing}
            className="w-full border border-border py-35 rounded-xl text-sm font-medium hover:bg-muted transition-colors flex items-center justify-center gap-2"
            id="scan-upload-photo-btn"
          >
            <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            Upload from Library
          </button>

          <div className="grid grid-cols-2 gap-3 mt-1">
            <button
              onClick={() => navigate('/home')}
              disabled={isProcessing}
              className="w-full py-25 text-xs text-muted-foreground hover:text-foreground transition-colors"
              id="scan-back-btn"
            >
              Cancel
            </button>
            <button
              onClick={handleSkip}
              disabled={isProcessing}
              className="w-full py-25 text-xs font-semibold text-accent hover:text-accent/80 transition-colors"
              id="scan-skip-btn"
            >
              Manual Entry (Skip)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
