import React from 'react';
import { Routes, Route } from 'react-router-dom';
import UploadPage from './UploadPage';
import HistoryPage from './HistoryPage';
import './App.css';

function App() {
  return (
    <Routes>
      <Route path="/" element={<UploadPage />} />
      <Route path="/history" element={<HistoryPage />} />
    </Routes>
  );
}

export default App;