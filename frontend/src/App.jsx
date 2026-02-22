import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './Login';
import Dashboard from './Dashboard';
import Register from './Register';
import EmployeeHub from './EmployeeHub';
import Chat from './Chat';
import GamesHub from './GamesHub';
import DiceRoller from './DiceRoller';
import CampaignManager from './CampaignManager';
import CharacterSheet from './CharacterSheet';
import GameSession from './GameSession';
import Profile from './Profile';
import Settings from './Settings';
import Home from './Home';
import ChessGame from './ChessGame';
import Inbox from './Inbox';
import './index.css';

function PrivateRoute({ children }) {
  const token = localStorage.getItem('hrToken');
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
        <Route path="/inbox" element={<PrivateRoute><Inbox /></PrivateRoute>} />
        <Route path="/games" element={<GamesHub />} />
        <Route path="/games/dice" element={<DiceRoller />} />
        <Route path="/games/chess" element={<ChessGame />} />
        <Route path="/games/campaigns" element={<CampaignManager />} />
        <Route path="/games/characters" element={<CharacterSheet />} />
        <Route path="/games/characters/new" element={<CharacterSheet />} />
        <Route path="/games/characters/:id" element={<CharacterSheet />} />
        <Route path="/games/session/:id" element={<GameSession />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/profile/:id" element={<Profile />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
