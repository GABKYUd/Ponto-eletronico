import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './index.css';

function Register() {
    const [formData, setFormData] = useState({
        name: '',
        id: '',
        role: 'Employee',
        password: '',
        email: '',
        specialCode: ''
    });
    const [error, setError] = useState('');
    const [successData, setSuccessData] = useState(null);
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessData(null);

        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            const data = await response.json();

            if (data.success) {
                setSuccessData(data);
                // Reset form
                setFormData({ name: '', id: '', role: 'Employee', password: '', email: '', specialCode: '' });
            } else {
                setError(data.error || 'Registration failed');
            }
        } catch (err) {
            console.error(err);
            setError('Connection error');
        }
    };

    return (
        <div className="app-container">
            <div className="card" style={{ maxWidth: '500px' }}>
                <h1 className="title">Register User</h1>

                {successData ? (
                    <div style={{ textAlign: 'center' }}>
                        <div className="message success" style={{ marginBottom: '1rem' }}>{successData.message}</div>
                        {successData.qrCode && (
                            <div style={{ background: 'white', padding: '1rem', borderRadius: '8px', display: 'inline-block', marginBottom: '1rem' }}>
                                <img src={successData.qrCode} alt="2FA QR Code" style={{ width: '200px', height: '200px' }} />
                                <p style={{ color: '#333', fontSize: '0.8rem', marginTop: '0.5rem' }}>Scan with Authenticator App</p>
                            </div>
                        )}
                        <div style={{ marginTop: '1rem' }}>
                            <button onClick={() => setSuccessData(null)} className="btn">Register Another</button>
                            <button onClick={() => navigate('/dashboard')} className="btn" style={{ background: '#666', marginLeft: '1rem' }}>Back to Dashboard</button>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleRegister} className="login-form">
                        <div className="input-group">
                            <label>Name</label>
                            <input type="text" name="name" placeholder="Full Name" value={formData.name} onChange={handleChange} className="input-field" required />
                        </div>

                        <div className="input-group">
                            <label>ID (Username)</label>
                            <input type="text" name="id" placeholder="ID / Username" value={formData.id} onChange={handleChange} className="input-field" required />
                        </div>

                        <div className="input-group">
                            <label>Email</label>
                            <input type="email" name="email" placeholder="Email Address" value={formData.email} onChange={handleChange} className="input-field" required />
                        </div>

                        <div className="input-group">
                            <label>Role / Cargo</label>
                            <select name="role" value={formData.role} onChange={handleChange} className="input-field">
                                <option value="Employee">Employee (Geral)</option>
                                <option value="HR">HR Manager</option>
                                <option value="Merchandising">Merchandising</option>
                                <option value="Vendors">Vendors (Vendas)</option>
                                <option value="Modelling">Modelling</option>
                                <option value="Logistica">Logística</option>
                            </select>
                        </div>

                        <div className="input-group">
                            <label>Password</label>
                            <input type="password" name="password" placeholder="Create Password" value={formData.password} onChange={handleChange} className="input-field" required />
                        </div>

                        {formData.role === 'HR' && (
                            <div className="input-group">
                                <label>Special Code</label>
                                <input type="password" name="specialCode" placeholder="HR Special Code" value={formData.specialCode} onChange={handleChange} className="input-field" required />
                            </div>
                        )}

                        <button type="submit" className="btn btn-in" style={{ width: '100%', marginTop: '1rem' }}>
                            Register User
                        </button>

                        {error && <div className="message error">{error}</div>}

                        <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                            <button type="button" onClick={() => navigate('/dashboard')} className="btn" style={{ background: '#666', width: '100%' }}>Back to Dashboard</button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}

export default Register;
