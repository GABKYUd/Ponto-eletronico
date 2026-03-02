import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import './index.css';

function Chat() {
    const [messages, setMessages] = useState([]);
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null); // null = General, object = User
    const [input, setInput] = useState('');
    const bottomRef = useRef(null);
    const navigate = useNavigate();

    const TEAM_CHANNELS = [
        { id: 'team:marketing', name: '# Marketing', role: 'Canal da Equipe', isTeam: true },
        { id: 'team:printing', name: '# Impressão', role: 'Canal da Equipe', isTeam: true },
        { id: 'team:logistics', name: '# Logística', role: 'Canal da Equipe', isTeam: true },
    ];

    // Get current user info from localStorage
    const currentUserId = localStorage.getItem('employeeId');
    const [currentUserName, setCurrentUserName] = useState('Usuário');

    const selectedUserRef = useRef(selectedUser);

    useEffect(() => {
        selectedUserRef.current = selectedUser;
    }, [selectedUser]);

    useEffect(() => {
        if (!currentUserId) { navigate('/'); return; }

        // Fetch current user details to get clean name
        const token = localStorage.getItem('hrToken');
        fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/users/${currentUserId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => res.json())
            .then(data => setCurrentUserName(data.name))
            .catch(() => { });

        fetchUsers();
    }, [currentUserId, navigate]);

    useEffect(() => {
        if (!currentUserId) return;
        fetchMessages();
    }, [selectedUser, currentUserId]);

    useEffect(() => {
        if (!currentUserId) return;

        const token = localStorage.getItem('hrToken');
        const newSocket = io(import.meta.env.VITE_API_URL || 'http://localhost:3001', {
            auth: { token }
        });

        newSocket.on('new_message', (msg) => {
            setMessages(prev => {
                const sUser = selectedUserRef.current;
                let belongsInView = false;
                if (!sUser) {
                    belongsInView = (msg.recipient_id === null);
                } else if (sUser.isTeam) {
                    belongsInView = (msg.recipient_id === sUser.id);
                } else {
                    belongsInView = (
                        (msg.user_id === currentUserId && msg.recipient_id === sUser.id) ||
                        (msg.user_id === sUser.id && msg.recipient_id === currentUserId)
                    );
                }

                if (belongsInView) {
                    return [...prev, msg];
                }
                return prev;
            });
        });

        return () => {
            newSocket.disconnect();
        };

    }, [currentUserId]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const fetchUsers = async () => {
        try {
            const token = localStorage.getItem('hrToken');
            const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/users`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                // Filter out self
                setUsers(data.filter(u => u.id !== currentUserId));
            }
        } catch (err) {
            console.error('Falha ao carregar contatos');
        }
    };

    const fetchMessages = async () => {
        try {
            let url = `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/chat`;
            if (selectedUser) {
                // Fetch DM
                url += `?userId=${currentUserId}&otherId=${selectedUser.id}`;
            }
            // If General, url is just /api/chat (endpoint handles public default)

            const token = localStorage.getItem('hrToken');
            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setMessages(data);
            }
        } catch (err) {
            console.error('Chat error', err);
        }
    };

    const sendMessage = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        try {
            const body = {
                userId: currentUserId,
                userName: currentUserName,
                content: input,
                type: 'text'
            };

            if (selectedUser) {
                body.recipientId = selectedUser.id;
            }

            const token = localStorage.getItem('hrToken');
            await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(body)
            });
            setInput('');
            fetchMessages(); // Refresh immediately
        } catch (err) {
            alert('Falha ao enviar');
        }
    };

    return (
        <div className="app-container" style={{ paddingTop: '2rem', height: '100vh', boxSizing: 'border-box', overflow: 'hidden' }}>
            <div className="chat-interface">
                {/* Sidebar */}
                <div className="chat-sidebar">
                    <div className="sidebar-header">
                        <h3>💬 Mensageiro</h3>
                        <button onClick={() => navigate('/employee-hub')} className="btn-small">Voltar</button>
                    </div>

                    <div className="sidebar-list">
                        <div
                            className={`sidebar-item ${!selectedUser ? 'active' : ''}`}
                            onClick={() => setSelectedUser(null)}
                        >
                            <div className="avatar global">🌎</div>
                            <div className="info">
                                <div className="name">Chat Geral</div>
                                <div className="status">Sala Pública</div>
                            </div>
                        </div>

                        <div className="sidebar-divider">Canais de Equipe</div>
                        {TEAM_CHANNELS.map(team => (
                            <div
                                key={team.id}
                                className={`sidebar-item ${selectedUser?.id === team.id ? 'active' : ''}`}
                                onClick={() => setSelectedUser(team)}
                            >
                                <div className="avatar global" style={{ background: '#03dac6', color: '#000' }}>#</div>
                                <div className="info">
                                    <div className="name">{team.name}</div>
                                    <div className="status">{team.role}</div>
                                </div>
                            </div>
                        ))}

                        <div className="sidebar-divider">Mensagens Diretas</div>

                        {users.map(u => (
                            <div
                                key={u.id}
                                className={`sidebar-item ${selectedUser?.id === u.id ? 'active' : ''}`}
                                onClick={() => setSelectedUser(u)}
                            >
                                <div className="avatar">{u.name.charAt(0).toUpperCase()}</div>
                                <div className="info">
                                    <div className="name">{u.name}</div>
                                    <div className="status">{u.role}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Main Chat Area */}
                <div className="chat-main">
                    <div className="chat-header">
                        <div className="avatar-header">
                            {selectedUser ? selectedUser.name.charAt(0).toUpperCase() : '🌎'}
                        </div>
                        <div className="header-info">
                            <h3>{selectedUser ? selectedUser.name : 'Chat Geral'}</h3>
                            <span>{selectedUser ? 'Conversa Privada' : 'Todos podem ver isso'}</span>
                        </div>
                    </div>

                    <div className="chat-messages-area">
                        {messages.length === 0 && (
                            <div className="empty-state">Nenhuma mensagem ainda. Diga oi! 👋</div>
                        )}
                        {messages.map((msg, idx) => {
                            const isMine = msg.user_id === currentUserId;
                            return (
                                <div key={idx} className={`message-row ${isMine ? 'mine' : 'theirs'}`}>
                                    {!isMine && <div className="message-avatar" title={msg.user_name}>{msg.user_name.charAt(0).toUpperCase()}</div>}
                                    <div className="message-bubble">
                                        {!isMine && !selectedUser && <div className="msg-sender">{msg.user_name}</div>}
                                        <div className="msg-content">{msg.content}</div>
                                        <div className="msg-time">
                                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={bottomRef} />
                    </div>

                    <form onSubmit={sendMessage} className="chat-input-wrapper">
                        <input
                            type="text"
                            className="chat-input"
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            placeholder={`Mensagem para ${selectedUser ? selectedUser.name : 'todos'}...`}
                        />
                        <button type="submit" className="send-btn">➤</button>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default Chat;
