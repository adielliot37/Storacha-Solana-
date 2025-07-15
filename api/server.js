
import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';
import mongoose from 'mongoose';
import 'dotenv/config';
import { Connection, PublicKey, SystemProgram, Transaction } from '@solana/web3.js';


const app = express();
const PORT       = process.env.PORT || 4000;
const ORIGIN     = process.env.CLIENT_ORIGIN;           
const MONGO_URI  = process.env.MONGO_URI;               
const ESCROW     = new PublicKey(process.env.ESCROW_PUBKEY);
const RPC_URL    = process.env.SOLANA_RPC;              
const PRICE_PER_BYTE = Number(process.env.PRICE_PER_BYTE);
const MCP_URL    = process.env.MCP_REST_URL;          
const DELEGATION = process.env.DELEGATION;              


mongoose.connect(MONGO_URI).then(() => {
  console.log('✅ MongoDB connected');
}).catch(err => {
  console.error('❌ MongoDB connect error', err);
});


const txSchema = new mongoose.Schema({
  walletAddress: String,
  date:          { type: Date, default: () => new Date() },
  files: [{
    name: String,
    cid:  String,
    size: Number
  }],
  totalFiles:   Number,
  totalSize:    Number,
  amountPaid:   Number,
  txSignature:  String
});
const TxRecord = mongoose.model('TxRecord', txSchema);


app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ limit: '500mb', extended: true }));


app.use(cors({ origin: ORIGIN }));


const connection = new Connection(RPC_URL, 'confirmed');
async function verifyPayment(signature, expectedLamports, walletAddress) {
  const tx = await connection.getParsedTransaction(signature, { commitment: 'finalized' });
  if (!tx || tx.meta?.err) return false;
  // find transfer to ESCROW
  return tx.transaction.message.instructions.some(ix => {
    if (ix.program === 'system' && ix.parsed?.type === 'transfer') {
      return (
        ix.parsed.info.destination === ESCROW.toBase58() &&
        Number(ix.parsed.info.lamports) >= expectedLamports
      );
    }
    return false;
  });
}

app.post('/api/purchase-upload', async (req, res) => {
  try {
    const { walletAddress, txSignature, files } = req.body; 

    const totalSize = files.reduce((sum, f) => sum + f.size, 0);
    const cost      = totalSize * PRICE_PER_BYTE;

   
    const paidOk = await verifyPayment(txSignature, cost, walletAddress);
    if (!paidOk) {
      return res.status(400).json({ error: 'Invalid or insufficient payment' });
    }

  
    const uploaded = [];
    for (const f of files) {
      const rpcBody = {
        jsonrpc: '2.0',
        id:      '1',
        method:  'tools/call',
        params: {
          name: 'upload',
          arguments: {
            file:       f.data,
            name:       f.name,
            delegation: DELEGATION
          }
        }
      };
      const mcpResp = await fetch(MCP_URL, {
        method:  'POST',
        headers: { 'Content-Type':'application/json' },
        body:    JSON.stringify(rpcBody)
      });

      const j = await mcpResp.json();
  
      //console.log('Full MCP JSON response:', JSON.stringify(j, null, 2));
  
      const payload = JSON.parse(j.result.content[0].text);
      const fileCid = payload.root['/'];
      uploaded.push({ name: f.name, cid: fileCid, size: f.size });
    }

    
    await TxRecord.create({
      walletAddress,
      files:       uploaded,
      totalFiles:  uploaded.length,
      totalSize,
      amountPaid:  cost,
      txSignature
    });

    res.json({ uploaded });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/transactions/:walletAddress', async (req, res) => {
  const { walletAddress } = req.params;
  const records = await TxRecord
    .find({ walletAddress })
    .sort({ date: -1 })
    .lean();
  res.json(records);
});

app.listen(PORT, () => {
  console.log(`🔌 API listening on http://localhost:${PORT}`);
});