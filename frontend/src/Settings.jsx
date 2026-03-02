import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './index.css';

function Settings() {
    const [passForm, setPassForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
    const [message, setMessage] = useState(null);
    const [qrCode, setQrCode] = useState(null);
    const [showQr, setShowQr] = useState(false);

    const navigate = useNavigate();

    const userId = localStorage.getItem('userId');

    const handleChangePassword = async () => {
        if (passForm.newPassword !== passForm.confirmPassword) {
            setMessage({ type: 'error', text: 'As novas senhas não coincidem' });
            return;
        }

        try {
            const token = localStorage.getItem('token') || localStorage.getItem('hrToken');
            const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/auth/change-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    oldPassword: passForm.oldPassword,
                    newPassword: passForm.newPassword
                })
            });
            const data = await res.json();

            if (res.ok) {
                setMessage({ type: 'success', text: 'Senha atualizada com sucesso!' });
                setPassForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
            } else {
                setMessage({ type: 'error', text: data.error || 'Falha ao atualizar senha' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'Ocorreu um erro de rede' });
        }
    };

    const handleShow2FA = async () => {
        if (showQr) {
            setShowQr(false);
            return;
        }

        // Fetch QR Code
        const token = localStorage.getItem('token') || localStorage.getItem('hrToken');
        const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/auth/2fa/qr/${userId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.qrCode) {
            setQrCode(data.qrCode);
            setShowQr(true);
        } else {
            console.error('QR fetch failed:', data, 'Status:', res.status, 'userId:', userId);
            alert(`Failed to generate QR Code: ${data.error || 'Unknown error'}`);
        }
    };

    return (
        <div className="app-container">
            <div className="card" style={{ maxWidth: '600px' }}>
                <h1 className="title">⚙️ Configurações da Conta</h1>

                {/* Change Password Section */}
                <div style={{ marginBottom: '2rem', textAlign: 'left' }}>
                    <h3 style={{ borderBottom: '1px solid #333', paddingBottom: '0.5rem' }}>🔐 Segurança</h3>

                    <div className="input-group">
                        <label style={{ display: 'block', marginBottom: '5px', color: '#aaa' }}>Senha Atual</label>
                        <input
                            type="password"
                            className="input-field"
                            value={passForm.oldPassword}
                            onChange={(e) => setPassForm({ ...passForm, oldPassword: e.target.value })}
                        />
                    </div>

                    <div className="input-group">
                        <label style={{ display: 'block', marginBottom: '5px', color: '#aaa' }}>Nova Senha</label>
                        <input
                            type="password"
                            className="input-field"
                            value={passForm.newPassword}
                            onChange={(e) => setPassForm({ ...passForm, newPassword: e.target.value })}
                        />
                    </div>

                    <div className="input-group">
                        <label style={{ display: 'block', marginBottom: '5px', color: '#aaa' }}>Confirmar Nova Senha</label>
                        <input
                            type="password"
                            className="input-field"
                            value={passForm.confirmPassword}
                            onChange={(e) => setPassForm({ ...passForm, confirmPassword: e.target.value })}
                        />
                    </div>

                    {message && (
                        <div className={`message ${message.type}`}>
                            {message.text}
                        </div>
                    )}

                    <button className="btn" onClick={handleChangePassword} style={{ width: '100%', marginTop: '1rem' }}>
                        Atualizar Senha
                    </button>
                </div>

                {/* 2FA Section */}
                <div style={{ textAlign: 'left' }}>
                    <h3 style={{ borderBottom: '1px solid #333', paddingBottom: '0.5rem' }}>📲 Autenticação de Dois Fatores</h3>
                    <p style={{ color: '#888', fontSize: '0.9rem' }}>
                        Escaneie este código QR com o Google Authenticator ou Authy para fazer login com segurança.
                    </p>

                    <button
                        className="btn"
                        onClick={handleShow2FA}
                        style={{ background: showQr ? '#333' : '#bb86fc', width: '100%' }}
                    >
                        {showQr ? 'Ocultar Código QR' : 'Mostrar Código QR 2FA'}
                    </button>

                    {showQr && qrCode && (
                        <div className="qr-card">
                            <div style={{ background: '#fff', padding: '10px', borderRadius: '12px', display: 'inline-block' }}>
                                <img src={qrCode} alt="2FA QR Code" style={{ maxWidth: '200px', display: 'block' }} />
                            </div>
                            <p style={{ color: 'var(--text-primary)', margin: '1rem 0 0', fontWeight: '600' }}>Escaneie para registrar</p>
                        </div>
                    )}
                </div>

                <div style={{ marginTop: '2rem', borderTop: '1px solid #333', paddingTop: '1.5rem', textAlign: 'left' }}>
                    <button onClick={() => navigate('/employee-hub')} className="btn" style={{ background: '#252525', fontSize: '0.9rem', padding: '10px 20px', border: '1px solid #333', width: '100%' }}>
                        ⬅ Voltar ao Hub
                    </button>
                </div>

            </div>
        </div>
    );
}

export default Settings;
