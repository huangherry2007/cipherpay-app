import React, { useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { WalletProvider } from './providers/WalletProvider';
import { CipherPayProvider } from './contexts/CipherPayContext';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import Register from './components/Register';
import Transaction from './components/Transaction';
import Proof from './components/Proof';
import Auditor from './components/Auditor';
import { compareCiphertextAndAudit } from './services/accountOverviewService';
import { decryptAuditReceipt } from './lib/e2ee';

function App() {
  // Expose functions to window for debugging and cross-app access
  useEffect(() => {
    // Expose compareCiphertextAndAudit for debugging
    if (typeof window !== 'undefined') {
      window.compareCiphertextAndAudit = compareCiphertextAndAudit;
      window.decryptAuditReceipt = decryptAuditReceipt;
    }
  }, []);

  // Setup session sharing with zkaudit-ui (cross-origin via postMessage)
  useEffect(() => {
    const handler = (event) => {
      // Accept messages from any origin (in dev, both are localhost)
      // In production, you might want to validate event.origin
      if (event.data?.type === 'cipherpay_session_request' && event.data?.source === 'zkaudit-ui') {
        const token = localStorage.getItem('cipherpay_token');
        const userStr = localStorage.getItem('cipherpay_user');
        let user = null;
        try {
          user = userStr ? JSON.parse(userStr) : null;
        } catch (e) {
          // Ignore parse errors
        }

        // Send session back to requesting window
        if (event.source && event.source.postMessage) {
          event.source.postMessage(
            {
              type: 'cipherpay_session_response',
              session: {
                token,
                user,
                timestamp: Date.now(),
              },
            },
            '*' // In production, use event.origin
          );
        }
      }
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  return (
    <WalletProvider>
      <CipherPayProvider>
        <Router>
          <div className="App">
            <Routes>
              <Route path="/" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/transaction" element={<Transaction />} />
              <Route path="/proof" element={<Proof />} />
              <Route path="/auditor" element={<Auditor />} />
            </Routes>
          </div>
        </Router>
      </CipherPayProvider>
    </WalletProvider>
  );
}

export default App; 