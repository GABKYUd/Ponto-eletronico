import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './index.css';

function Login() {
    const [formData, setFormData] = useState({ id: '', password: '' });
    const [error, setError] = useState('');
    const [motd, setMotd] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/motd`)
            .then(res => res.json())
            .then(data => setMotd(data.message))
            .catch(() => setMotd('Bem-vindo(a) de volta! 🚀'));
    }, []);

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            const data = await response.json();

            if (data.success) {
                // Determine token key based on role compatibility (though we fallback uniformly now)
                if (data.role === 'HR' || data.role === 'HRAssistant' || data.role === 'MasterAdmin' || data.role === 'Infra') {
                    localStorage.setItem('hrToken', data.token);
                } else {
                    localStorage.setItem('token', data.token);
                }
                if (data.refreshToken) {
                    localStorage.setItem('refreshToken', data.refreshToken);
                }
                localStorage.setItem('userId', data.userId);
                localStorage.setItem('employeeId', data.userId); // For compatibility
                localStorage.setItem('role', data.role);
                localStorage.setItem('name', formData.id); // Placeholder Name

                if (data.role === 'HR') {
                    navigate('/dashboard');
                } else {
                    navigate('/employee-hub');
                }
            } else {
                setError(data.error || 'Falha no login');
            }
        } catch (err) {
            setError('Erro de conexão');
        }
    };

    return (
        <div className="app-container">
            <div className="login-card">
                <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                    <img src="/Kyu_Shop.png" alt="Kyu INC Logo" style={{ width: '120px', borderRadius: '8px' }} />
                </div>
                <h1 className="title">Bem-vindo à KYU INC (RH)</h1>

                {motd && (
                    <div style={{ marginBottom: '1.5rem', fontStyle: 'italic', color: '#bb86fc', fontSize: '0.9rem', padding: '0 1rem' }}>
                        "{motd}"
                    </div>
                )}

                <form onSubmit={handleLogin} className="login-form">

                    <div className="toggle-container">
                        <div
                            className={`toggle-option ${!formData.code ? 'active' : ''}`}
                            onClick={() => setFormData({ ...formData, code: '', password: '' })}
                        >
                            🔑 Senha
                        </div>
                        <div
                            className={`toggle-option ${formData.code ? 'active' : ''}`}
                            onClick={() => setFormData({ ...formData, password: undefined, code: '' })}
                        >
                            🛡️ Autenticador
                        </div>
                    </div>

                    <div className="input-group">
                        <input
                            type="text"
                            placeholder="ID do RH"
                            value={formData.id}
                            onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                            className="input-field"
                        />
                    </div>

                    <div className="input-group">
                        {formData.password !== undefined ? (
                            <input
                                type="password"
                                placeholder="Senha"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                className="input-field"
                            />
                        ) : (
                            <input
                                type="password"
                                placeholder="000000"
                                maxLength="6"
                                value={formData.code || ''}
                                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                className="input-field"
                                style={{ textAlign: 'center', letterSpacing: '4px', fontSize: '1.2rem' }}
                            />
                        )}
                    </div>

                    <button type="submit" className="btn btn-in" style={{ width: '100%', marginTop: '1rem' }}>
                        Entrar
                    </button>

                    {error && <div className="message error">⚠️ {error}</div>}
                </form>

                <div style={{ marginTop: '2rem', borderTop: '1px solid #333', paddingTop: '1.5rem' }}>
                    <button onClick={() => navigate('/')} className="btn" style={{ background: '#252525', fontSize: '0.8rem', padding: '10px 20px', border: '1px solid #333' }}>Voltar para o Ponto</button>
                </div>
            </div>
        </div>
    );
}

export default Login;
