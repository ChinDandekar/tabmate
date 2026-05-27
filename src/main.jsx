import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { SplitProvider } from './context/SplitContext';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <SplitProvider>
        <App />
      </SplitProvider>
    </HashRouter>
  </React.StrictMode>
);
