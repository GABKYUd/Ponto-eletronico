import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import './index.css';

function CharacterSheet() {
    const { id } = useParams();
    const navigate = useNavigate();
    const userId = localStorage.getItem('employeeId');

    const [char, setChar] = useState({
        name: '',
        race: '',
        class: '',
        level: 1,
        stats: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
        hp: 10,
        maxHp: 10,
        ac: 10,
        inventory: [],
        sheetData: {
            skills: {},
            saves: {},
            attacks: [], // { id, name, bonus, damage, type }
            features: '',
            proficiencyBonus: 2
        }
    });

    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState(null);

    // Initial load
    useEffect(() => {
        if (id) fetchChar();
    }, [id]);

    const authFetch = (url, options = {}) => {
        const token = localStorage.getItem('hrToken');
        const headers = { ...options.headers };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        return fetch(url, { ...options, headers });
    };

    const fetchChar = async () => {
        try {
            const res = await authFetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/characters/${id}`);
            if (res.ok) {
                const data = await res.json();
                // Merge default sheetData if missing
                if (!data.sheetData) data.sheetData = { skills: {}, saves: {}, attacks: [], features: '', proficiencyBonus: 2 };
                setChar(data);
            }
        } catch (err) { console.error(err); }
    };

    // Calculate Modifier
    const getMod = (score) => Math.floor((score - 10) / 2);

    // Calculate Proficiency Bonus based on level
    const getProficiency = (level) => Math.floor((level - 1) / 4) + 2;

    const handleChange = (field, value) => setChar(prev => ({ ...prev, [field]: value }));

    const handleStatChange = (stat, value) => {
        setChar(prev => ({
            ...prev,
            stats: { ...prev.stats, [stat]: parseInt(value) || 10 }
        }));
    };

    // Sheet Data Helper
    const updateSheet = (section, key, value) => {
        setChar(prev => ({
            ...prev,
            sheetData: {
                ...prev.sheetData,
                [section]: section === 'attacks' ? value : { ...prev.sheetData[section], [key]: value }
            }
        }));
    };

    // Roll Logic
    const rollD20 = (mod, title) => {
        const d20 = Math.floor(Math.random() * 20) + 1;
        const total = d20 + mod;
        let resultMsg = `Rolling ${title}:\n\n🎲 d20 (${d20}) + ${mod} = ${total}`;
        if (d20 === 20) resultMsg += "\n🎉 CRITICAL SUCCESS!";
        if (d20 === 1) resultMsg += "\n💀 CRITICAL FAILURE!";
        alert(resultMsg);
        // Future: Emit socket event to chat
    };

    const rollAttack = (atk) => {
        const d20 = Math.floor(Math.random() * 20) + 1;
        const total = d20 + parseInt(atk.bonus);
        let dmgRoll = 0; // Simplified damage (just random 1-8 for now for generic, or parse dice string later)
        // For now, prompt for damage or just show hit
        let resultMsg = `⚔️ Attacking with ${atk.name}:\n\nTo Hit: 🎲 ${d20} + ${atk.bonus} = ${total}`;
        if (d20 === 20) resultMsg += " (CRIT!)";
        if (d20 === 1) resultMsg += " (MISS!)";

        resultMsg += `\nDamage: ${atk.damage}`;
        alert(resultMsg);
    };

    const addAttack = () => {
        const newAtk = { id: Date.now(), name: 'New Weapon', bonus: 0, damage: '1d6 slashing' };
        const updated = [...(char.sheetData.attacks || []), newAtk];
        setChar(prev => ({ ...prev, sheetData: { ...prev.sheetData, attacks: updated } }));
    };

    const updateAttack = (idx, field, value) => {
        const updated = [...(char.sheetData.attacks || [])];
        updated[idx][field] = value;
        setChar(prev => ({ ...prev, sheetData: { ...prev.sheetData, attacks: updated } }));
    };

    const removeAttack = (idx) => {
        const updated = (char.sheetData.attacks || []).filter((_, i) => i !== idx);
        setChar(prev => ({ ...prev, sheetData: { ...prev.sheetData, attacks: updated } }));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const url = id ? `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/characters/${id}` : `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/characters`;
            const method = id ? 'PUT' : 'POST';
            const res = await authFetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...char, userId })
            });
            if (res.ok) {
                setMsg({ type: 'success', text: 'Character saved!' });
                if (!id) navigate('/games/campaigns');
            } else setMsg({ type: 'error', text: 'Failed to save.' });
        } catch (err) { setMsg({ type: 'error', text: 'Connection failed.' }); }
        finally { setLoading(false); }
    };

    const pb = getProficiency(char.level);
    const statsList = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
    const skillsList = [
        { name: 'Acrobatics', stat: 'dex' }, { name: 'Animal Handling', stat: 'wis' }, { name: 'Arcana', stat: 'int' },
        { name: 'Athletics', stat: 'str' }, { name: 'Deception', stat: 'cha' }, { name: 'History', stat: 'int' },
        { name: 'Insight', stat: 'wis' }, { name: 'Intimidation', stat: 'cha' }, { name: 'Investigation', stat: 'int' },
        { name: 'Medicine', stat: 'wis' }, { name: 'Nature', stat: 'int' }, { name: 'Perception', stat: 'wis' },
        { name: 'Performance', stat: 'cha' }, { name: 'Persuasion', stat: 'cha' }, { name: 'Religion', stat: 'int' },
        { name: 'Sleight of Hand', stat: 'dex' }, { name: 'Stealth', stat: 'dex' }, { name: 'Survival', stat: 'wis' }
    ];

    return (
        <div className="app-container" style={{ alignItems: 'flex-start', paddingTop: '1rem', display: 'block', height: '100vh', overflowY: 'auto' }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '2rem' }}>
                {/* Header Actions */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h2 style={{ margin: 0, color: '#fff' }}>{id ? 'Character Sheet' : 'New Character'}</h2>
                    <div>
                        <button onClick={handleSave} className="btn" style={{ marginRight: '1rem' }}>{loading ? 'Saving...' : 'Save'}</button>
                        <button onClick={() => navigate('/games/campaigns')} className="btn" style={{ background: '#555' }}>Back</button>
                    </div>
                </div>
                {msg && <div className={`message ${msg.type}`} style={{ marginBottom: '1rem' }}>{msg.text}</div>}

                {/* Top Info Bar */}
                <div className="card" style={{ padding: '1rem', marginBottom: '1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
                    <div className="input-group" style={{ margin: 0 }}>
                        <label>Name</label>
                        <input className="input-field" value={char.name} onChange={e => handleChange('name', e.target.value)} />
                    </div>
                    <div className="input-group" style={{ margin: 0 }}>
                        <label>Class</label>
                        <input className="input-field" value={char.class} onChange={e => handleChange('class', e.target.value)} />
                    </div>
                    <div className="input-group" style={{ margin: 0 }}>
                        <label>Race</label>
                        <input className="input-field" value={char.race} onChange={e => handleChange('race', e.target.value)} />
                    </div>
                    <div className="input-group" style={{ margin: 0, width: '80px' }}>
                        <label>Level</label>
                        <input type="number" className="input-field" value={char.level} onChange={e => handleChange('level', parseInt(e.target.value))} />
                    </div>
                    <div className="input-group" style={{ margin: 0, width: '80px' }}>
                        <label>Prof. Bonus</label>
                        <div style={{ fontSize: '1.2rem', fontWeight: 'bold', paddingTop: '5px', color: '#bb86fc' }}>+{pb}</div>
                    </div>
                </div>

                {/* Main 3-Column Layout */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>

                    {/* Column 1: Stats & Skills */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        {/* Ability Scores */}
                        <div className="card" style={{ padding: '1rem' }}>
                            <h3 style={{ marginTop: 0 }}>Abilities</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {statsList.map(stat => {
                                    const mod = getMod(char.stats[stat]);
                                    return (
                                        <div key={stat} style={{ display: 'flex', alignItems: 'center', background: '#252525', padding: '5px 10px', borderRadius: '8px' }}>
                                            <strong style={{ width: '40px', textTransform: 'uppercase' }}>{stat}</strong>
                                            <input
                                                type="number"
                                                value={char.stats[stat]}
                                                onChange={e => handleStatChange(stat, e.target.value)}
                                                style={{ width: '40px', background: '#333', border: 'none', color: '#fff', textAlign: 'center', margin: '0 10px', borderRadius: '4px' }}
                                            />
                                            <button onClick={() => rollD20(mod, stat.toUpperCase())} className="btn" style={{ padding: '2px 8px', fontSize: '0.8rem', marginLeft: 'auto' }}>
                                                {mod >= 0 ? '+' : ''}{mod}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Saving Throws & Skills */}
                        <div className="card" style={{ padding: '1rem' }}>
                            <h3 style={{ marginTop: 0 }}>Skills & Saves</h3>
                            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                {skillsList.map(skill => {
                                    const isProf = char.sheetData.skills[skill.name];
                                    const statMod = getMod(char.stats[skill.stat]);
                                    const total = statMod + (isProf ? pb : 0);
                                    return (
                                        <div key={skill.name} style={{ display: 'flex', alignItems: 'center', padding: '4px 0', borderBottom: '1px solid #333' }}>
                                            <input
                                                type="checkbox"
                                                checked={!!isProf}
                                                onChange={e => updateSheet('skills', skill.name, e.target.checked)}
                                                style={{ marginRight: '10px' }}
                                            />
                                            <span style={{ flex: 1 }}>{skill.name} <small style={{ color: '#777' }}>({skill.stat})</small></span>
                                            <span
                                                onClick={() => rollD20(total, skill.name)}
                                                style={{ cursor: 'pointer', color: '#03dac6', fontWeight: 'bold' }}
                                            >
                                                {total >= 0 ? '+' : ''}{total}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Column 2: Combat & Attacks */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        {/* Combat Stats */}
                        <div className="card" style={{ padding: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: '1rem' }}>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ border: '2px solid #fff', borderRadius: '50%', width: '50px', height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', margin: '0 auto' }}>
                                        <input
                                            value={char.ac}
                                            onChange={e => handleChange('ac', parseInt(e.target.value))}
                                            style={{ background: 'transparent', border: 'none', color: '#fff', width: '30px', textAlign: 'center', fontSize: '1.2rem' }}
                                        />
                                    </div>
                                    <small>Armor Class</small>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ border: '2px solid #bb86fc', borderRadius: '8px', width: '50px', height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', margin: '0 auto', color: '#bb86fc' }}>
                                        {getMod(char.stats.dex) >= 0 ? '+' : ''}{getMod(char.stats.dex)}
                                    </div>
                                    <small>Initiative</small>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ border: '2px solid #03dac6', borderRadius: '8px', width: '50px', height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', margin: '0 auto', color: '#03dac6' }}>
                                        30
                                    </div>
                                    <small>Speed</small>
                                </div>
                            </div>

                            <div style={{ background: '#252525', padding: '1rem', borderRadius: '8px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                    <label>Current HP</label>
                                    <label>Max HP: <input type="number" value={char.maxHp} onChange={e => handleChange('maxHp', parseInt(e.target.value))} style={{ width: '40px', background: 'transparent', border: 'none', color: '#888' }} /></label>
                                </div>
                                <input
                                    type="number"
                                    value={char.hp}
                                    onChange={e => handleChange('hp', parseInt(e.target.value))}
                                    style={{ width: '100%', fontSize: '2rem', textAlign: 'center', background: 'transparent', border: '1px solid #444', borderRadius: '8px', color: '#fff' }}
                                />
                            </div>
                        </div>

                        {/* Attacks */}
                        <div className="card" style={{ padding: '1rem', flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <h3 style={{ margin: 0 }}>Attacks & Spells</h3>
                                <button onClick={addAttack} className="btn" style={{ padding: '4px 8px', fontSize: '0.8rem' }}>+ Add</button>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {(char.sheetData.attacks || []).map((atk, idx) => (
                                    <div key={atk.id} style={{ background: '#252525', padding: '10px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div style={{ flex: 1 }}>
                                            <input
                                                value={atk.name}
                                                onChange={e => updateAttack(idx, 'name', e.target.value)}
                                                placeholder="Name"
                                                style={{ background: 'transparent', border: 'none', color: '#fff', fontWeight: 'bold', width: '100%' }}
                                            />
                                            <div style={{ display: 'flex', gap: '5px', fontSize: '0.8rem', color: '#aaa' }}>
                                                <span>Atk: +</span>
                                                <input
                                                    value={atk.bonus}
                                                    onChange={e => updateAttack(idx, 'bonus', e.target.value)}
                                                    style={{ width: '30px', background: '#333', border: 'none', color: '#aaa', textAlign: 'center' }}
                                                />
                                                <span>Dmg:</span>
                                                <input
                                                    value={atk.damage}
                                                    onChange={e => updateAttack(idx, 'damage', e.target.value)}
                                                    style={{ width: '80px', background: '#333', border: 'none', color: '#aaa' }}
                                                />
                                            </div>
                                        </div>
                                        <button onClick={() => rollAttack(atk)} className="btn" style={{ background: '#bb86fc', padding: '5px 10px' }}>🎲</button>
                                        <button onClick={() => removeAttack(idx)} style={{ background: 'transparent', border: 'none', color: '#cf6679', cursor: 'pointer' }}>✖</button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Column 3: Features & Inventory */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div className="card" style={{ padding: '1rem', flex: 1 }}>
                            <h3 style={{ marginTop: 0 }}>Features & Traits</h3>
                            <textarea
                                value={char.sheetData.features || ''}
                                onChange={e => setChar(prev => ({ ...prev, sheetData: { ...prev.sheetData, features: e.target.value } }))}
                                className="input-field"
                                style={{ height: '300px', resize: 'vertical' }}
                                placeholder="Class features, racial traits, feats..."
                            />
                        </div>

                        <div className="card" style={{ padding: '1rem', flex: 1 }}>
                            <h3 style={{ marginTop: 0 }}>Equipment</h3>
                            <textarea
                                className="input-field"
                                rows="6"
                                value={JSON.stringify(char.inventory, null, 2)}
                                onChange={e => {
                                    try {
                                        const parsed = JSON.parse(e.target.value);
                                        handleChange('inventory', parsed);
                                    } catch (err) { }
                                }}
                                placeholder="JSON inventory..."
                            ></textarea>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default CharacterSheet;
