import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import './index.css';

function EmployeeHub() {
    const [user, setUser] = useState(null);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [users, setUsers] = useState([]); // Quick contacts
    const [punches, setPunches] = useState([]);
    const [showBreakPrompt, setShowBreakPrompt] = useState(false);
    const [unreadMails, setUnreadMails] = useState(0);
    const [socketAlert, setSocketAlert] = useState(null);
    const navigate = useNavigate();

    const handleLogout = async () => {
        const token = localStorage.getItem('hrToken') || localStorage.getItem('token');
        if (token) {
            try {
                await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/auth/logout`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
            } catch (err) { console.error("Logout dispatch failed", err); }
        }
        localStorage.clear();
        navigate('/');
    };

    // A simple synthesized double beep using Web Audio API
    const playBreakAudio = () => {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();

            osc.connect(gainNode);
            gainNode.connect(ctx.destination);

            osc.type = 'sine';
            osc.frequency.setValueAtTime(800, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(1000, ctx.currentTime + 0.1);

            gainNode.gain.setValueAtTime(0, ctx.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.1);
            gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.5);

            setTimeout(() => {
                const osc2 = ctx.createOscillator();
                const gainNode2 = ctx.createGain();
                osc2.connect(gainNode2);
                gainNode2.connect(ctx.destination);
                osc2.type = 'sine';
                osc2.frequency.setValueAtTime(1000, ctx.currentTime);
                osc2.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
                gainNode2.gain.setValueAtTime(0, ctx.currentTime);
                gainNode2.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.1);
                gainNode2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
                osc2.start(ctx.currentTime);
                osc2.stop(ctx.currentTime + 0.5);
            }, 500);

        } catch (e) { console.error("Audio playback failed", e); }
    };

    useEffect(() => {
        const storedId = localStorage.getItem('employeeId');
        if (!storedId) { navigate('/'); return; }

        const authFetch = (url, options = {}) => {
            const token = localStorage.getItem('hrToken') || localStorage.getItem('token');
            const headers = { ...options.headers };
            if (token) headers['Authorization'] = `Bearer ${token}`;
            return fetch(url, { ...options, headers });
        };

        const fetchUser = async () => {
            try {
                const res = await authFetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/users/${storedId}`);
                if (res.ok) {
                    setUser(await res.json());
                } else {
                    const errData = await res.json();
                    setUser({ error: true, text: `Server returned ${res.status}: ${errData.error || 'Unknown'}` });
                }
            } catch (err) {
                console.error(err);
                setUser({ error: true, text: `Fetch failed: ${err.message}` });
            }
        };

        const fetchContacts = async () => {
            try {
                const res = await authFetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/users`);
                if (res.ok) {
                    const data = await res.json();
                    // Random 4 contacts excluding self
                    const others = data.filter(u => u.id !== storedId);
                    setUsers(others.slice(0, 4));
                }
            } catch (err) { }
        };

        const fetchTodayPunches = async () => {
            try {
                const res = await authFetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/clock/today/${storedId}`);
                if (res.ok) setPunches(await res.json());
            } catch (err) { }
        };

        const fetchMails = async () => {
            const token = localStorage.getItem('hrToken') || localStorage.getItem('token');
            if (!token) return;
            try {
                const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/mails/${storedId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setUnreadMails(data.filter(m => !m.is_read).length);
                }
            } catch (e) { }
        };

        fetchUser();
        fetchContacts();
        fetchTodayPunches();
        fetchMails();

        // WebSocket Setup
        const wsToken = localStorage.getItem('hrToken') || localStorage.getItem('token');
        const newSocket = io(import.meta.env.VITE_API_URL || 'http://localhost:3001', {
            auth: { token: wsToken }
        });
        newSocket.on('connect', () => {
            newSocket.emit('register_user', storedId);
        });

        newSocket.on('auto_break_started', (data) => {
            setSocketAlert(data.message);
            playBreakAudio();
            fetchTodayPunches(); // Refresh to see the new BREAK_START

            // Auto dismiss alert after 10s
            setTimeout(() => setSocketAlert(null), 10000);
        });

        newSocket.on('break_over_alert', (data) => {
            setSocketAlert(data.message);
            playBreakAudio();

            // Auto dismiss alert after 15s
            setTimeout(() => setSocketAlert(null), 15000);
        });

        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => {
            clearInterval(timer);
            newSocket.disconnect();
        };
    }, [navigate]);

    useEffect(() => {
        if (!punches.length || !currentTime) return;

        const sorted = [...punches].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        const lastPunch = sorted[sorted.length - 1];

        if (lastPunch && (lastPunch.type === 'IN' || lastPunch.type === 'BREAK_END')) {
            const lastActiveTime = new Date(lastPunch.timestamp);
            const diffMs = currentTime - lastActiveTime;
            const diffHours = diffMs / (1000 * 60 * 60);

            // If working for over 1 hour consecutively, show prompt
            if (diffHours >= 1 && diffHours < 14) {
                if (!showBreakPrompt) {
                    setShowBreakPrompt(true);
                    // Play alert only when transitioning to true
                    playBreakAudio();
                }
            } else {
                setShowBreakPrompt(false);
            }
        } else {
            setShowBreakPrompt(false);
        }
    }, [punches, currentTime]);

    const handleClock = async (type) => {
        setLoading(true);
        setMessage(null);
        const token = localStorage.getItem('hrToken') || localStorage.getItem('token');
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/clock`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ type }),
            });
            const data = await response.json();
            setMessage({ type: response.ok ? 'success' : 'error', text: response.ok ? data.message : data.error });
            if (response.ok && user) {
                const pRes = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/clock/today/${user.id}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (pRes.ok) setPunches(await pRes.json());
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Falha na conexão.' });
        } finally {
            setLoading(false);
        }
    };

    if (!user) return <div className="app-container">Carregando...</div>;
    if (user.error) return <div className="app-container" style={{ color: 'red' }}><b>Erro ao carregar usuário:</b> {user.text}<br /><button className="btn" onClick={handleLogout}>Voltar ao Login</button></div>;

    return (
        <div className="app-container" style={{ alignItems: 'flex-start', paddingTop: '2rem' }}>
            {socketAlert && (
                <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 9999, background: '#fca311', color: '#000', padding: '15px 20px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', gap: '10px', maxWidth: '300px' }}>
                    <span style={{ fontSize: '1.5rem' }}>⏰</span>
                    <div>
                        <strong>Aviso de Sistema</strong><br />
                        <span style={{ fontSize: '0.9rem' }}>{socketAlert}</span>
                    </div>
                </div>
            )}
            <div style={{ width: '100%', maxWidth: '1000px', display: 'flex', flexDirection: 'column', gap: '2rem' }}>

                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h1 style={{ margin: 0, fontSize: '2.5rem', fontWeight: '800' }}>
                        Bem-vindo(a) de volta,<br />
                        <span style={{ color: '#bb86fc' }}>{user.name}</span>
                    </h1>
                    <button onClick={handleLogout} className="btn" style={{ background: '#333' }}>Sair</button>
                </div>

                {/* Main Grid */}
                <div className="hub-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>

                    {/* Time & Clock Card */}
                    <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <div>
                            <h3 style={{ marginTop: 0, color: '#aaa' }}>Tempo & Conectividade</h3>
                            <div style={{ fontSize: '3rem', fontWeight: 'bold', fontFamily: 'monospace' }}>
                                {currentTime.toLocaleTimeString('pt-BR')}
                            </div>
                            <div style={{ color: '#888', marginBottom: '1.5rem' }}>
                                {currentTime.toLocaleDateString('pt-BR', { weekday: 'long', month: 'long', day: 'numeric' })}
                            </div>
                        </div>

                        <div className="button-group-vertical" style={{ display: 'grid', gap: '0.5rem', gridTemplateColumns: '1fr 1fr' }}>
                            <button disabled={loading} onClick={() => handleClock('IN')} className="btn btn-in" style={{ padding: '20px' }}>ENTRADA</button>
                            <button disabled={loading} onClick={() => handleClock('OUT')} className="btn btn-out" style={{ padding: '20px' }}>SAÍDA</button>
                            <button disabled={loading} onClick={() => handleClock('BREAK_START')} className="btn btn-break-start">Iniciar Pausa</button>
                            <button disabled={loading} onClick={() => handleClock('BREAK_END')} className="btn btn-break-end">Fim da Pausa</button>
                        </div>
                        {message && <div className={`message ${message.type}`} style={{ marginTop: '1rem' }}>{message.text}</div>}

                        {showBreakPrompt && (
                            <div style={{ marginTop: '1rem', background: 'rgba(252, 163, 17, 0.15)', border: '1px solid #fca311', padding: '1rem', borderRadius: '8px', color: '#fca311', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <strong>☕ Hora de uma pausa!</strong>
                                <span style={{ fontSize: '0.9rem' }}>Você está trabalhando continuamente há mais de uma hora. Considere fazer uma pausa de 30 minutos.</span>
                                <button onClick={() => handleClock('BREAK_START')} className="btn" style={{ background: '#fca311', color: '#000', padding: '8px' }}>Iniciar Pausa de 30min Agora</button>
                            </div>
                        )}
                    </div>

                    {/* Social Zone */}
                    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'linear-gradient(135deg, #2b2b2b, #1e1e1e)' }}>
                        <h3 className="title" style={{ fontSize: '1.4rem' }}>🎉 Área de Trabalho</h3>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <button className="btn" onClick={() => navigate('/chat')} style={{ background: '#3b82f6', color: '#fff', flex: 1 }}>💬 Chat</button>
                            {['Vendors', 'Selling manager', 'Selling & merchandise representative', 'Merchandising', 'HR', 'HRAssistant'].includes(user?.role) && (
                                <>
                                    <button className="btn" onClick={() => navigate('/receipts')} style={{ background: '#2563eb', color: '#fff', flex: 1 }}>🧾 Recibos</button>
                                    <button className="btn" onClick={() => navigate('/calculator')} style={{ background: '#059669', color: '#fff', flex: 1 }}>🧮 Calculadora</button>
                                </>
                            )}
                            <button className="btn" onClick={() => navigate('/inbox')} style={{ background: '#1d4ed8', color: '#fff', flex: 1, position: 'relative' }}>
                                📫 Caixa de Entrada
                                {unreadMails > 0 && (
                                    <span style={{ position: 'absolute', top: '-8px', right: '-8px', background: '#ff4444', color: '#fff', fontSize: '0.8rem', padding: '2px 6px', borderRadius: '50%', fontWeight: 'bold' }}>
                                        {unreadMails}
                                    </span>
                                )}
                            </button>
                        </div>

                        {['HR', 'HRAssistant'].includes(user?.role) && (
                            <button className="btn" onClick={() => navigate('/dashboard')} style={{ background: '#ff4444', color: '#fff', border: '1px solid #772222' }}>🏢 Acessar Centro de Comando RH</button>
                        )}

                        <div style={{ borderTop: '1px solid #333', margin: '1rem 0' }}></div>

                        <button className="btn" onClick={() => navigate('/profile')} style={{ background: '#333', border: '1px solid #555' }}>👤 Meu Perfil</button>
                        <button className="btn" onClick={() => navigate('/settings')} style={{ background: 'transparent', border: '1px solid #555' }}>⚙️ Configurações</button>
                    </div>
                </div>

                {/* Quick Contacts */}
                <div style={{ marginTop: '2rem' }}>
                    <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#888' }}>ACESSO RÁPIDO À EQUIPE</h4>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {users.map(u => (
                            <div key={u.id} title={u.name} style={{ width: '40px', height: '40px', background: '#555', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', cursor: 'pointer' }} onClick={() => navigate('/chat')}>
                                {u.name.charAt(0).toUpperCase()}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default EmployeeHub;
