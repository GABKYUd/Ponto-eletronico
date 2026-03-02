import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import './index.css';

const HRInvites = ({ isHR }) => {
    const [invites, setInvites] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [lastGeneratedToken, setLastGeneratedToken] = useState(null);
    const [loading, setLoading] = useState(false);

    // Active Registration State
    const [registrationToken, setRegistrationToken] = useState(null);
    const [regForm, setRegForm] = useState({ name: '', id: '', email: '', role: 'Employee', password: '' });
    const [regLoading, setRegLoading] = useState(false);

    const token = localStorage.getItem('hrToken') || localStorage.getItem('token');
    const role = localStorage.getItem('role');

    useEffect(() => {
        if (role === 'HR') {
            fetchInvites();
        }
        fetchEmployees();
    }, []);

    const fetchInvites = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/hr/invites`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setInvites(res.data);
        } catch (err) {
            console.error("Failed to fetch invites", err);
        }
    };

    const fetchEmployees = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/users`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setEmployees(res.data);
        } catch (err) {
            console.error("Failed to fetch users", err);
        }
    };

    const handleGenerateInvite = async () => {
        if (loading) return;
        setLoading(true);
        try {
            const res = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/hr/invite`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.success) {
                setLastGeneratedToken(res.data.inviteToken);
                toast.success('Novo código gerado com sucesso!');
                fetchInvites();
            }
        } catch (err) {
            toast.error(err.response?.data?.error || 'Falha ao gerar código.');
        }
        setLoading(false);
    };

    const handleRevokeInvite = async (inviteId) => {
        try {
            const res = await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/hr/invites/${inviteId}/revoke`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.success) {
                toast.success('Convite cancelado.');
                fetchInvites();
                if (registrationToken === inviteId) setRegistrationToken(null);
            }
        } catch (err) {
            toast.error('Falha ao cancelar convite.');
        }
    };

    const handleRevokeUserSessions = async (userId, userName) => {
        if (!window.confirm(`ATENÇÃO: Deseja realmente desconectar o usuário '${userName}' de todos os dispositivos imediatamente?`)) return;
        try {
            const res = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/hr/users/${userId}/revoke-sessions`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.success) {
                toast.error(`Sessões derrubadas para ${userName}.`);
            }
        } catch (err) {
            toast.error('Falha ao derrubar sessões.');
        }
    };

    const handleRegisterSubmit = async (e) => {
        e.preventDefault();
        setRegLoading(true);
        try {
            // Note: the backend accepts name, id, email, role, password, specialCode
            const payload = {
                ...regForm,
                specialCode: registrationToken // we mapped it!
            };
            const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await response.json();

            if (data.success) {
                toast.success(`Usuário ${regForm.name} registrado com sucesso!`);
                setRegistrationToken(null);
                setRegForm({ name: '', id: '', email: '', role: 'Employee', password: '' });
                fetchInvites();
                fetchEmployees();
                if (data.qrCode) {
                    // Show a quick custom alert just to say 2FA is needed, the QR is practically handled if we intercept it, 
                    // but since this is an admin dashboard creation, the user will be forced to setup 2FA or we can just notify.
                    toast.info(`O usuário precisará escanear o QR Code de 2FA no seu primeiro login ou verificar a string base32.`, { autoClose: 6000 });
                }
            } else {
                toast.error(data.error || 'Falha no registro do usuário.');
            }
        } catch (err) {
            console.error(err);
            toast.error('Grave erro de conexão ao tentar registrar.');
        } finally {
            setRegLoading(false);
        }
    };

    const renderInviteStatus = (invite) => {
        if (invite.used === 1) return <span style={{ padding: '4px 8px', borderRadius: '4px', background: '#333', color: '#888', fontSize: '0.8rem' }}>Usado / Revogado</span>;

        const now = new Date();
        const expiresAt = new Date(invite.expires_at);
        if (now > expiresAt) {
            return <span style={{ padding: '4px 8px', borderRadius: '4px', background: 'rgba(255, 68, 68, 0.2)', color: '#ff4444', fontSize: '0.8rem', border: '1px solid #ff4444' }}>Expirado</span>;
        }

        return <span style={{ padding: '4px 8px', borderRadius: '4px', background: 'rgba(5, 150, 105, 0.2)', color: '#10b981', fontSize: '0.8rem', border: '1px solid #10b981' }}>Ativo</span>;
    };

    // Table Row & Cell Styles for standard dark mode look
    const thStyle = { padding: '12px 15px', borderBottom: '1px solid #333', textAlign: 'left', color: '#888', fontWeight: 'normal', fontSize: '0.9rem' };
    const tdStyle = { padding: '12px 15px', borderBottom: '1px solid #222' };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* Header */}
            <div>
                <h2 style={{ fontSize: '1.8rem', marginBottom: '0.5rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    🛡️ Governança de Acessos
                </h2>
                <p style={{ color: '#aaa', fontSize: '0.9rem' }}>Gerenciamento seguro de vínculos, convites e sessões ativas da plataforma.</p>
            </div>

            {role === 'HR' && (
                <div style={{ background: '#181818', border: '1px solid #333', borderRadius: '8px', padding: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#bb86fc' }}>Códigos de Convite (HR)</h3>
                        <button onClick={handleGenerateInvite} disabled={loading} className="btn" style={{ background: '#bb86fc', color: '#000', margin: 0, padding: '8px 16px', fontSize: '0.9rem' }}>
                            {loading ? 'Gerando...' : '+ Gerar Novo Convite'}
                        </button>
                    </div>

                    {lastGeneratedToken && (
                        <div style={{ background: 'rgba(252, 163, 17, 0.1)', borderLeft: '4px solid #fca311', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', gap: '15px', alignItems: 'flex-start' }}>
                            <span style={{ fontSize: '1.5rem' }}>⚠️</span>
                            <div>
                                <p style={{ margin: '0 0 10px 0', color: '#fca311', fontWeight: 'bold' }}>Salve este código agora! Ele não será exibido novamente após a página ser atualizada.</p>
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                    <div style={{ background: '#000', padding: '8px 12px', border: '1px solid #333', borderRadius: '4px', fontFamily: 'monospace', fontSize: '1.1rem', letterSpacing: '2px', color: '#fff' }}>
                                        {lastGeneratedToken}
                                    </div>
                                    <button onClick={() => { navigator.clipboard.writeText(lastGeneratedToken); toast.info("Token Copiado!"); }} className="btn" style={{ background: '#333', padding: '8px 12px', fontSize: '0.8rem' }}>Copiar</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Registration Form Overlay */}
                    {registrationToken && (
                        <div style={{ background: '#252525', border: '1px solid #bb86fc', borderRadius: '8px', padding: '1.5rem', marginBottom: '1.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #333', paddingBottom: '1rem', marginBottom: '1rem' }}>
                                <h4 style={{ margin: 0, color: '#bb86fc' }}>Registrar Funcionário</h4>
                                <button onClick={() => setRegistrationToken(null)} style={{ background: 'transparent', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: '1.2rem' }}>&times;</button>
                            </div>
                            <form onSubmit={handleRegisterSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.8rem', color: '#888' }}>Token Usado</label>
                                    <input type="text" value={registrationToken.substring(0, 16) + '...'} disabled className="input-field" style={{ opacity: 0.5 }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.8rem', color: '#888' }}>Nome Completo</label>
                                    <input type="text" required value={regForm.name} onChange={e => setRegForm({ ...regForm, name: e.target.value })} className="input-field" placeholder="Ex: João Silva" />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.8rem', color: '#888' }}>ID Login (Username)</label>
                                    <input type="text" required value={regForm.id} onChange={e => setRegForm({ ...regForm, id: e.target.value })} className="input-field" placeholder="Ex: jsilva12" />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.8rem', color: '#888' }}>Email</label>
                                    <input type="email" required value={regForm.email} onChange={e => setRegForm({ ...regForm, email: e.target.value })} className="input-field" placeholder="joao@empresa.com" />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.8rem', color: '#888' }}>Cargo</label>
                                    <select value={regForm.role} onChange={e => setRegForm({ ...regForm, role: e.target.value })} className="input-field" style={{ width: '100%' }}>
                                        <option value="Employee">Funcionário</option>
                                        <option value="HRAssistant">Assistente de RH</option>
                                        <option value="Vendors">Vendas</option>
                                        <option value="Merchandising">Merchandising</option>
                                        <option value="HR">Administrador (HR)</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.8rem', color: '#888' }}>Senha</label>
                                    <input type="password" required value={regForm.password} onChange={e => setRegForm({ ...regForm, password: e.target.value })} className="input-field" placeholder="••••••••" />
                                </div>
                                <div style={{ gridColumn: '1 / -1', marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                    <button type="button" onClick={() => setRegistrationToken(null)} className="btn" style={{ background: '#333' }}>Cancelar</button>
                                    <button type="submit" disabled={regLoading} className="btn" style={{ background: '#bb86fc', color: '#000' }}>{regLoading ? 'Processando...' : 'Finalizar Cadastro'}</button>
                                </div>
                            </form>
                        </div>
                    )}

                    <div style={{ overflowX: 'auto', background: '#121212', borderRadius: '8px', border: '1px solid #222' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                            <thead style={{ background: '#1a1a1a' }}>
                                <tr>
                                    <th style={thStyle}>ID Ref</th>
                                    <th style={thStyle}>Status</th>
                                    <th style={thStyle}>Expira em</th>
                                    <th style={thStyle}>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {invites.map((invite) => (
                                    <tr key={invite.id} style={{ transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = '#1a1a1a'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                                        <td style={{ ...tdStyle, fontFamily: 'monospace', color: '#aaa', fontSize: '0.8rem' }}>{invite.id}</td>
                                        <td style={tdStyle}>{renderInviteStatus(invite)}</td>
                                        <td style={{ ...tdStyle, color: '#bbb' }}>{new Date(invite.expires_at).toLocaleString()}</td>
                                        <td style={tdStyle}>
                                            {invite.used === 0 && new Date() < new Date(invite.expires_at) && (
                                                <div style={{ display: 'flex', gap: '10px' }}>
                                                    <button onClick={() => handleRevokeInvite(invite.id)} className="btn" style={{ padding: '6px 12px', fontSize: '0.8rem', background: 'transparent', border: '1px solid #ff4444', color: '#ff4444' }}>Revogar</button>
                                                    <button onClick={() => { setRegistrationToken(lastGeneratedToken || ''); toast.warning("Somente tokens conhecidos (visíveis na tela) podem ser usados! Digite ou use o token ativo.", { autoClose: false }); }} className="btn" style={{ padding: '6px 12px', fontSize: '0.8rem', background: '#0070f3', border: 'none', color: '#fff' }}>Registrar</button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {invites.length === 0 && (
                                    <tr>
                                        <td colSpan="4" style={{ padding: '2rem', textAlign: 'center', color: '#555' }}>Nenhum token foi gerado ainda.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <div style={{ background: 'rgba(255, 68, 68, 0.05)', border: '1px solid rgba(255, 68, 68, 0.2)', borderRadius: '8px', padding: '1.5rem' }}>
                <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.2rem', color: '#ff4444', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <i className="fas fa-skull-crossbones"></i> Kill-Switch de Sessão (Desconexão Global)
                </h3>
                <p style={{ color: '#aaa', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
                    Em caso de suspeita de comprometimento da conta de um funcionário, utilize esta ferramenta de emergência.
                    <strong> Isso empurrará imediatamente todos os tokens JWT ativos do usuário para a Denylist</strong>, forçando o logout em todos os dispositivos.
                </p>

                <div style={{ overflowX: 'auto', background: '#121212', borderRadius: '8px', border: '1px solid #222' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                        <thead style={{ background: '#1a1a1a' }}>
                            <tr>
                                <th style={thStyle}>Usuário (Nome e ID)</th>
                                <th style={thStyle}>Acesso Sistêmico</th>
                                <th style={thStyle}>Protocolo</th>
                            </tr>
                        </thead>
                        <tbody>
                            {employees.map((emp) => (
                                <tr key={emp.id} style={{ transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = '#1a1a1a'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                                    <td style={{ ...tdStyle, color: '#fff' }}>
                                        {emp.name} <br /><span style={{ fontSize: '0.8rem', color: '#666' }}>ID: {emp.id}</span>
                                    </td>
                                    <td style={{ ...tdStyle, color: '#bbb' }}>{emp.role}</td>
                                    <td style={tdStyle}>
                                        <button onClick={() => handleRevokeUserSessions(emp.id, emp.name)} className="btn" style={{ background: '#ff4444', color: '#fff', fontSize: '0.8rem', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                            <span>⚡</span> Derrubar Sessões
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {employees.length === 0 && (
                                <tr>
                                    <td colSpan="3" style={{ padding: '2rem', textAlign: 'center', color: '#555' }}>Carregando diretório de usuários...</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default HRInvites;
