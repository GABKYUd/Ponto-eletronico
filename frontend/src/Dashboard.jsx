import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import './index.css';

function Dashboard() {
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedEmp, setSelectedEmp] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [welcomeMsg, setWelcomeMsg] = useState('');
    const [weeklyReport, setWeeklyReport] = useState(null);
    const [showWeeklyReport, setShowWeeklyReport] = useState(false);
    const [updatingShift, setUpdatingShift] = useState(false);

    // Mails/Rewards State
    const [mailSubject, setMailSubject] = useState('');
    const [mailContent, setMailContent] = useState('');
    const [mailType, setMailType] = useState('MAIL');
    const [bonusAmount, setBonusAmount] = useState('');
    const [meetingTime, setMeetingTime] = useState('');
    const [mailStatus, setMailStatus] = useState(null);

    const navigate = useNavigate();

    // HR-themed Welcome Messages
    const hrMessages = [
        "Pronto para otimizar a eficiência da equipe? 📈",
        "Café garantido. Planilhas carregadas. Vamos lá. ☕",
        "Lembre-se: Você é o guardião do tempo. ⏳",
        "Garantindo que cada segundo conte (literalmente). ⏱️",
        "Os deuses da folha de pagamento estão observando. ✨",
        "Libere o poder dos dados organizados! 📊",
        "Aviso: Altos níveis de produtividade detectados. 🚀"
    ];

    useEffect(() => {
        setWelcomeMsg(hrMessages[Math.floor(Math.random() * hrMessages.length)]);

        const fetchReport = async () => {
            const token = localStorage.getItem('hrToken');
            if (!token) { navigate('/login'); return; }

            try {
                const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/reports`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (response.status === 401 || response.status === 403) {
                    localStorage.removeItem('hrToken');
                    navigate('/login');
                    return;
                }

                const data = await response.json();
                setReport(data);
            } catch (err) { console.error(err); }
            finally { setLoading(false); }
        };

        fetchReport();
    }, [navigate]);

    const filteredEmployees = report ? Object.keys(report).filter(empId => {
        const emp = report[empId];
        const search = searchTerm.toLowerCase();
        return empId.toLowerCase().includes(search) || (emp.name && emp.name.toLowerCase().includes(search));
    }) : [];

    const handleUpdateShift = async (empId, newShift) => {
        setUpdatingShift(true);
        const token = localStorage.getItem('hrToken');
        try {
            await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/users/${empId}/shift`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ shift_expectation: Number(newShift) })
            });
            setReport(prev => ({
                ...prev,
                [empId]: { ...prev[empId], shift_expectation: Number(newShift) }
            }));
        } catch (err) { console.error(err); }
        setUpdatingShift(false);
    };

    const loadWeeklyReport = async () => {
        setShowWeeklyReport(true);
        const token = localStorage.getItem('hrToken');
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/reports/weekly`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            setWeeklyReport(data);
        } catch (err) { console.error(err); }
    };

    const handleSendMail = async (e) => {
        e.preventDefault();
        setMailStatus(null);
        const token = localStorage.getItem('hrToken');
        if (!token) return;

        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/mails`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    recipientId: selectedEmp, // if null/empty, it sends to all
                    subject: mailSubject,
                    content: mailContent,
                    type: mailType,
                    bonusAmount: mailType === 'REWARD' ? Number(bonusAmount) : 0,
                    meetingTime: mailType === 'MEETING' ? meetingTime : null
                })
            });
            const data = await res.json();
            if (res.ok) {
                setMailStatus({ type: 'success', text: 'Enviado com sucesso!' });
                setMailSubject('');
                setMailContent('');
                setBonusAmount('');
                setMeetingTime('');
            } else {
                setMailStatus({ type: 'error', text: data.error || 'Falha ao enviar' });
            }
        } catch (err) {
            setMailStatus({ type: 'error', text: 'Erro de conexão' });
        }
    };

    if (loading) return <div className="app-container"><div className="card">Carregando...</div></div>;

    return (
        <div className="dashboard-container" style={{ padding: '2rem', maxWidth: '1800px', width: '100%', boxSizing: 'border-box', margin: '0 auto', height: '100vh', display: 'flex', flexDirection: 'column' }}>

            {/* Header */}
            <div className="card" style={{ marginBottom: '1.5rem', background: 'linear-gradient(to right, #1e1e1e, #252525)', maxWidth: '100%', textAlign: 'left' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                        <h1 className="title" style={{ margin: 0, fontSize: '2rem' }}>Centro de Comando RH</h1>
                        <p style={{ margin: '0.5rem 0 0', color: '#03dac6', fontStyle: 'italic', fontSize: '0.95rem' }}>"{welcomeMsg}"</p>
                    </div>

                    <div style={{ display: 'flex', gap: '0.8rem' }}>
                        <button onClick={() => navigate('/receipts')} className="btn" style={{ background: '#e0e0e0', color: '#000', fontSize: '0.9rem' }}>🧾 Recibos</button>
                        <button onClick={loadWeeklyReport} className="btn" style={{ background: '#01bca7', color: '#000', fontSize: '0.9rem' }}>📅 Relatório Semanal</button>
                        <button onClick={() => navigate('/employee-hub')} className="btn" style={{ background: '#bb86fc', color: '#000', fontSize: '0.9rem' }}>👨‍💻 Painel do Funcionário</button>
                        <button onClick={() => navigate('/register')} className="btn" style={{ background: '#0070f3', fontSize: '0.9rem' }}>+ Nova Contratação</button>
                        <button onClick={() => navigate('/')} className="btn" style={{ background: '#333', fontSize: '0.9rem' }}>Sair</button>
                    </div>
                </div>

                <div style={{ marginTop: '1.5rem' }}>
                    <input
                        type="text"
                        placeholder="🔍 Buscar Funcionário (Nome ou ID)..."
                        className="input-field"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ maxWidth: '100%' }}
                    />
                </div>
            </div>

            {/* Main Content Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '1.5rem', flex: 1, minHeight: 0 }}>

                {/* Sidebar List */}
                <div className="card" style={{ padding: '0', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#1a1a1a', maxWidth: '100%', textAlign: 'left' }}>
                    <div style={{ padding: '1rem', borderBottom: '1px solid #333', background: '#222' }}>
                        <h3 style={{ margin: 0, fontSize: '1rem' }}>Diretório da Equipe <span style={{ color: '#888' }}>({filteredEmployees.length})</span></h3>
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
                        {filteredEmployees.map(empId => {
                            const empData = report[empId];
                            const hasAnomalies = empData.anomalies.length > 0;
                            return (
                                <div
                                    key={empId}
                                    onClick={() => setSelectedEmp(empId)}
                                    style={{
                                        padding: '1rem',
                                        marginBottom: '0.5rem',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        background: selectedEmp === empId ? '#333' : '#222',
                                        borderLeft: hasAnomalies ? '4px solid #ff4444' : '4px solid #00C851',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    <div style={{ fontWeight: 'bold', fontSize: '1rem' }}>{empData.name}</div>
                                    <div style={{ fontSize: '0.8rem', color: '#888', marginTop: '4px' }}>ID: {empId}</div>
                                </div>
                            );
                        })}
                        {filteredEmployees.length === 0 && <p style={{ padding: '1rem', color: '#666', textAlign: 'center' }}>Nenhum resultado encontrado.</p>}
                    </div>
                </div>

                {/* Details Panel - Power BI Style Dashboard */}
                <div className="card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', background: '#121212', border: '1px solid #333', maxWidth: '100%', textAlign: 'left' }}>
                    {selectedEmp && report[selectedEmp] ? (
                        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                            {/* Employee Header */}
                            <div style={{ borderBottom: '1px solid #333', paddingBottom: '1rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <h2 style={{ margin: 0, fontSize: '2.2rem', background: 'linear-gradient(to right, #03dac6, #bb86fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                                        {report[selectedEmp].name}
                                    </h2>
                                    <span style={{ color: '#888', fontSize: '1rem', fontFamily: 'monospace' }}>ID: {selectedEmp}</span>
                                </div>
                                <div style={{ textAlign: 'right', display: 'flex', gap: '2rem', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ fontSize: '0.9rem', color: '#aaa' }}>Expectativa de Turno (Hrs)</div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '4px' }}>
                                            <input
                                                type="number"
                                                value={report[selectedEmp].shift_expectation || 8}
                                                onChange={(e) => handleUpdateShift(selectedEmp, e.target.value)}
                                                disabled={updatingShift}
                                                style={{ width: '60px', padding: '4px', background: '#333', color: '#fff', border: '1px solid #555', borderRadius: '4px', textAlign: 'center' }}
                                                min="1" max="24"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.9rem', color: '#aaa' }}>Total de Registros</div>
                                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{report[selectedEmp].logs.length}</div>
                                    </div>
                                </div>
                            </div>

                            {/* KPI Cards Row */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                                <div style={{ background: 'linear-gradient(135deg, rgba(3, 218, 198, 0.1), transparent)', border: '1px solid rgba(3,218,198,0.2)', padding: '1.5rem', borderRadius: '12px' }}>
                                    <p style={{ margin: '0 0 0.5rem 0', color: '#03dac6', fontSize: '0.9rem' }}>Turnos Válidos</p>
                                    <h3 style={{ margin: 0, fontSize: '2rem' }}>{report[selectedEmp].totalShifts}</h3>
                                </div>
                                <div style={{ background: 'linear-gradient(135deg, rgba(255, 68, 68, 0.1), transparent)', border: '1px solid rgba(255,68,68,0.2)', padding: '1.5rem', borderRadius: '12px' }}>
                                    <p style={{ margin: '0 0 0.5rem 0', color: '#ff4444', fontSize: '0.9rem' }}>Anomalias Detectadas</p>
                                    <h3 style={{ margin: 0, fontSize: '2rem' }}>{report[selectedEmp].anomalies.length}</h3>
                                </div>
                                <div style={{ background: 'linear-gradient(135deg, rgba(187, 134, 252, 0.1), transparent)', border: '1px solid rgba(187,134,252,0.2)', padding: '1.5rem', borderRadius: '12px' }}>
                                    <p style={{ margin: '0 0 0.5rem 0', color: '#bb86fc', fontSize: '0.9rem' }}>Duração Média do Turno</p>
                                    <h3 style={{ margin: 0, fontSize: '2rem' }}>
                                        {report[selectedEmp].totalShifts > 0
                                            ? (report[selectedEmp].logs.reduce((acc, l) => acc + (parseFloat(l.duration) || 0), 0) / report[selectedEmp].totalShifts).toFixed(1)
                                            : 0}h
                                    </h3>
                                </div>
                            </div>

                            {/* Main Charts Area */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', gap: '1.5rem', flex: 1, minHeight: '350px' }}>

                                {/* Shift Durations Bar Chart */}
                                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid #222', borderRadius: '12px', padding: '1rem', display: 'flex', flexDirection: 'column' }}>
                                    <h4 style={{ margin: '0 0 1rem 0', color: '#ddd' }}>Durações dos Turnos (Horas)</h4>
                                    <div style={{ flex: 1 }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={report[selectedEmp].logs.filter(l => l.duration)}>
                                                <XAxis dataKey="start" tickFormatter={(str) => new Date(str).toLocaleDateString()} stroke="#666" fontSize={12} />
                                                <YAxis stroke="#666" fontSize={12} />
                                                <Tooltip contentStyle={{ background: '#222', border: '1px solid #444', borderRadius: '8px' }} itemStyle={{ color: '#03dac6' }} />
                                                <Bar dataKey="duration" fill="#03dac6" radius={[4, 4, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* Status Distribution Pie Chart */}
                                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid #222', borderRadius: '12px', padding: '1rem', display: 'flex', flexDirection: 'column' }}>
                                    <h4 style={{ margin: '0 0 1rem 0', color: '#ddd' }}>Distribuição de Status</h4>
                                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={[
                                                        { name: 'Válido', value: report[selectedEmp].logs.filter(l => l.status === 'Valid').length },
                                                        { name: 'Incompleto', value: report[selectedEmp].logs.filter(l => l.status !== 'Valid').length }
                                                    ]}
                                                    cx="50%" cy="50%"
                                                    innerRadius={50} outerRadius={70}
                                                    paddingAngle={3} dataKey="value"
                                                >
                                                    <Cell fill="#03dac6" />
                                                    <Cell fill="#ff4444" />
                                                </Pie>
                                                <Tooltip contentStyle={{ background: '#222', border: 'none', borderRadius: '8px' }} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', fontSize: '0.85rem' }}>
                                        <span style={{ color: '#03dac6' }}>● Válido</span>
                                        <span style={{ color: '#ff4444' }}>● Incompleto</span>
                                    </div>
                                </div>
                            </div>

                            {/* Anomalies Alert Feed */}
                            {report[selectedEmp].anomalies.length > 0 && (
                                <div style={{ marginTop: '1.5rem', background: 'rgba(255, 68, 68, 0.05)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255, 68, 68, 0.2)' }}>
                                    <h4 style={{ color: '#ff4444', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <span style={{ fontSize: '1.2rem' }}>⚠️</span> Menu de Auditorias Necessárias
                                    </h4>
                                    <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                                            <thead>
                                                <tr style={{ borderBottom: '1px solid rgba(255,68,68,0.2)', textAlign: 'left' }}>
                                                    <th style={{ padding: '0.5rem', color: '#ff8888' }}>Data</th>
                                                    <th style={{ padding: '0.5rem', color: '#ff8888' }}>Tipo</th>
                                                    <th style={{ padding: '0.5rem', color: '#ff8888' }}>Detalhes</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {report[selectedEmp].anomalies.map((a, idx) => (
                                                    <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                        <td style={{ padding: '0.8rem 0.5rem', color: '#ccc' }}>{new Date(a.time).toLocaleString()}</td>
                                                        <td style={{ padding: '0.8rem 0.5rem', color: '#ffacac', fontWeight: 'bold' }}>{a.type}</td>
                                                        <td style={{ padding: '0.8rem 0.5rem', color: '#aaa' }}>{a.detail}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* HR Mail & Rewards Module */}
                            <div style={{ marginTop: '1.5rem', background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '12px', border: '1px solid #333' }}>
                                <h4 style={{ margin: '0 0 1rem 0', color: '#fff', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span>✉️</span> Enviar Comunicação & Recompensas
                                </h4>
                                <form onSubmit={handleSendMail} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '0.3rem', color: '#aaa', fontSize: '0.9rem' }}>Destinatário</label>
                                            <div style={{ padding: '0.8rem', background: '#222', border: '1px solid #444', borderRadius: '8px', color: '#fff' }}>
                                                {selectedEmp ? `${report[selectedEmp].name} (ID: ${selectedEmp})` : 'Todos os Funcionários (Geral)'}
                                            </div>
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '0.3rem', color: '#aaa', fontSize: '0.9rem' }}>Tipo</label>
                                            <select
                                                value={mailType}
                                                onChange={e => setMailType(e.target.value)}
                                                style={{ width: '100%', padding: '0.8rem', background: '#222', border: '1px solid #444', borderRadius: '8px', color: '#fff' }}
                                            >
                                                <option value="MAIL">Email Padrão</option>
                                                <option value="MEETING">Agendar Reunião</option>
                                                <option value="REWARD">Enviar Recompensa/Bônus</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.3rem', color: '#aaa', fontSize: '0.9rem' }}>Assunto</label>
                                        <input
                                            type="text"
                                            value={mailSubject}
                                            onChange={e => setMailSubject(e.target.value)}
                                            placeholder="Assunto..."
                                            style={{ width: '100%', padding: '0.8rem', background: '#222', border: '1px solid #444', borderRadius: '8px', color: '#fff' }}
                                            required
                                        />
                                    </div>

                                    {mailType === 'REWARD' && (
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '0.3rem', color: '#fca311', fontSize: '0.9rem', fontWeight: 'bold' }}>Valor do Bônus (R$)</label>
                                            <input
                                                type="number"
                                                value={bonusAmount}
                                                onChange={e => setBonusAmount(e.target.value)}
                                                placeholder="ex. 500"
                                                style={{ width: '100%', padding: '0.8rem', background: '#222', border: '1px solid #fca311', borderRadius: '8px', color: '#fff' }}
                                                required
                                            />
                                        </div>
                                    )}

                                    {mailType === 'MEETING' && (
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '0.3rem', color: '#bb86fc', fontSize: '0.9rem', fontWeight: 'bold' }}>Data e Hora da Reunião</label>
                                            <input
                                                type="datetime-local"
                                                value={meetingTime}
                                                onChange={e => setMeetingTime(e.target.value)}
                                                style={{ width: '100%', padding: '0.8rem', background: '#222', border: '1px solid #bb86fc', borderRadius: '8px', color: '#fff' }}
                                                required
                                            />
                                        </div>
                                    )}

                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.3rem', color: '#aaa', fontSize: '0.9rem' }}>Conteúdo da Mensagem</label>
                                        <textarea
                                            value={mailContent}
                                            onChange={e => setMailContent(e.target.value)}
                                            placeholder="Escreva sua mensagem aqui..."
                                            rows="4"
                                            style={{ width: '100%', padding: '0.8rem', background: '#222', border: '1px solid #444', borderRadius: '8px', color: '#fff', resize: 'vertical' }}
                                            required
                                        ></textarea>
                                    </div>

                                    <button type="submit" className="btn" style={{ background: mailType === 'REWARD' ? '#fca311' : (mailType === 'MEETING' ? '#bb86fc' : '#03dac6'), color: '#000', fontWeight: 'bold', padding: '1rem' }}>
                                        {mailType === 'REWARD' ? 'Enviar Recompensa 💰' : (mailType === 'MEETING' ? 'Agendar Reunião 📅' : 'Enviar Email ✉️')}
                                    </button>

                                    {mailStatus && (
                                        <div style={{ marginTop: '0.5rem', padding: '0.8rem', borderRadius: '8px', background: mailStatus.type === 'success' ? 'rgba(3, 218, 198, 0.1)' : 'rgba(255, 68, 68, 0.1)', color: mailStatus.type === 'success' ? '#03dac6' : '#ff4444', border: `1px solid ${mailStatus.type === 'success' ? '#03dac6' : '#ff4444'}` }}>
                                            {mailStatus.text}
                                        </div>
                                    )}
                                </form>
                            </div>

                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#666' }}>
                            <div style={{ width: '150px', height: '150px', borderRadius: '50%', background: 'rgba(255,255,255,0.02)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '2rem' }}>
                                <span style={{ fontSize: '4rem', opacity: 0.5 }}>📊</span>
                            </div>
                            <h2 style={{ color: '#aaa', margin: '0 0 0.5rem 0' }}>Nenhum Funcionário Selecionado</h2>
                            <p>Selecione um membro da equipe no diretório para gerar seu painel de análise.</p>
                        </div>
                    )}
                </div>

            </div>

            {/* Weekly Report Modal */}
            {showWeeklyReport && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
                    <div className="card" style={{ background: '#1e1e1e', border: '1px solid #333', width: '90%', maxWidth: '900px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #333', paddingBottom: '1rem', marginBottom: '1rem' }}>
                            <h2 style={{ margin: 0, color: '#03dac6' }}>Relatório Semanal de Turnos e Pausas</h2>
                            <button onClick={() => setShowWeeklyReport(false)} className="btn" style={{ background: 'transparent', border: '1px solid #555' }}>Fechar</button>
                        </div>
                        {weeklyReport ? (
                            <div style={{ overflowY: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.95rem' }}>
                                    <thead style={{ position: 'sticky', top: 0, background: '#1e1e1e' }}>
                                        <tr style={{ borderBottom: '2px solid #333' }}>
                                            <th style={{ padding: '0.8rem' }}>Funcionário</th>
                                            <th style={{ padding: '0.8rem' }}>Horas Esp./Dia</th>
                                            <th style={{ padding: '0.8rem' }}>Total Horas (7d)</th>
                                            <th style={{ padding: '0.8rem' }}>Dias Abaixo do Esperado</th>
                                            <th style={{ padding: '0.8rem' }}>Pausas Perdidas</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {weeklyReport.map(r => (
                                            <tr key={r.id} style={{ borderBottom: '1px solid #222' }}>
                                                <td style={{ padding: '0.8rem' }}>{r.name}</td>
                                                <td style={{ padding: '0.8rem' }}>{r.shift_expectation}</td>
                                                <td style={{ padding: '0.8rem' }}>{r.total_hours_worked}</td>
                                                <td style={{ padding: '0.8rem', color: r.days_under_expected > 0 ? '#ff4444' : '#03dac6' }}>{r.days_under_expected}</td>
                                                <td style={{ padding: '0.8rem', color: r.missed_breaks > 0 ? '#ffacac' : '#03dac6' }}>{r.missed_breaks}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>Carregando dados do relatório...</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default Dashboard;
