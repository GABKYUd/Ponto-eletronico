import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function SecurityDashboard() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchLogs = async () => {
            const token = localStorage.getItem('token') || localStorage.getItem('hrToken');
            if (!token) {
                navigate('/login');
                return;
            }

            try {
                const res = await axios.get(`${API_URL}/api/security/logs`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setLogs(res.data);
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
        <div style={{ padding: '2rem', fontFamily: 'Inter, sans-serif', background: '#f9fafb', minHeight: '100vh' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h1 style={{ color: '#b91c1c', margin: 0 }}>🛡️ L3 Security & Audit Dashboard</h1>
                <button
                    onClick={() => navigate(-1)}
                    style={{ padding: '0.6rem 1.2rem', background: '#1f2937', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                    Voltar
                </button>
            </div>

            {loading && <p style={{ marginTop: '2rem', fontSize: '1.2rem' }}>Carregando logs de auditoria...</p>}
            {error && <p style={{ marginTop: '2rem', color: '#b91c1c', fontWeight: 'bold', padding: '1rem', background: '#fee2e2', borderRadius: '6px' }}>{error}</p>}

            {!loading && !error && (
                <div style={{ marginTop: '2rem', overflowX: 'auto', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', background: '#ffffff' }}>
                        <thead style={{ background: '#f3f4f6', borderBottom: '2px solid #e5e7eb' }}>
                            <tr>
                                <th style={{ padding: '1rem', color: '#374151' }}>Data/Hora</th>
                                <th style={{ padding: '1rem', color: '#374151' }}>Ação</th>
                                <th style={{ padding: '1rem', color: '#374151' }}>Alvo (Usuário)</th>
                                <th style={{ padding: '1rem', color: '#374151' }}>Detalhe</th>
                                <th style={{ padding: '1rem', color: '#374151' }}>IP Origem</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.map((log) => (
                                <tr key={log.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                    <td style={{ padding: '1rem', color: '#6b7280', fontSize: '0.9rem' }}>{new Date(log.timestamp).toLocaleString('pt-BR')}</td>
                                    <td style={{ padding: '1rem', fontWeight: '600', color: log.action.includes('FAILED') || log.action.includes('ANOMALY') || log.action.includes('LOCKED') ? '#b91c1c' : '#059669' }}>
                                        {log.action}
                                    </td>
                                    <td style={{ padding: '1rem', color: '#111827', fontWeight: '500' }}>{log.user_id}</td>
                                    <td style={{ padding: '1rem', color: '#4b5563' }}>{log.detail}</td>
                                    <td style={{ padding: '1rem', fontFamily: 'monospace', color: '#6b7280', background: '#f9fafb', borderRadius: '4px' }}>{log.ip}</td>
                                </tr>
                            ))}
                            {logs.length === 0 && (
                                <tr>
                                    <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>Nenhum log de segurança registrado ainda.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

export default SecurityDashboard;
