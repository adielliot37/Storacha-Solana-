# Storacha-Solana Pay-Per-Upload

A minimal proof-of-concept system that lets users pay in SOL to upload files to Storacha without needing an account. It uses Solana for payment, verifies the transaction on-chain, and uploads to Storacha storage using the MCP (Model Context Protocol).

**Repository**: [https://github.com/adielliot37/Storacha-Solana-](https://github.com/adielliot37/Storacha-Solana-)

---

## Features

- **Pay-per-upload**: File storage fee is calculated based on file size and paid in SOL.
- **On-chain verification**: Backend verifies the transfer of SOL to an escrow wallet before uploading.
- **Direct upload to Storacha**: Files are uploaded via an MCP server using UCAN delegation.
- **No account or login needed**: Users connect their Phantom wallet, approve the transaction, and upload.
- **Transaction history**: All upload records (file name, size, CID, txSignature) are stored in MongoDB and viewable by wallet.

---

## How it Works

1. **Frontend (React)**
   - User connects Phantom wallet.
   - Total upload cost is computed as `PRICE_PER_BYTE × total file size`.
   - User sends SOL to an escrow address via SystemProgram.transfer.
   - Upload request is sent to backend with txSignature and files.

2. **Backend (Express + MongoDB)**
   - Verifies the transaction on-chain (Solana RPC).
   - Uses the MCP REST API (`tools/call → upload`) to push files to Storacha.
   - Extracts the root CID from the response.
   - Saves a transaction record in MongoDB.
   - Returns uploaded file CIDs to the frontend.

3. **MCP Upload**
   - The backend uses a UCAN `DELEGATION` to authenticate uploads to Storacha via the MCP server.
   - Files are base64-encoded and uploaded via JSON-RPC to `MCP_REST_URL`.

---

## Setup Instructions

### Prerequisites

- Node.js ≥ 16
- MongoDB Atlas URI or local MongoDB instance
- Phantom Wallet on Solana Devnet or Mainnet
- UCAN delegation token from Storacha
- MCP server running and reachable via `MCP_REST_URL`

---

## Backend Setup (`/payment-api`)

### 1. Clone and install

```bash
git clone https://github.com/adielliot37/Storacha-Solana-
cd Storacha-Solana-/payment-api
npm install
```
