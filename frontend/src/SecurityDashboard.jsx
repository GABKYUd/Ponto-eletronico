import React, { useEffect, useState } from 'react';

import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function SecurityDashboard() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const fetchLogs = async () => {
            const token = localStorage.getItem('token') || localStorage.getItem('hrToken');
            if (!token) {
                navigate('/login');
                return;
            }

            try {
                const res = await fetch(`${API_URL}/api/security/logs`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (!res.ok) {
                    throw new Error(`HTTP error! status: ${res.status}`);
                }

                const data = await res.json();
                setLogs(data);
                setLoading(false);
            } catch (err) {
                console.error('Failed to fetch security logs:', err);
                setError('Acesso negado ou erro no servidor. Verifique suas permissões de Infra/Analista.');
                setLoading(false);
            }
        };

        fetchLogs();
    }, [navigate]);

    return (
        <div className="dashboard-container" style={{ padding: '2rem', maxWidth: '1800px', width: '100%', boxSizing: 'border-box', margin: '0 auto', height: '100vh', display: 'flex', flexDirection: 'column' }}>
            <div className="card" style={{ marginBottom: '1.5rem', background: 'linear-gradient(to right, #1e1e1e, #252525)', maxWidth: '100%', textAlign: 'left' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                        <h1 className="title" style={{ margin: 0, fontSize: '2rem' }}>Audit & Security Operations</h1>
                        <p style={{ margin: '0.5rem 0 0', color: '#888', fontSize: '0.95rem' }}>Enterprise Action Log</p>
                    </div>
                    <div>
                        <button
                            onClick={() => navigate(-1)}
                            className="btn"
                            style={{ background: '#333', fontSize: '0.9rem', color: '#fff' }}>
                            Voltar
                        </button>
                    </div>
                </div>
                {!loading && !error && (
                    <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
                        <input
                            type="text"
                            placeholder="🔍 Buscar IP, Usuário ou Ação..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ flex: 1, padding: '12px', borderRadius: '8px', background: '#121212', border: '1px solid #333', color: '#fff', outline: 'none' }}
                        />
                    </div>
                )}
            </div>

            {loading && <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>Carregando registros de auditoria...</div>}
            {error && <div className="card" style={{ background: 'rgba(255, 68, 68, 0.1)', border: '1px solid rgba(255, 68, 68, 0.2)', color: '#ff4444' }}>{error}</div>}

            {!loading && !error && (
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, gap: '1.5rem' }}>

                    {/* Visual Threat Matrix */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', minHeight: '200px' }}>
                        {/* KPI Cards */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ background: 'linear-gradient(135deg, rgba(255, 68, 68, 0.1), transparent)', border: '1px solid rgba(255,68,68,0.2)', padding: '1.5rem', borderRadius: '12px', flex: 1 }}>
                                <p style={{ margin: '0 0 0.5rem 0', color: '#ff4444', fontSize: '0.9rem' }}>Ameaças / Falhas</p>
                                <h3 style={{ margin: 0, fontSize: '2rem' }}>
                                    {Array.isArray(logs) ? logs.filter(l => l?.action && (String(l.action).includes('FAILED') || String(l.action).includes('ANOMALY') || String(l.action).includes('LOCKED'))).length : 0}
                                </h3>
                            </div>
                            <div style={{ background: 'linear-gradient(135deg, rgba(3, 218, 198, 0.1), transparent)', border: '1px solid rgba(3,218,198,0.2)', padding: '1.5rem', borderRadius: '12px', flex: 1 }}>
                                <p style={{ margin: '0 0 0.5rem 0', color: '#03dac6', fontSize: '0.9rem' }}>Eventos Seguros</p>
                                <h3 style={{ margin: 0, fontSize: '2rem' }}>
                                    {Array.isArray(logs) ? logs.filter(l => l?.action && (!String(l.action).includes('FAILED') && !String(l.action).includes('ANOMALY') && !String(l.action).includes('LOCKED'))).length : 0}
                                </h3>
                            </div>
                        </div>

                        {/* Top Attacking IPs Chart (Mock Logic for layout) */}
                        <div className="card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', background: '#1a1a1a', gridColumn: 'span 2' }}>
                            <h4 style={{ margin: '0 0 1rem 0', color: '#ddd' }}>Volume de Firewall / Logs</h4>
                            <div style={{ flex: 1 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    {/* Simple Bar showing recent event spread */}
                                    <BarChart data={Array.isArray(logs) ? logs.slice(0, 50).reverse().map((l, i) => ({ index: i, count: 1, type: (l?.action && String(l.action).includes('FAILED')) ? 'Ameaça' : 'Padrão' })) : []}>
                                        <Tooltip contentStyle={{ background: '#222', border: '1px solid #444', borderRadius: '8px' }} />
                                        <Bar dataKey="count" fill="#bb86fc" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    <div className="card" style={{ padding: '0', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden', background: '#1a1a1a' }}>
                        <div style={{ flex: 1, overflowY: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.95rem' }}>
                                <thead style={{ position: 'sticky', top: 0, background: '#222', borderBottom: '1px solid #333', zIndex: 1 }}>
                                    <tr>
                                        <th style={{ padding: '1rem', color: '#aaa', fontWeight: 'normal' }}>Timestamp</th>
                                        <th style={{ padding: '1rem', color: '#aaa', fontWeight: 'normal' }}>Action</th>
                                        <th style={{ padding: '1rem', color: '#aaa', fontWeight: 'normal' }}>Target</th>
                                        <th style={{ padding: '1rem', color: '#aaa', fontWeight: 'normal' }}>Details</th>
                                        <th style={{ padding: '1rem', color: '#aaa', fontWeight: 'normal' }}>Source IP</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Array.isArray(logs) ? logs.filter(l => {
                                        const s = searchTerm.toLowerCase();
                                        return (l?.action && String(l.action).toLowerCase().includes(s)) ||
                                            (l?.user_id && String(l.user_id).toLowerCase().includes(s)) ||
                                            (l?.ip && String(l.ip).toLowerCase().includes(s)) ||
                                            (l?.detail && String(l.detail).toLowerCase().includes(s));
                                    }).map((log) => {
                                        const actionStr = log.action || 'UNKNOWN';
                                        const isAlert = actionStr.includes('FAILED') || actionStr.includes('ANOMALY') || actionStr.includes('LOCKED') || actionStr.includes('REVOKED');

                                        return (
                                            <tr key={log.id || Math.random()} style={{ borderBottom: '1px solid #2a2a2a', background: isAlert ? 'rgba(255, 68, 68, 0.05)' : 'transparent' }}>
                                                <td style={{ padding: '1rem', color: '#888' }}>{log.timestamp ? new Date(log.timestamp).toLocaleString('pt-BR') : 'N/A'}</td>
                                                <td style={{ padding: '1rem', color: isAlert ? '#ff4444' : '#03dac6', fontWeight: isAlert ? 'bold' : 'normal' }}>
                                                    {actionStr}
                                                </td>
                                                <td style={{ padding: '1rem', color: '#ddd' }}>{log.user_id || 'System'}</td>
                                                <td style={{ padding: '1rem', color: '#aaa' }}>{log.detail || '-'}</td>
                                                <td style={{ padding: '1rem', color: '#666', fontFamily: 'monospace' }}>{log.ip || '-'}</td>
                                            </tr>
                                        );
                                    }) : (
                                        <tr>
                                            <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: '#ff4444' }}>Erro de Estrutura de Dados: Resposta inválida do servidor.</td>
                                        </tr>
                                    )}
                                    {Array.isArray(logs) && logs.length === 0 && (
                                        <tr>
                                            <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>Nenhum log de segurança encontrado.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default SecurityDashboard;
