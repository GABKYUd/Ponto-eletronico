import React from 'react';

const WeeklyReportModal = ({ weeklyReport, onClose }) => {
    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
            <div className="card" style={{ background: '#1e1e1e', border: '1px solid #333', width: '90%', maxWidth: '900px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #333', paddingBottom: '1rem', marginBottom: '1rem' }}>
                    <h2 style={{ margin: 0, color: '#03dac6' }}>Relatório Semanal de Turnos e Pausas</h2>
                    <button onClick={onClose} className="btn" style={{ background: 'transparent', border: '1px solid #555' }}>Fechar</button>
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
    );
};

export default WeeklyReportModal;
