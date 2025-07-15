import React, { useState, useEffect } from 'react';
import './App.css';

export default function HistoryPage({
  wallet,
  authorized,
  connectWallet,
  authorizeWallet
}) {
  const [history, setHistory] = useState([]);

  
  useEffect(() => {
    if (!wallet ) return;
    fetch(`${process.env.REACT_APP_API_URL}/api/transactions/${wallet}`)
      .then(r => r.json())
      .then(setHistory)
      .catch(console.error);
  }, [wallet, authorized]);


  if (!wallet) {
    return (
      <div className="container">
        <p>Please connect your Phantom wallet to view history.</p>
        <button className="connect-button" onClick={connectWallet}>
          Connect Wallet
        </button>
      </div>
    );
  }

  // Prompt to authorize signature if connected but not authorized
//   if (!authorized) {
//     return (
//       <div className="container">
//         <p>Please authorize to view history.</p>
//         <button className="connect-button" onClick={authorizeWallet}>
//           Authorize
//         </button>
//       </div>
//     );
//   }

 
  return (
    <div className="history-container">
      <h3>Transaction History for {wallet.slice(0, 6)}…</h3>
      {history.length > 0 ? (
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Amount (Ξ)</th>
              <th>Files</th>
              <th>Tx</th>
            </tr>
          </thead>
          <tbody>
            {history.map(h => (
              <tr key={h._id}>
                <td>{new Date(h.date).toLocaleString()}</td>
                <td>{(h.amountPaid / 1e9).toFixed(6)}</td>
                <td>
                  <ul className="file-list">
                    {h.files.map(f => (
                      <li key={f.cid}>
                        <strong>{f.name}</strong> ({(f.size / 1024).toFixed(2)} KB)<br />
                        <a
                          href={`https://storacha.link/ipfs/${f.cid}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="cid-link"
                        >
                          https://storacha.link/ipfs/{f.cid}
                        </a>
                      </li>
                    ))}
                  </ul>
                </td>
                <td>
                  <a
                    href={`https://explorer.solana.com/tx/${h.txSignature}?cluster=devnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {h.txSignature.slice(0, 6)}…
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>No transactions found.</p>
      )}
    </div>
  );
}