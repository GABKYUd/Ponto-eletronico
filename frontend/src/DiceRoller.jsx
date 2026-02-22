import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './index.css';

function DiceRoller() {
    const [result, setResult] = useState(null);
    const [rolling, setRolling] = useState(false);
    const [history, setHistory] = useState([]);
    const navigate = useNavigate();

    const roll = (sides) => {
        setRolling(true);
        setResult(null);

        // Simulate animation time
        setTimeout(() => {
            const val = Math.floor(Math.random() * sides) + 1;
            setResult(val);
            setRolling(false);
            setHistory(prev => [{ val, sides, time: new Date() }, ...prev].slice(0, 10));
        }, 500);
    };

    return (
        <div className="app-container">
            <div className="card" style={{ maxWidth: '500px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h2 style={{ margin: 0 }}>Dice Roller</h2>
                    <button onClick={() => navigate('/games')} className="btn" style={{ background: '#555', padding: '5px 10px' }}>Back</button>
                </div>

                <div style={{ minHeight: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {rolling ? (
                        <div style={{ fontSize: '2rem', animation: 'spin 0.5s infinite linear' }}>🎲</div>
                    ) : (
                        result !== null && (
                            <div className="dice-result">{result}</div>
                        )
                    )}
                    {!rolling && result === null && <p style={{ color: '#aaa' }}>Select a die to roll</p>}
                </div>

                <div className="button-group" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
                    {[4, 6, 8, 10, 12, 20].map(d => (
                        <button
                            key={d}
                            onClick={() => roll(d)}
                            className="btn"
                            style={{ background: '#2c2c2c', border: '1px solid #444', minWidth: '60px' }}
                        >
                            d{d}
                        </button>
                    ))}
                </div>

                {history.length > 0 && (
                    <div style={{ marginTop: '2rem', textAlign: 'left', borderTop: '1px solid #333', paddingTop: '1rem' }}>
                        <h4 style={{ margin: '0 0 1rem 0' }}>Recent Rolls</h4>
                        <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                            {history.map((h, i) => (
                                <div key={i} style={{ background: '#252525', padding: '5px 10px', borderRadius: '4px', whiteSpace: 'nowrap' }}>
                                    <span style={{ color: '#bb86fc' }}>d{h.sides}:</span> <strong>{h.val}</strong>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default DiceRoller;
