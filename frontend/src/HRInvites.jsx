import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const HRInvites = ({ isHR }) => {
    const [invites, setInvites] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [lastGeneratedToken, setLastGeneratedToken] = useState(null);
    const [loading, setLoading] = useState(false);

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

    const renderInviteStatus = (invite) => {
        if (invite.used === 1) return <span className="bg-gray-100 text-gray-800 text-xs font-medium px-2.5 py-0.5 rounded border border-gray-400">Usado / Revogado</span>;

        const now = new Date();
        const expiresAt = new Date(invite.expires_at);
        if (now > expiresAt) {
            return <span className="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded border border-red-400">Expirado</span>;
        }

        return <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded border border-green-400">Ativo</span>;
    };

    return (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
                <i className="fas fa-shield-alt mr-2 text-indigo-600"></i>
                Governança de Acessos
            </h2>

            {role === 'HR' && (
                <div className="mb-8 border border-indigo-100 rounded-lg p-5 bg-indigo-50">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-indigo-900 border-b border-indigo-200 pb-2 flex-grow">
                            Códigos de Convite (HR)
                        </h3>
                        <button
                            onClick={handleGenerateInvite}
                            disabled={loading}
                            className="ml-4 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded font-medium shadow transition disabled:opacity-50"
                        >
                            {loading ? 'Gerando...' : '+ Gerar Novo Convite'}
                        </button>
                    </div>

                    {lastGeneratedToken && (
                        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <i className="fas fa-exclamation-triangle text-yellow-400"></i>
                                </div>
                                <div className="ml-3">
                                    <p className="text-sm text-yellow-700 font-bold">
                                        Salve este código agora! Ele não será exibido em texto plano novamente.
                                    </p>
                                    <div className="mt-2 font-mono bg-white inline-block px-3 py-1 border border-yellow-200 rounded text-lg text-black">
                                        {lastGeneratedToken}
                                    </div>
                                    <button
                                        onClick={() => { navigator.clipboard.writeText(lastGeneratedToken); toast.info("Copiado!"); }}
                                        className="ml-3 text-xs text-indigo-600 hover:underline"
                                    >
                                        <i className="fas fa-copy mr-1"></i> Copiar
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="overflow-x-auto mt-4 bg-white rounded shadow-sm border border-gray-100">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">ID Ref</th>
                                    <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Registrado em / Expira em</th>
                                    <th className="px-6 py-3 text-right font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {invites.map((invite) => (
                                    <tr key={invite.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap font-mono text-xs text-gray-500">{invite.id}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">{renderInviteStatus(invite)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                                            {new Date(invite.expires_at).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            {invite.used === 0 && new Date() < new Date(invite.expires_at) && (
                                                <button
                                                    onClick={() => handleRevokeInvite(invite.id)}
                                                    className="text-red-600 hover:text-red-900 font-medium"
                                                >
                                                    Revogar
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {invites.length === 0 && (
                                    <tr>
                                        <td colSpan="4" className="px-6 py-4 text-center text-gray-500">Nenhum convite gerado.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <div className="border border-red-100 rounded-lg p-5 bg-red-50">
                <h3 className="text-lg font-semibold text-red-900 border-b border-red-200 pb-2 mb-4">
                    Kill-Switch de Sessão (Forçar Desconexão Global)
                </h3>
                <p className="text-sm text-red-700 mb-4">
                    Utilize esta ferramenta caso suspeite que a conta de um funcionário foi comprometida. Isso invalida imediatamente todos os tokens JWT ativos em todos os dispositivos dele.
                </p>

                <div className="overflow-x-auto bg-white rounded shadow-sm border border-gray-100">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Usuário</th>
                                <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Cargo</th>
                                <th className="px-6 py-3 text-right font-medium text-gray-500 uppercase tracking-wider">Emergência</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {employees.map((emp) => (
                                <tr key={emp.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                                        {emp.name} <span className="text-xs text-gray-400 block font-normal">{emp.id}</span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                                        {emp.role}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                        <button
                                            onClick={() => handleRevokeUserSessions(emp.id, emp.name)}
                                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs font-bold shadow transition"
                                        >
                                            <i className="fas fa-skull-crossbones mr-1"></i> Derrubar Sessões
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {employees.length === 0 && (
                                <tr>
                                    <td colSpan="3" className="px-6 py-4 text-center text-gray-500">Carregando usuários...</td>
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
