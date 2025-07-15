import React, { useState, useEffect } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import UploadPage from './UploadPage';
import HistoryPage from './HistoryPage';
import { Connection } from '@solana/web3.js';
import './App.css';

const RPC_URL       = process.env.REACT_APP_SOLANA_RPC || 'https://api.devnet.solana.com';

function App() {
  const [wallet, setWallet]         = useState(null);
  const [authorized, setAuthorized] = useState(false);
  const connection = new Connection(RPC_URL);

  useEffect(() => {
    if (window.solana?.isPhantom) {
      const wasAuth = localStorage.getItem('authorized') === 'true';
      window.solana.connect({ onlyIfTrusted: true })
        .then(({ publicKey }) => {
          setWallet(publicKey.toString());
          setAuthorized(wasAuth);
        })
        .catch(() => {});
    }
  }, []);

  const connectWallet = async () => {
    if (!window.solana?.isPhantom) {
      alert('Install Phantom Wallet');
      return;
    }
    try {
      const { publicKey } = await window.solana.connect();
      setWallet(publicKey.toString());
      setAuthorized(false);
      localStorage.removeItem('authorized');
    } catch (err) {
      console.error('Connection failed', err);
    }
  };

  const authorizeWallet = async () => {
    try {
      const msg = new TextEncoder().encode('Authorize Storacha');
      await window.solana.signMessage(msg, 'utf8');
      setAuthorized(true);
      localStorage.setItem('authorized', 'true');
    } catch (err) {
      console.error('Authorization failed', err);
      alert('Authorization failed');
    }
  };

  const disconnectWallet = async () => {
    try { await window.solana.disconnect(); } catch {}
    setWallet(null);
    setAuthorized(false);
    localStorage.removeItem('authorized');
  };

  return (
    <>
    
      <nav className="navbar">
        <Link to="/" className="nav-link">Upload</Link>
        <Link to="/history" className="nav-link">History</Link>
        {!wallet ? (
          <button className="connect-button" onClick={connectWallet}>
            Connect Wallet
          </button>
        ) : !authorized ? (
          <button className="connect-button" onClick={authorizeWallet}>
            Authorize
          </button>
        ) : (
          <button className="connect-button" onClick={disconnectWallet}>
            Disconnect
          </button>
        )}
      </nav>

      <Routes>
        <Route
          path="/"
          element={
            <UploadPage
              wallet={wallet}
              authorized={authorized}
              connection={connection}
            />
          }
        />
        <Route path="/history" element={<HistoryPage wallet={wallet} />} />
      </Routes>
    </>
  );
}

export default App;