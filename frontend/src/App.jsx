import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './Login';
import Dashboard from './Dashboard';
import Register from './Register';
import EmployeeHub from './EmployeeHub';
import Chat from './Chat';
import Profile from './Profile';
import Settings from './Settings';
import Home from './Home';
import Inbox from './Inbox';
import ReceiptsOS from './ReceiptsOS';
import InvoiceCalculator from './InvoiceCalculator';
import './index.css';

function PrivateRoute({ children }) {
  const token = localStorage.getItem('hrToken') || localStorage.getItem('token');
  return token ? children : <Navigate to="/login" />;
}

function App() {
  const [motd, setMotd] = useState('');

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/motd`)
      .then(res => res.json())
      .then(data => setMotd(data.message))
      .catch(err => console.error(err));
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home motd={motd} />} />
        <Route path="/login" element={<Login motd={motd} />} />
        <Route path="/register" element={<PrivateRoute><Register /></PrivateRoute>} />
        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/employee-hub" element={<EmployeeHub />} />
        <Route path="/receipts" element={<PrivateRoute><ReceiptsOS /></PrivateRoute>} />
        <Route path="/calculator" element={<PrivateRoute><InvoiceCalculator /></PrivateRoute>} />
        <Route path="/inbox" element={<PrivateRoute><Inbox /></PrivateRoute>} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/profile/:id" element={<Profile />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
