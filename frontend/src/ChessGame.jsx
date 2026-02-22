import { useState, useEffect } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { useNavigate } from 'react-router-dom';
import { aiMove } from 'js-chess-engine';
import './index.css';

function ChessGame() {
    const [game, setGame] = useState(new Chess());
    const [mode, setMode] = useState('local'); // 'local' or 'ai'
    const [aiLevel, setAiLevel] = useState(1); // 1 = Easy, 2 = Hard, 3 = Hell
    const [isAiThinking, setIsAiThinking] = useState(false);
    const navigate = useNavigate();

    // AI logic trigger
    useEffect(() => {
        if (mode === 'ai' && game.turn() === 'b' && !game.isGameOver()) {
            setIsAiThinking(true);
            setTimeout(() => {
                try {
                    // level: 1=Easy, 2=Hard, 3=Hell. Equivalent for engine: 1, 2, 3
                    const engineMove = aiMove(game.fen(), aiLevel);
                    const fromSquare = Object.keys(engineMove)[0].toLowerCase();
                    const toSquare = engineMove[fromSquare.toUpperCase()].toLowerCase();

                    const gameCopy = new Chess(game.fen());
                    try {
                        gameCopy.move({ from: fromSquare, to: toSquare, promotion: 'q' });
                    } catch (err) {
                        gameCopy.move({ from: fromSquare, to: toSquare });
                    }
                    setGame(gameCopy);
                } catch (e) {
                    console.error('AI Move Error:', e);
                } finally {
                    setIsAiThinking(false);
                }
            }, 600); // Slight delay for natural feel
        }
    }, [game, mode, aiLevel]);

    function onDrop(sourceSquare, targetSquare) {
        // Prevent player from moving Black pieces in AI mode
        if (mode === 'ai' && game.turn() === 'b') return false;

        let gameCopy = new Chess(game.fen());
        try {
            // Try with promotion to queen first (for pawn reaches end)
            gameCopy.move({
                from: sourceSquare,
                to: targetSquare,
                promotion: 'q',
            });
            setGame(gameCopy);
            return true;
        } catch (e) {
            // If it throws Invalid Move, try without promotion flag for normal moves
            try {
                gameCopy = new Chess(game.fen());
                gameCopy.move({
                    from: sourceSquare,
                    to: targetSquare,
                });
                setGame(gameCopy);
                return true;
            } catch (err) {
                // Completely invalid move
                return false;
            }
        }
    }

    function resetGame() {
        setGame(new Chess());
        setIsAiThinking(false);
    }

    return (
        <div className="app-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '2rem' }}>
            <div className="card" style={{ maxWidth: '800px', width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                        Chess ♟️ {isAiThinking && <span style={{ fontSize: '0.8rem', color: '#bb86fc' }}>(AI is thinking...)</span>}
                    </h2>
                    <button onClick={() => navigate('/games')} className="btn" style={{ background: '#333' }}>Back to Games</button>
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', background: '#252525', padding: '1rem', borderRadius: '8px' }}>
                    <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', marginBottom: '5px', color: '#aaa', fontSize: '0.9rem' }}>Game Mode</label>
                        <select
                            className="input-field"
                            style={{ margin: 0, padding: '8px' }}
                            value={mode}
                            onChange={(e) => {
                                setMode(e.target.value);
                                resetGame();
                            }}
                        >
                            <option value="local">Local PvP (Coworker)</option>
                            <option value="ai">vs AI Master</option>
                        </select>
                    </div>

                    {mode === 'ai' && (
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', marginBottom: '5px', color: '#aaa', fontSize: '0.9rem' }}>AI Difficulty</label>
                            <select
                                className="input-field"
                                style={{ margin: 0, padding: '8px' }}
                                value={aiLevel}
                                onChange={(e) => {
                                    setAiLevel(parseInt(e.target.value));
                                    resetGame();
                                }}
                            >
                                <option value={1}>Easy (Novice)</option>
                                <option value={2}>Hard (Challenger)</option>
                                <option value={3}>Hell (Grandmaster)</option>
                            </select>
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
                    <div style={{ width: '100%', maxWidth: '500px' }}>
                        <Chessboard
                            position={game.fen()}
                            onPieceDrop={onDrop}
                            customDarkSquareStyle={{ backgroundColor: '#779556' }}
                            customLightSquareStyle={{ backgroundColor: '#ebecd0' }}
                            boardOrientation="white"
                        />
                    </div>
                </div>

                <div style={{ textAlign: 'center' }}>
                    <h3 style={{ color: '#bb86fc' }}>
                        {game.isGameOver()
                            ? (game.isCheckmate() ? 'Checkmate! Game Over.' : 'Game Over (Draw)')
                            : (game.turn() === 'w' ? "White's Turn" : "Black's Turn")}
                    </h3>
                    <p style={{ color: '#aaa', fontSize: '0.9rem' }}>
                        {mode === 'local' ? 'Play locally by dragging and dropping pieces.' : 'You are White. Good luck against the AI!'}
                    </p>
                    <button className="btn" onClick={resetGame} style={{ marginTop: '1rem', background: '#03dac6', color: '#000' }}>Restart Match</button>
                </div>
            </div>
        </div>
    );
}

export default ChessGame;
