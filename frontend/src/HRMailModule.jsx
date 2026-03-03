import React, { useState } from 'react';

const HRMailModule = ({ selectedEmp, report }) => {
    const [mailSubject, setMailSubject] = useState('');
    const [mailContent, setMailContent] = useState('');
    const [mailType, setMailType] = useState('MAIL');
    const [bonusAmount, setBonusAmount] = useState('');
    const [meetingTime, setMeetingTime] = useState('');
    const [mailStatus, setMailStatus] = useState(null);

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

    return (
        <div style={{ marginTop: '1.5rem', background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '12px', border: '1px solid #333' }}>
            <h4 style={{ margin: '0 0 1rem 0', color: '#fff', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>✉️</span> Enviar Comunicação & Recompensas
            </h4>
            <form onSubmit={handleSendMail} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.3rem', color: '#aaa', fontSize: '0.9rem' }}>Destinatário</label>
                        <div style={{ padding: '0.8rem', background: '#222', border: '1px solid #444', borderRadius: '8px', color: '#fff' }}>
                            {selectedEmp && report[selectedEmp] ? `${report[selectedEmp].name} (ID: ${selectedEmp})` : 'Todos os Funcionários (Geral)'}
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
    );
};

export default HRMailModule;
