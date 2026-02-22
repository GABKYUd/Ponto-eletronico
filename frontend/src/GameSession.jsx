import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DiceRoller from './DiceRoller';
import './index.css';

function GameSession() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [members, setMembers] = useState([]);

    // Check if user is logged in
    useEffect(() => {
        if (!localStorage.getItem('employeeId')) navigate('/');
        fetchMembers();
    }, [id]);

    const fetchMembers = async () => {
        try {
            const token = localStorage.getItem('hrToken');
            const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/campaigns/${id}/members`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) setMembers(await res.json());
        } catch (err) { console.error(err); }
    };

    // Responsive check
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#121212', color: 'white' }}>
            {/* Header */}
            <div style={{ padding: '10px 20px', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#1e1e1e' }}>
                <h2 style={{ margin: 0, fontSize: isMobile ? '1.2rem' : '1.5rem' }}>Session #{id}</h2>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button onClick={() => navigate('/games/campaigns')} className="btn" style={{ background: '#444', padding: '5px 15px' }}>Exit</button>
                </div>
            </div>

            <div style={{ display: 'flex', flex: 1, overflow: 'hidden', flexDirection: isMobile ? 'column' : 'row' }}>
                {/* Left Panel: Map / VTT Area */}
                <div style={{ flex: 2, borderRight: isMobile ? 'none' : '1px solid #333', borderBottom: isMobile ? '1px solid #333' : 'none', padding: '20px', background: '#181818', position: 'relative' }}>
                    <div style={{
                        width: '100%', height: '100%', border: '2px dashed #444',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        borderRadius: '16px', color: '#666', flexDirection: 'column'
                    }}>
                        <h3>📍 Virtual Tabletop Map</h3>
                        <p>Map rendering module placeholder</p>
                    </div>

                    {/* Players Overlay */}
                    <div style={{ position: 'absolute', bottom: '30px', left: '30px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        {members.map(m => (
                            <div key={m.id} style={{ background: 'rgba(0,0,0,0.8)', padding: '10px', borderRadius: '8px', border: '1px solid #555' }}>
                                <div style={{ fontWeight: 'bold', color: '#bb86fc' }}>{m.char_name || 'No Char'}</div>
                                <div style={{ fontSize: '0.8rem' }}>{m.name}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right Panel: Sidebar (Dice & Tools) */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', maxWidth: isMobile ? '100%' : '400px', background: '#1e1e1e' }}>

                    {/* Tools Tabs */}
                    <div style={{ padding: '10px', height: '100%', overflowY: 'auto' }}>
                        <div className="card" style={{ padding: '1rem', marginBottom: '1rem' }}>
                            <h3 style={{ marginTop: 0 }}>Dice Roller</h3>
                            {/* Embedding simplified version or need to import the component properly */}
                            <DiceRoller />
                        </div>

                        <div className="card" style={{ padding: '1rem', height: '300px' }}>
                            <h3 style={{ marginTop: 0 }}>Session Notes</h3>
                            <textarea className="input-field" style={{ height: '200px', resize: 'none' }} placeholder="Take notes..."></textarea>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default GameSession;
