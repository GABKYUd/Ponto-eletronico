import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './index.css';

function Inbox() {
    const [mails, setMails] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [user, setUser] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const storedId = localStorage.getItem('employeeId') || localStorage.getItem('userId');
        const fetchMails = async () => {
            const token = localStorage.getItem('hrToken');
            if (!storedId || !token) { navigate('/'); return; }

            try {
                // Fetch User info
                const uRes = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/users/${storedId}`);
                if (uRes.ok) {
                    setUser(await uRes.json());
                }
            } catch (e) { console.error("Could not fetch user info"); }

            try {
                const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/mails/${storedId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (response.ok) {
                    const data = await response.json();
                    setMails(data);
                } else if (response.status === 403) {
                    setError("You do not have permission to view this inbox.");
                } else {
                    setError("Failed to load mails.");
                }
            } catch (err) {
                console.error(err);
                setError("Connection error.");
            } finally {
                setLoading(false);
            }
        };

        fetchMails();
    }, [navigate]);

    const handleMarkAsRead = async (mailId) => {
        const token = localStorage.getItem('hrToken');
        if (!token) return;

        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/mails/${mailId}/read`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
            if (res.ok) {
                setMails(prev => prev.map(m => m.id === mailId ? { ...m, is_read: 1 } : m));
            }
        } catch (e) {
            console.error(e);
        }
    };

    if (loading) return <div className="app-container"><div className="card">Loading Inbox...</div></div>;

    const unreadCount = mails.filter(m => !m.is_read).length;

    return (
        <div className="app-container" style={{ alignItems: 'flex-start', paddingTop: '2rem' }}>
            <div style={{ width: '100%', maxWidth: '800px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h1 style={{ margin: 0, fontSize: '2rem' }}>
                        📫 Inbox <span style={{ background: '#ff4444', color: '#fff', fontSize: '1rem', padding: '2px 8px', borderRadius: '12px', verticalAlign: 'middle', display: unreadCount > 0 ? 'inline-block' : 'none' }}>{unreadCount} Unread</span>
                    </h1>
                    <button onClick={() => navigate('/employee-hub')} className="btn" style={{ background: '#333' }}>Back to Hub</button>
                </div>

                {error && <div className="message error">{error}</div>}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {mails.length === 0 && !error ? (
                        <div className="card" style={{ textAlign: 'center', color: '#888' }}>No messages in your inbox.</div>
                    ) : (
                        mails.map(mail => {
                            const isReward = mail.type === 'REWARD';
                            const isMeeting = mail.type === 'MEETING';
                            return (
                                <div key={mail.id} className="card" style={{
                                    borderLeft: isReward ? '4px solid #fca311' : (isMeeting ? '4px solid #bb86fc' : '4px solid #03dac6'),
                                    background: mail.is_read ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.08)',
                                    opacity: mail.is_read ? 0.7 : 1,
                                    padding: '1.5rem',
                                    display: 'flex', flexDirection: 'column', gap: '0.8rem'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div>
                                            <div style={{ fontSize: '0.8rem', color: isReward ? '#fca311' : (isMeeting ? '#bb86fc' : '#888'), fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                                {mail.type} {mail.recipient_id ? '' : '(Company Wide)'}
                                            </div>
                                            <h3 style={{ margin: '0.3rem 0', fontSize: '1.3rem', color: '#fff' }}>{mail.subject}</h3>
                                            <div style={{ fontSize: '0.9rem', color: '#aaa' }}>From: <span style={{ color: '#fff' }}>{mail.sender_name || mail.sender_id}</span></div>
                                        </div>
                                        <div style={{ textAlign: 'right', fontSize: '0.8rem', color: '#666' }}>
                                            {new Date(mail.timestamp).toLocaleString()}
                                            {!mail.is_read && (
                                                <button onClick={() => handleMarkAsRead(mail.id)} style={{ display: 'block', marginTop: '10px', background: 'transparent', border: '1px solid #555', color: '#ccc', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer' }}>Mark as Read</button>
                                            )}
                                        </div>
                                    </div>

                                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '8px', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                                        {mail.content}
                                    </div>

                                    {isMeeting && mail.meeting_time && (
                                        <div style={{ background: 'rgba(187, 134, 252, 0.1)', border: '1px solid rgba(187,134,252,0.3)', padding: '0.8rem', borderRadius: '8px', color: '#bb86fc', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <span>📅</span> <strong>Scheduled Time:</strong> {new Date(mail.meeting_time).toLocaleString()}
                                        </div>
                                    )}

                                    {isReward && mail.bonus_amount > 0 && (
                                        <div style={{ background: 'rgba(252, 163, 17, 0.1)', border: '1px solid rgba(252,163,17,0.3)', padding: '0.8rem', borderRadius: '8px', color: '#fca311', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.2rem', fontWeight: 'bold' }}>
                                            <span>💰</span> Bonus Granted: ${mail.bonus_amount.toLocaleString()}
                                        </div>
                                    )}
                                </div>
                            )
                        })
                    )}
                </div>
            </div>
        </div>
    );
}

export default Inbox;
