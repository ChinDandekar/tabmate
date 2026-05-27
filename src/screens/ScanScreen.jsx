import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { scanReceipt } from '../lib/ocr';
import { parseReceiptWithGemini } from '../lib/gemini';
import { store } from '../lib/store';
import { useSplit } from '../context/SplitContext';

export default function ScanScreen() {
  const navigate = useNavigate();
  const { setSplitState } = useSplit();

  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  const [inputMode, setInputMode] = useState('photo');
  const [previewSrc, setPreviewSrc] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressPct, setProgressPct] = useState(0);
  const [progressLabel, setProgressLabel] = useState('Preparing scanner...');
  const [receiptText, setReceiptText] = useState('');
  const [pasteError, setPasteError] = useState('');
  const [showSettingsLink, setShowSettingsLink] = useState(false);

  const applyParsedReceipt = (result) => {
    const subtotal = result.subtotal || result.items?.reduce((sum, item) => sum + item.price, 0) || 0;
    const tax = result.tax || 0;
    const tip = result.tip || 0;

    setSplitState({
      restaurant: result.restaurant || result.restaurantName || '',
      items: result.items || [],
      people: [],
      taxPercent: tax && subtotal ? (tax / subtotal) * 100 : 8.875,
      tipPercent: tip && subtotal ? (tip / subtotal) * 100 : 20,
      subtotal,
      taxAmount: tax,
      tipAmount: tip,
      total: result.total || subtotal + tax + tip
    });
  };

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

      applyParsedReceipt(result);
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

  const handleParseText = async () => {
    const text = receiptText.trim();
    if (!text || isProcessing) return;

    setIsProcessing(true);
    setPasteError('');
    setShowSettingsLink(false);
    setProgressLabel('Reading your receipt...');

    try {
      const settings = await store.getSettings();
      if (!settings.geminiApiKey) {
        throw Object.assign(new Error('Add your Gemini API key in Settings.'), { code: 'MISSING_API_KEY' });
      }

      const result = await parseReceiptWithGemini(text, settings.geminiApiKey);
      applyParsedReceipt(result);
      navigate('/items');
    } catch (err) {
      console.error('Gemini Parsing Error:', err);
      if (err.code === 'MISSING_API_KEY') {
        setPasteError('Add your Gemini API key in Settings.');
        setShowSettingsLink(true);
      } else if (err.code === 'NETWORK_ERROR') {
        setPasteError("Couldn't reach Gemini. Check your connection.");
      } else if (err.code === 'BAD_JSON') {
        setPasteError("Receipt couldn't be parsed. Try editing manually.");
      } else {
        setPasteError('Receipt parsing failed. Try again or enter it manually.');
      }
    } finally {
      setIsProcessing(false);
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
      <p className="text-sm text-muted-foreground mb-6">Scan a receipt image or paste digital receipt text to pre-populate line items.</p>

      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-2 rounded-xl bg-secondary p-1">
          <button
            type="button"
            onClick={() => setInputMode('photo')}
            disabled={isProcessing}
            className={`py-25 rounded-lg text-xs font-semibold transition-colors ${inputMode === 'photo' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            aria-pressed={inputMode === 'photo'}
          >
            Photo
          </button>
          <button
            type="button"
            onClick={() => setInputMode('paste')}
            disabled={isProcessing}
            className={`py-25 rounded-lg text-xs font-semibold transition-colors ${inputMode === 'paste' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            aria-pressed={inputMode === 'paste'}
          >
            Paste
          </button>
        </div>

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

        {inputMode === 'photo' ? (
          <>
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
            </div>
          </>
        ) : (
          <div className="border border-border rounded-xl p-4 bg-card" id="ocr-progress-container">
            <div className="flex flex-col gap-3">
              <label htmlFor="pasted-receipt-text" className="text-[10px] uppercase font-mono text-muted-foreground tracking-wider">Receipt text</label>
              <textarea
                id="pasted-receipt-text"
                rows="8"
                placeholder="Paste your receipt text here..."
                className="w-full bg-secondary text-sm px-4 py-3 rounded-md focus:ring-1 focus:ring-accent placeholder:text-muted-foreground/40 resize-none"
                value={receiptText}
                onChange={(e) => {
                  setReceiptText(e.target.value);
                  setPasteError('');
                  setShowSettingsLink(false);
                }}
                disabled={isProcessing}
              />
              {isProcessing && (
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                  <span className="w-35 h-35 rounded-full border border-border border-t-accent animate-spin"></span>
                  {progressLabel}
                </div>
              )}
              {pasteError && (
                <div className="rounded-lg border border-border bg-secondary/50 p-3 text-xs text-muted-foreground leading-relaxed">
                  <p>{pasteError}</p>
                  <div className="flex gap-3 mt-2">
                    {showSettingsLink && (
                      <button
                        type="button"
                        onClick={() => navigate('/settings')}
                        className="font-semibold text-accent hover:text-accent/80 transition-colors"
                      >
                        Open Settings
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleSkip}
                      className="font-semibold text-accent hover:text-accent/80 transition-colors"
                    >
                      Try manually
                    </button>
                  </div>
                </div>
              )}
              <button
                type="button"
                onClick={handleParseText}
                disabled={isProcessing || receiptText.trim().length === 0}
                className="w-full bg-primary text-primary-foreground py-35 rounded-xl text-sm font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                id="scan-parse-receipt-btn"
              >
                Parse Receipt
              </button>
            </div>
          </div>
        )}

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
  );
}
