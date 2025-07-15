import React, { useState } from 'react';
import './App.css';
import { PublicKey, SystemProgram, Transaction } from '@solana/web3.js';

const RATE_PER_BYTE = 10;
const API_URL       = process.env.REACT_APP_API_URL || 'http://localhost:4000';
const ESCROW_PUBKEY = process.env.REACT_APP_ESCROW_PUBKEY;

export default function UploadPage({ wallet, authorized, connection }) {
  const [files, setFiles]             = useState([]);
  const [uploading, setUploading]     = useState(false);
  const [paymentStatus, setPaymentStatus] = useState('idle'); // idle|pending|success|failure
  const [paymentDetails, setPaymentDetails] = useState(null);
  const [errorMessage, setErrorMessage]     = useState('');

  // Choose files (only if wallet is authorized)
  const handleFiles = e => {
    if (!authorized) return;
    const chosen = Array.from(e.target.files).map(f => ({
      name: f.name,
      size: f.size,
      dataPromise: new Promise((res, rej) => {
        const r = new FileReader();
        r.onload  = () => res(r.result.split(',')[1]);
        r.onerror = rej;
        r.readAsDataURL(f);
      })
    }));
    setFiles(chosen);
  };

  // Pay on Solana, then upload via your backend
  const handleAccept = async () => {
    setPaymentStatus('pending');
    setErrorMessage('');

    if (!wallet) { 
      setPaymentStatus('failure');
      setErrorMessage('Wallet not connected');
      return;
    }

    // Compute cost
    const totalSize = files.reduce((sum, f) => sum + f.size, 0);
    const cost      = totalSize * RATE_PER_BYTE;

    // Build transfer transaction
    const txn = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: new PublicKey(wallet),
        toPubkey:   new PublicKey(ESCROW_PUBKEY),
        lamports:   cost
      })
    );
    txn.feePayer = new PublicKey(wallet);
    const { blockhash } = await connection.getRecentBlockhash();
    txn.recentBlockhash = blockhash;

    try {
      // Sign & send
      const signed = await window.solana.signTransaction(txn);
      const sig    = await connection.sendRawTransaction(signed.serialize());
      await connection.confirmTransaction(sig, 'finalized');
      const timestamp = new Date().toISOString();

      // Prepare payloads
      setUploading(true);
      const filePayloads = await Promise.all(files.map(async f => ({
        name: f.name,
        size: f.size,
        data: await f.dataPromise
      })));

      // Call your API
      const resp = await fetch(`${API_URL}/api/purchase-upload`, {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({ walletAddress: wallet, txSignature: sig, files: filePayloads })
      });
      if (!resp.ok) throw new Error('Upload failed');
      const { uploaded } = await resp.json();

      // Show success details
      setPaymentDetails({
        amount: cost,
        txSignature: sig,
        time: timestamp,
        files: uploaded    // [{ name, cid, size }]
      });
      setPaymentStatus('success');
      setFiles([]);
    } catch (err) {
      setPaymentStatus('failure');
      setErrorMessage(err.message || 'Error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="container">
      {!files.length ? (
        <label className={`dropzone ${!authorized ? 'disabled' : ''}`}>
          {authorized
            ? <input type="file" multiple style={{ display:'none' }} onChange={handleFiles} />
            : null
          }
          {authorized
            ? (uploading ? 'Uploading…' : 'Click to select files')
            : 'Authorize wallet to select files'}
        </label>
      ) : (
        <>
          <div className="file-info">
            <div><strong>Files:</strong> {files.length}</div>
            <div><strong>Total Size:</strong> {(files.reduce((s,f)=>s+f.size,0)/1024).toFixed(2)} KB</div>
            <div><strong>Price:</strong> Ξ {(files.reduce((s,f)=>s+f.size,0)*RATE_PER_BYTE/1e9).toFixed(6)}</div>
          </div>
          <button className="button" onClick={handleAccept} disabled={uploading || paymentStatus==='pending'}>
            {paymentStatus==='pending' ? 'Processing…' : 'Accept & Upload'}
          </button>
          <button className="button reject-button" onClick={()=>setFiles([])} disabled={uploading || paymentStatus==='pending'}>
            Reject Deal
          </button>
        </>
      )}

      {paymentStatus==='success' && paymentDetails && (
        <div className="payment-details">
          <h4>Success!</h4>
          <p><strong>Paid:</strong> Ξ {(paymentDetails.amount/1e9).toFixed(6)}</p>
          <p><strong>Tx:</strong> {paymentDetails.txSignature}</p>
          <p><strong>Time:</strong> {new Date(paymentDetails.time).toLocaleString()}</p>
          <ul>
            {paymentDetails.files.map(f=>(
              <li key={f.cid}>{f.name} — {(f.size/1024).toFixed(2)} KB — CID: {f.cid}</li>
            ))}
          </ul>
        </div>
      )}
      {paymentStatus==='failure' && (
        <div className="payment-error">
          <p><strong>Error:</strong> {errorMessage}</p>
          <button className="button" onClick={()=>setPaymentStatus('idle')}>
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}