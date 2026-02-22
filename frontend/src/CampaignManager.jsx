import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './index.css';

function CampaignManager() {
    const [campaigns, setCampaigns] = useState([]); // Fixed missing state
    const [myChars, setMyChars] = useState([]);
    const [users, setUsers] = useState([]); // List of users to invite
    const [joinId, setJoinId] = useState('');
    const [showForm, setShowForm] = useState(false); // Fixed missing state
    const [formData, setFormData] = useState({ name: '', description: '' }); // Fixed missing state
    const [inviteTarget, setInviteTarget] = useState({}); // { campaignId: userId }

    const navigate = useNavigate();
    const user = { id: localStorage.getItem('employeeId') };
    const [userName, setUserName] = useState('Player');

    const authFetch = (url, options = {}) => {
        const token = localStorage.getItem('hrToken');
        const headers = { ...options.headers };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        return fetch(url, { ...options, headers });
    };

    // Fetch User, Campaigns, Chars, and All Users
    useEffect(() => {
        if (!user.id) { navigate('/'); return; }

        authFetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/users/${user.id}`)
            .then(res => res.json())
            .then(data => setUserName(data.name))
            .catch(() => { });

        const fetchData = async () => {
            try {
                const campRes = await authFetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/campaigns`);
                if (campRes.ok) setCampaigns(await campRes.json());

                const charRes = await authFetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/characters/user/${user.id}`);
                if (charRes.ok) setMyChars(await charRes.json());

                const usersRes = await authFetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/users`);
                if (usersRes.ok) {
                    const allUsers = await usersRes.json();
                    setUsers(allUsers.filter(u => u.id !== user.id));
                }
            } catch (err) { console.error(err); }
        };

        fetchData();
    }, [navigate, user.id]);

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            const res = await authFetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/campaigns`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...formData, dmId: user.id })
            });
            if (res.ok) {
                setFormData({ name: '', description: '' });
                setShowForm(false);
                // Refresh campaigns
                const campRes = await authFetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/campaigns`);
                setCampaigns(await campRes.json());
            }
        } catch (err) { alert('Error creating campaign'); }
    };

    const handleJoin = async (e) => {
        e.preventDefault();
        try {
            const res = await authFetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/campaigns/${joinId}/join`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id })
            });
            if (res.ok) {
                alert('Joined campaign!');
                setJoinId('');
            } else {
                alert('Failed to join');
            }
        } catch (err) { alert('Error'); }
    };

    const sendInvite = async (campaign) => {
        const targetId = inviteTarget[campaign.id];
        if (!targetId) return;

        try {
            await authFetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user.id,
                    userName: userName,
                    recipientId: targetId,
                    type: 'invite',
                    content: `📜 You are invited to join the campaign: "${campaign.name}"! Use ID: ${campaign.id}`
                })
            });
            alert('Invite sent!');
            setInviteTarget({ ...inviteTarget, [campaign.id]: '' });
        } catch (err) { alert('Failed to send invite'); }
    };

    return (
        <div className="app-container" style={{ alignItems: 'flex-start', paddingTop: '2rem', flexDirection: 'column' }}>

            {/* Characters Section */}
            <div className="card" style={{ maxWidth: '800px', marginBottom: '2rem', width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ margin: 0 }}>My Characters 🛡️</h2>
                    <button onClick={() => navigate('/games/characters/new')} className="btn">Create New</button>
                </div>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', overflowX: 'auto', paddingBottom: '1rem' }}>
                    {myChars.length === 0 && <p style={{ color: '#777' }}>No characters yet.</p>}
                    {myChars.map(char => (
                        <div key={char.id} onClick={() => navigate(`/games/characters/${char.id}`)} style={{ minWidth: '150px', background: '#333', padding: '1rem', borderRadius: '8px', cursor: 'pointer', border: '1px solid #444' }}>
                            <h3 style={{ margin: 0, fontSize: '1rem', color: '#bb86fc' }}>{char.name}</h3>
                            <p style={{ margin: 0, fontSize: '0.8rem', color: '#aaa' }}>Lvl {char.level} {char.class}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Campaigns Section */}
            <div className="card" style={{ maxWidth: '800px', width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <h2 style={{ margin: 0 }}>Campaigns 📜</h2>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button onClick={() => setShowForm(!showForm)} className="btn" style={{ background: '#03dac6', color: '#000' }}>
                            {showForm ? 'Cancel' : 'New Campaign'}
                        </button>
                        <button onClick={() => navigate('/games')} className="btn" style={{ background: '#555' }}>Back</button>
                    </div>
                </div>

                {showForm && (
                    <form onSubmit={handleCreate} style={{ marginBottom: '2rem', background: '#2c2c2c', padding: '1rem', borderRadius: '8px' }}>
                        <div className="input-group">
                            <label>Name</label>
                            <input className="input-field" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                        </div>
                        <div className="input-group">
                            <label>Description</label>
                            <textarea className="input-field" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
                        </div>
                        <button type="submit" className="btn">Create</button>
                    </form>
                )}

                <div style={{ marginBottom: '2rem' }}>
                    <form onSubmit={handleJoin} style={{ display: 'flex', gap: '0.5rem' }}>
                        <input className="input-field" placeholder="Enter Campaign ID to Join" value={joinId} onChange={e => setJoinId(e.target.value)} />
                        <button type="submit" className="btn" style={{ background: '#BB86FC' }}>Join</button>
                    </form>
                </div>

                <div className="campaign-list" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {campaigns.map(c => (
                        <div key={c.id} style={{ background: '#252525', padding: '1.5rem', borderRadius: '12px', border: '1px solid #333' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                <div>
                                    <h3 style={{ margin: '0 0 0.5rem 0', color: '#bb86fc' }}>{c.name} <small style={{ color: '#777', fontSize: '0.8rem' }}>(ID: {c.id})</small></h3>
                                    <p style={{ color: '#aaa', margin: 0, fontSize: '0.9rem' }}>{c.description}</p>
                                </div>
                                <button onClick={() => navigate(`/games/session/${c.id}`)} className="btn" style={{ alignSelf: 'start', padding: '8px 16px', fontSize: '0.9rem' }}>Play</button>
                            </div>

                            {/* Invite Section */}
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', background: '#1e1e1e', padding: '8px', borderRadius: '8px' }}>
                                <span style={{ fontSize: '0.85rem', color: '#888' }}>Invite:</span>
                                <select
                                    className="input-field"
                                    style={{ padding: '6px', fontSize: '0.85rem', width: 'auto', flex: 1 }}
                                    value={inviteTarget[c.id] || ''}
                                    onChange={e => setInviteTarget({ ...inviteTarget, [c.id]: e.target.value })}
                                >
                                    <option value="">Select Friend...</option>
                                    {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                </select>
                                <button
                                    onClick={() => sendInvite(c)}
                                    className="btn"
                                    style={{ padding: '6px 12px', fontSize: '0.8rem', background: '#03dac6', color: '#000' }}
                                    disabled={!inviteTarget[c.id]}
                                >
                                    Send
                                </button>
                            </div>
                        </div>
                    ))}
                    {campaigns.length === 0 && <p style={{ color: '#777', fontStyle: 'italic' }}>No campaigns available.</p>}
                </div>
            </div>
        </div>
    );
}

export default CampaignManager;
