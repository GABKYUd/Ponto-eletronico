import { useNavigate } from 'react-router-dom';
import './index.css';

function GamesHub() {
    const navigate = useNavigate();

    return (
        <div className="app-container">
            <div className="card" style={{ maxWidth: '800px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <h2 style={{ margin: 0 }}>Tabletop Zone 🎲</h2>
                    <button onClick={() => navigate('/employee-hub')} className="btn" style={{ background: '#555' }}>Back to Hub</button>
                </div>

                <div className="grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem' }}>

                    <div className="game-card" onClick={() => navigate('/games/dice')}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎲</div>
                        <h3>Dice Roller</h3>
                        <p style={{ color: '#aaa' }}>Roll d4, d6, d8, d10, d12, and d20 for your adventures.</p>
                    </div>

                    <div className="game-card" onClick={() => navigate('/games/chess')}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>♟️</div>
                        <h3>Chess</h3>
                        <p style={{ color: '#aaa' }}>Play a classic game of Chess.</p>
                    </div>

                    <div
                        className="game-card"
                        onClick={() => navigate('/games/campaigns')}
                        style={{ background: '#2c2c2c', padding: '2rem', borderRadius: '12px', cursor: 'pointer', textAlign: 'center', border: '1px solid #333' }}
                    >
                        <h2 style={{ color: '#bb86fc' }}>Campaigns & Characters 📜</h2>
                        <p>Create 5e Characters, Join Campaigns, and Play!</p>
                    </div>

                </div>
            </div>
        </div>
    );
}

export default GamesHub;
