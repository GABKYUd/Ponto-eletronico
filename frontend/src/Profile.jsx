import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import './index.css';

function Profile() {
    const [user, setUser] = useState(null);
    const [posts, setPosts] = useState([]);
    const [certs, setCerts] = useState([]);
    const [coworkers, setCoworkers] = useState([]);
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({ bio: '', pfp: '' });
    const [error, setError] = useState(null);
    const [newCert, setNewCert] = useState({ name: '', issuer: '', date: '', file: null, imageUrl: '' });
    const { id } = useParams();
    const navigate = useNavigate();

    const loggedInUserId = localStorage.getItem('userId');
    const profileId = id || loggedInUserId;

    const authFetch = (url, options = {}) => {
        const token = localStorage.getItem('hrToken');
        const headers = { ...options.headers };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        return fetch(url, { ...options, headers });
    };

    // Fetch Data
    useEffect(() => {
        if (!loggedInUserId) {
            navigate('/login');
            return;
        }

        setUser(null);
        setPosts([]);
        setCerts([]);

        // Fetch User Profile
        authFetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/profile/${profileId}`)
            .then(res => {
                if (!res.ok) throw new Error('Failed to fetch profile');
                return res.json();
            })
            .then(data => {
                if (!data || !data.name) throw new Error('Invalid profile data');
                setUser(data);
                setEditForm({ bio: data.bio || '', pfp: data.pfp || '' });
            })
            .catch(err => {
                console.error(err);
                setError(err.message);
            });

        // Fetch Certs
        authFetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/certifications/${profileId}`)
            .then(res => res.json())
            .then(setCerts)
            .catch(err => console.error('Failed to fetch certs', err));

        // Fetch Social Graph (Posts)
        authFetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/posts`)
            .then(res => res.json())
            .then(setPosts)
            .catch(err => console.error('Failed to fetch posts', err));

        // Fetch Co-Workers
        authFetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/users`)
            .then(res => res.json())
            .then(data => {
                const others = data.filter(u => u.id !== loggedInUserId);
                setCoworkers(others);
            })
            .catch(err => console.error('Failed to fetch coworkers', err));

    }, [profileId, loggedInUserId, navigate]);

    const handleLike = async (postId) => {
        try {
            await authFetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/posts/${postId}/like`, { method: 'POST' });
            setPosts(posts.map(p => p.id === postId ? { ...p, likes: p.likes + 1 } : p));
        } catch (err) {
            console.error('Failed to like post', err);
        }
    };

    const handleUpdateProfile = async () => {
        await authFetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/profile/${loggedInUserId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(editForm)
        });
        setUser({ ...user, ...editForm });
        setIsEditing(false);
    };

    const handleAddCert = async () => {
        let imageUrl = newCert.imageUrl;
        // If a file was selected, upload it first
        if (newCert.file) {
            const formData = new FormData();
            formData.append('file', newCert.file);
            const uploadRes = await authFetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/upload`, {
                method: 'POST',
                body: formData
            });
            const uploadData = await uploadRes.json();
            if (uploadData.success) {
                imageUrl = uploadData.imageUrl;
            }
        }

        await authFetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/certifications`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...newCert, imageUrl, userId: loggedInUserId })
        });
        // Refresh certs
        const res = await authFetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/certifications/${profileId}`);
        const data = await res.json();
        setCerts(data);
        setNewCert({ name: '', issuer: '', date: '', imageUrl: '', file: null });
        document.getElementById('add-cert-form').style.display = 'none';
        document.getElementById('cert-file-input').value = '';
    };

    // New Feature: Create a Post
    const [newPostContent, setNewPostContent] = useState('');
    const handleCreatePost = async () => {
        if (!newPostContent) return;
        await authFetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/posts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: loggedInUserId, userName: user.name, content: newPostContent })
        });
        setNewPostContent('');
        // Refresh posts
        authFetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/posts`).then(res => res.json()).then(setPosts);
    };

    if (error) return <div className="app-container"><h2 style={{ color: 'red' }}>Error: {error}</h2><button className="btn" onClick={() => navigate('/login')}>Go to Login</button></div>;
    if (!user) return <div className="app-container">Loading...</div>;

    return (
        <div className="app-container" style={{ alignItems: 'flex-start', overflowY: 'auto', height: '100vh', display: 'block', paddingBottom: '3rem', background: 'linear-gradient(135deg, #121212 0%, #1e1e2f 100%)' }}>

            {/* Background Orbs */}
            <div style={{ position: 'fixed', top: '-10%', left: '-10%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(187,134,252,0.1) 0%, rgba(0,0,0,0) 70%)', filter: 'blur(50px)', zIndex: 0, pointerEvents: 'none' }}></div>
            <div style={{ position: 'fixed', bottom: '-20%', right: '-10%', width: '600px', height: '600px', background: 'radial-gradient(circle, rgba(3,218,198,0.05) 0%, rgba(0,0,0,0) 70%)', filter: 'blur(60px)', zIndex: 0, pointerEvents: 'none' }}></div>

            <div className="profile-grid" style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(300px, 350px) minmax(500px, 800px)',
                gap: '2.5rem',
                justifyContent: 'center',
                maxWidth: '1200px',
                margin: '3rem auto',
                alignItems: 'start',
                position: 'relative',
                zIndex: 1
            }}>

                {/* LEFT SIDEBAR: Profile & Achievements */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'sticky', top: '2rem' }}>

                    {/* Glassmorphism Profile Card */}
                    <div className="glass-login-card" style={{
                        background: 'rgba(30, 30, 30, 0.4)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
                        border: '1px solid rgba(255, 255, 255, 0.1)', padding: '2rem', borderRadius: '24px',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', textAlign: 'center', color: 'white'
                    }}>
                        <div style={{
                            width: '100px', height: '100px', borderRadius: '50%',
                            background: user.pfp ? `url(${user.pfp}) center/cover` : '#333',
                            border: '3px solid #bb86fc', boxShadow: '0 0 20px rgba(187,134,252,0.3)',
                            margin: '0 auto 1.5rem auto', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '2.5rem', fontWeight: 'bold', color: '#888'
                        }}>
                            {!user.pfp && user.name.charAt(0)}
                        </div>

                        <h2 style={{ fontSize: '1.5rem', margin: '0 0 0.5rem 0', fontWeight: '800', background: 'linear-gradient(to right, #bb86fc, #03dac6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                            {user.name}
                        </h2>
                        <span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: '20px', backgroundColor: 'rgba(3, 218, 198, 0.1)', color: '#03dac6', border: '1px solid rgba(3, 218, 198, 0.3)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                            {user.role}
                        </span>

                        {loggedInUserId === profileId && (
                            isEditing ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                                    <input className="input-field" placeholder="Avatar URL" value={editForm.pfp} onChange={e => setEditForm({ ...editForm, pfp: e.target.value })} style={{ background: 'rgba(0,0,0,0.3)' }} />
                                    <textarea className="input-field" placeholder="About you..." value={editForm.bio} onChange={e => setEditForm({ ...editForm, bio: e.target.value })} style={{ height: '80px', resize: 'none', background: 'rgba(0,0,0,0.3)' }} />
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button className="btn" onClick={handleUpdateProfile} style={{ flex: 1, background: 'linear-gradient(135deg, #bb86fc, #9965f4)', color: '#fff' }}>Save</button>
                                        <button className="btn" onClick={() => setIsEditing(false)} style={{ flex: 1, background: 'rgba(255,255,255,0.1)' }}>Cancel</button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <p style={{ fontSize: '0.95rem', color: '#ccc', lineHeight: '1.6', margin: '0 0 1.5rem 0', fontStyle: 'italic' }}>
                                        "{user.bio || 'Living the dream.'}"
                                    </p>
                                    <button className="btn" style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', transition: 'all 0.3s' }} onClick={() => setIsEditing(true)}>
                                        Edit Profile
                                    </button>
                                </>
                            )
                        )}
                        {loggedInUserId !== profileId && (
                            <p style={{ fontSize: '0.95rem', color: '#ccc', lineHeight: '1.6', margin: '0 0 1.5rem 0', fontStyle: 'italic' }}>
                                "{user.bio || 'Living the dream.'}"
                            </p>
                        )}

                        <button className="btn" style={{ width: '100%', marginTop: '1rem', background: '#bb86fc', color: '#000', fontWeight: 'bold' }} onClick={() => navigate('/employee-hub')}>
                            ⬅ Back to Hub
                        </button>
                    </div>

                    {/* Achievements Card View */}
                    <div style={{
                        background: 'rgba(30, 30, 30, 0.4)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
                        border: '1px solid rgba(255, 255, 255, 0.1)', padding: '1.5rem', borderRadius: '24px',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0 0 1.5rem 0' }}>
                            <h3 style={{ margin: 0, color: '#fff', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                🏆 Certificates
                            </h3>
                            {loggedInUserId === profileId && (
                                <button onClick={() => document.getElementById('add-cert-form').style.display = 'block'} style={{ background: 'none', border: 'none', color: '#03dac6', fontSize: '1.5rem', cursor: 'pointer', outline: 'none' }}>+</button>
                            )}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {certs.map(cert => (
                                <div key={cert.id} style={{ display: 'flex', gap: '1rem', alignItems: 'center', padding: '10px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    <div style={{ width: '40px', height: '40px', background: 'linear-gradient(135deg, #03dac6, #01bca7)', borderRadius: '10px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '1.2rem', color: '#000', flexShrink: 0 }}>
                                        📜
                                    </div>
                                    <div style={{ flex: 1, overflow: 'hidden' }}>
                                        <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '0.9rem', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{cert.name}</div>
                                        <div style={{ color: '#aaa', fontSize: '0.8rem' }}>{cert.issuer} • {cert.date}</div>
                                    </div>
                                </div>
                            ))}
                            {certs.length === 0 && <div style={{ color: '#888', fontSize: '0.9rem', textAlign: 'center', fontStyle: 'italic' }}>No achievements yet.</div>}
                        </div>

                        {/* Hidden Add Cert Form */}
                        <div id="add-cert-form" style={{ display: 'none', marginTop: '1.5rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                <input className="input-field" placeholder="Course Name" value={newCert.name} onChange={e => setNewCert({ ...newCert, name: e.target.value })} style={{ background: 'rgba(0,0,0,0.3)', padding: '10px' }} />
                                <input className="input-field" placeholder="Institution" value={newCert.issuer} onChange={e => setNewCert({ ...newCert, issuer: e.target.value })} style={{ background: 'rgba(0,0,0,0.3)', padding: '10px' }} />
                                <input className="input-field" type="date" value={newCert.date} onChange={e => setNewCert({ ...newCert, date: e.target.value })} style={{ background: 'rgba(0,0,0,0.3)', padding: '10px' }} />
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button className="btn" onClick={handleAddCert} style={{ flex: 1, background: '#03dac6', color: '#000' }}>Add</button>
                                    <button className="btn" onClick={() => document.getElementById('add-cert-form').style.display = 'none'} style={{ flex: 1, background: 'rgba(255,255,255,0.1)' }}>Close</button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Coworkers List */}
                    <div style={{
                        background: 'rgba(30, 30, 30, 0.4)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
                        border: '1px solid rgba(255, 255, 255, 0.1)', padding: '1.5rem', borderRadius: '24px',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                    }}>
                        <h3 style={{ margin: '0 0 1.5rem 0', color: '#fff', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            👥 Co-Workers
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {coworkers.slice(0, 5).map(cw => (
                                <div key={cw.id} style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                    <div
                                        style={{ width: '40px', height: '40px', background: 'linear-gradient(135deg, #bb86fc, #9965f4)', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold', color: '#fff', flexShrink: 0, cursor: 'pointer' }}
                                        onClick={() => navigate(`/profile/${cw.id}`)}
                                    >
                                        {cw.name.charAt(0)}
                                    </div>
                                    <div
                                        style={{ flex: 1, overflow: 'hidden', cursor: 'pointer' }}
                                        onClick={() => navigate(`/profile/${cw.id}`)}
                                    >
                                        <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '0.9rem' }}>{cw.name}</div>
                                        <div style={{ color: '#aaa', fontSize: '0.8rem' }}>{cw.role}</div>
                                    </div>
                                    <button
                                        className="btn"
                                        style={{ padding: '6px 12px', background: 'transparent', border: '1px solid rgba(3,218,198,0.5)', color: '#03dac6', fontSize: '0.8rem', borderRadius: '12px' }}
                                        onClick={() => navigate('/chat')}
                                    >
                                        Message
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* RIGHT/CENTER COLUMN: Timeline Feed */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

                    {/* Return to My Profile Banner (Only if viewing someone else) */}
                    {loggedInUserId !== profileId && (
                        <div style={{
                            background: 'rgba(3, 218, 198, 0.05)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
                            border: '1px solid rgba(3, 218, 198, 0.2)', padding: '1rem', borderRadius: '16px',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer',
                            boxShadow: '0 10px 30px -10px rgba(0,0,0,0.5)', transition: 'background 0.2s',
                        }} onClick={() => navigate('/profile')}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ fontSize: '1.5rem' }}>🏠</div>
                                <div>
                                    <div style={{ color: '#03dac6', fontWeight: 'bold' }}>Back to My Profile</div>
                                    <div style={{ color: '#aaa', fontSize: '0.8rem' }}>You are currently viewing {user.name}'s page.</div>
                                </div>
                            </div>
                            <div style={{ color: '#03dac6', fontSize: '1.2rem', fontWeight: 'bold' }}>➔</div>
                        </div>
                    )}

                    {/* Create Post Card (Only for logged-in user's profile) */}
                    {loggedInUserId === profileId && (
                        <div style={{
                            background: 'rgba(30, 30, 30, 0.4)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
                            border: '1px solid rgba(255, 255, 255, 0.1)', padding: '1.5rem 2rem', borderRadius: '24px',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                        }}>
                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                <div style={{
                                    width: '48px', height: '48px', borderRadius: '50%',
                                    background: user.pfp ? `url(${user.pfp}) center/cover` : '#333',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontWeight: 'bold', color: '#fff', flexShrink: 0,
                                    border: '2px solid rgba(187,134,252,0.5)'
                                }}>
                                    {!user.pfp && user.name.charAt(0)}
                                </div>
                                <textarea
                                    placeholder={`Got an update for the team, ${user.name.split(' ')[0]}?`}
                                    value={newPostContent}
                                    onChange={e => setNewPostContent(e.target.value)}
                                    style={{
                                        flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)',
                                        borderRadius: '16px', padding: '14px 20px', color: '#fff', fontSize: '1rem',
                                        outline: 'none', resize: 'none', height: '80px', fontFamily: 'inherit'
                                    }}
                                />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                <button className="btn" onClick={handleCreatePost} disabled={!newPostContent.trim()} style={{
                                    background: newPostContent.trim() ? 'linear-gradient(135deg, #03dac6, #01bca7)' : 'rgba(255,255,255,0.05)',
                                    color: newPostContent.trim() ? '#000' : '#666',
                                    padding: '10px 24px', borderRadius: '20px', fontWeight: 'bold', transition: 'all 0.3s'
                                }}>
                                    Broadcast
                                </button>
                            </div>
                        </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#888', margin: '0.5rem 0' }}>
                        <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to right, rgba(187,134,252,0.5), transparent)' }}></div>
                        <span style={{ fontSize: '0.85rem', letterSpacing: '2px', textTransform: 'uppercase' }}>Company Feed</span>
                        <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to left, rgba(3,218,198,0.5), transparent)' }}></div>
                    </div>

                    {/* Feed Timeline */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        {posts.map(post => (
                            <div key={post.id} style={{
                                background: 'rgba(30, 30, 30, 0.4)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
                                border: '1px solid rgba(255, 255, 255, 0.05)', padding: '2rem', borderRadius: '24px',
                                boxShadow: '0 10px 30px -10px rgba(0, 0, 0, 0.3)', transition: 'transform 0.2s',
                            }} className="post-card-hover">

                                {/* Post Header */}
                                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem' }}>
                                    <div style={{
                                        width: '50px', height: '50px', borderRadius: '50%',
                                        background: 'linear-gradient(135deg, #444, #222)', marginRight: '15px',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontWeight: 'bold', fontSize: '1.2rem', color: '#fff', cursor: 'pointer',
                                        border: '2px solid rgba(255,255,255,0.1)'
                                    }} onClick={() => navigate(`/profile/${post.user_id}`)}>
                                        {post.user_name.charAt(0)}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div
                                            style={{ fontSize: '1.1rem', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}
                                            onClick={() => navigate(`/profile/${post.user_id}`)}
                                        >
                                            {post.user_name}
                                        </div>
                                        <div style={{ fontSize: '0.85rem', color: '#aaa', marginTop: '2px' }}>
                                            {(() => {
                                                const diff = new Date() - new Date(post.timestamp);
                                                const hours = Math.floor(diff / (1000 * 60 * 60));
                                                return hours > 24 ? Math.floor(hours / 24) + 'd ago' : (hours > 0 ? hours + 'h ago' : 'Just now');
                                            })()}
                                        </div>
                                    </div>
                                </div>

                                {/* Post Body */}
                                <p style={{ margin: '0 0 1.5rem 0', color: '#e0e0e0', lineHeight: '1.7', fontSize: '1.05rem', whiteSpace: 'pre-wrap' }}>
                                    {post.content}
                                </p>

                                {/* Post Interactions */}
                                <div style={{ display: 'flex', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)', gap: '1.5rem' }}>
                                    <button
                                        onClick={() => handleLike(post.id)}
                                        style={{
                                            background: 'none', border: 'none', color: '#bb86fc', fontSize: '1rem',
                                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px',
                                            borderRadius: '8px', transition: 'background 0.2s'
                                        }} className="interaction-btn"
                                    >
                                        <span style={{ fontSize: '1.3rem' }}>⚡</span> {post.likes || 0} Sparks
                                    </button>
                                    <button
                                        onClick={() => navigate('/chat')}
                                        style={{
                                            background: 'none', border: 'none', color: '#888', fontSize: '1rem',
                                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px',
                                            borderRadius: '8px', transition: 'background 0.2s'
                                        }} className="interaction-btn"
                                    >
                                        <span style={{ fontSize: '1.3rem' }}>💬</span> Reply
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Profile;
