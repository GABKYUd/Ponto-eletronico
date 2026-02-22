import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './index.css';

function Home({ motd }) {
    const [employeeId, setEmployeeId] = useState('');
    const [password, setPassword] = useState('');
    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        if (localStorage.getItem('employeeId')) {
            navigate('/employee-hub');
        }
    }, [navigate]);

    const handleEmployeeLogin = async () => {
        setError('');
        const body = { id: employeeId };
        if (password !== undefined) body.password = password;
        else if (code !== undefined) body.code = code;
        else return;

        if (!employeeId.trim() || (!body.password && !body.code)) {
            setError('ID and Credentials are required.');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            const data = await res.json();

            if (res.ok) {
                localStorage.setItem('employeeId', data.userId);
                localStorage.setItem('token', data.token);
                localStorage.setItem('userId', data.userId);
                localStorage.setItem('role', data.role);
                if (data.role === 'HR') {
                    localStorage.setItem('hrToken', data.token);
                }
                navigate('/employee-hub');
            } else {
                setError(data.error || 'Login failed');
            }
        } catch (err) {
            setError('Connection failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="home-wrapper" style={{
            display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh',
            background: 'linear-gradient(135deg, #121212 0%, #1e1e2f 100%)',
            position: 'relative', overflow: 'hidden'
        }}>
            {/* Decorative Orbs */}
            <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(187,134,252,0.15) 0%, rgba(0,0,0,0) 70%)', filter: 'blur(50px)' }}></div>
            <div style={{ position: 'absolute', bottom: '-20%', right: '-10%', width: '600px', height: '600px', background: 'radial-gradient(circle, rgba(3,218,198,0.1) 0%, rgba(0,0,0,0) 70%)', filter: 'blur(60px)' }}></div>

            <div className="glass-login-card" style={{
                background: 'rgba(30, 30, 30, 0.4)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                padding: '3rem',
                borderRadius: '24px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                width: '100%',
                maxWidth: '450px',
                zIndex: 10,
                textAlign: 'center',
                color: 'white'
            }}>

                <div style={{ marginBottom: '2rem' }}>
                    <h1 style={{
                        fontSize: '2.5rem', margin: '0 0 0.5rem 0', fontWeight: '800',
                        background: 'linear-gradient(to right, #bb86fc, #03dac6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                        letterSpacing: '-1px'
                    }}>Welcome to KYU INC</h1>
                </div>

                {motd && (
                    <div style={{
                        marginBottom: '2rem', fontStyle: 'italic', color: '#e0e0e0', fontSize: '0.95rem',
                        padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '12px',
                        borderLeft: '4px solid #bb86fc'
                    }}>
                        "{motd}"
                    </div>
                )}

                <div className="toggle-container" style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div
                        className={`toggle-option ${password !== undefined ? 'active' : ''}`}
                        onClick={() => setPassword('')}
                        style={password !== undefined ? { background: 'linear-gradient(135deg, #bb86fc, #9965f4)', color: '#fff', boxShadow: '0 4px 15px rgba(187,134,252,0.3)' } : {}}
                    >
                        🔑 Password
                    </div>
                    <div
                        className={`toggle-option ${password === undefined ? 'active' : ''}`}
                        onClick={() => setPassword(undefined)}
                        style={password === undefined ? { background: 'linear-gradient(135deg, #03dac6, #01bca7)', color: '#000', boxShadow: '0 4px 15px rgba(3,218,198,0.3)' } : {}}
                    >
                        🛡️ Authenticator
                    </div>
                </div>

                <div className="input-group" style={{ marginBottom: '1rem' }}>
                    <input
                        type="text"
                        placeholder="Employee ID"
                        className="input-field"
                        value={employeeId}
                        onChange={(e) => setEmployeeId(e.target.value)}
                        disabled={loading}
                        style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)' }}
                    />
                </div>

                <div className="input-group" style={{ marginBottom: '1.5rem' }}>
                    {password !== undefined ? (
                        <input
                            type="password"
                            placeholder="Password"
                            className="input-field"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={loading}
                            style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)' }}
                        />
                    ) : (
                        <input
                            type="password"
                            placeholder="000000"
                            maxLength="6"
                            className="input-field"
                            style={{ letterSpacing: '6px', textAlign: 'center', fontSize: '1.5rem', fontWeight: 'bold', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)' }}
                            value={code || ''}
                            onChange={(e) => setCode(e.target.value)}
                            disabled={loading}
                        />
                    )}
                </div>

                <button onClick={handleEmployeeLogin} disabled={loading} className="btn" style={{
                    width: '100%', padding: '16px', fontSize: '1.1rem',
                    background: 'linear-gradient(135deg, #bb86fc, #6200ea)',
                    boxShadow: '0 4px 15px rgba(98,0,234,0.4)',
                    transition: 'all 0.3s ease'
                }}>
                    {loading ? 'Authenticating...' : 'Enter Workspace'}
                </button>

                {error && (
                    <div className="message error" style={{ background: 'rgba(207,102,121,0.15)', backdropFilter: 'blur(5px)' }}>
                        ⚠️ {error}
                    </div>
                )}

                <div style={{ marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                    <button onClick={() => navigate('/login')} className="btn" style={{ background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}>
                        HR Dashboard Login
                    </button>
                </div>
            </div>
        </div>
    );
}

export default Home;
