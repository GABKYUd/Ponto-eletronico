import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DOMPurify from 'dompurify';
import './index.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function ReceiptsOS() {
    const navigate = useNavigate();

    const currentRole = localStorage.getItem('role');
    const isHighHierarchy = ['HR', 'HRAssistant', 'Selling manager'].includes(currentRole);

    useEffect(() => {
        const allowedRoles = ['Vendors', 'Selling manager', 'Selling & merchandise representative', 'Merchandising', 'HR', 'HRAssistant'];
        if (!allowedRoles.includes(currentRole)) {
            alert('Acesso negado: Somente a equipe de vendas e merchandising pode acessar o Gerador de Recibos.');
            navigate(-1);
        } else {
            if (isHighHierarchy) {
                fetchReceipts();
            }
        }
    }, [navigate, currentRole, isHighHierarchy]);

    const [companyInfo, setCompanyInfo] = useState({
        name: 'Kyo INC.',
        address1: '61.209.459/0001-94',
        address2: '',
        logoUrl: '/Kyu_Shop.png'
    });

    const [customerInfo, setCustomerInfo] = useState({
        name: 'Nome do Cliente',
        address1: 'Rua do Cliente, 1234',
        address2: 'Bairro, Cidade - SP 12345-678'
    });

    const [receiptDetails, setReceiptDetails] = useState({
        receiptNumber: '0000457',
        date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
        time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) // HH:MM
    });

    const [items, setItems] = useState([
        { id: 1, qty: 2, description: 'Produto/Serviço personalizado A', unitPrice: 45.00 },
        { id: 2, qty: 1, description: 'Produto/Serviço B', unitPrice: 75.00 },
        { id: 3, qty: 3, description: 'Produto/Serviço C', unitPrice: 20.00 },
        { id: 4, qty: 1, description: 'Taxa de manuseio/frete', unitPrice: 15.00 }
    ]);

    const [taxRate, setTaxRate] = useState(5.0);
    const [notes, setNotes] = useState('Obrigado pela sua compra! Todas as vendas são finais após 30 dias. Por favor, guarde este recibo para fins de garantia ou troca.\n\nPara dúvidas ou suporte, contate-nos em suporte@exemplo.com ou (11) 98765-4321.');

    const [savedReceipts, setSavedReceipts] = useState([]);
    const [showHistory, setShowHistory] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const fetchReceipts = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/api/receipts`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setSavedReceipts(data);
            }
        } catch (err) {
            console.error('Failed to fetch receipts:', err);
        }
    };

    const handleSave = async (silent = false) => {
        setIsSaving(true);
        try {
            const token = localStorage.getItem('token');

            // Re-calculate the grand total so we have a single source of truth to store
            const calculatedSubtotal = items.reduce((sum, item) => sum + (Number(item.qty) * Number(item.unitPrice)), 0);
            const calculatedTotal = calculatedSubtotal + (calculatedSubtotal * (Number(taxRate) / 100));

            const payload = {
                receipt_number: receiptDetails.receiptNumber,
                customer_name: customerInfo.name,
                total_amount: calculatedTotal,
                date: receiptDetails.date,
                data: {
                    companyInfo,
                    customerInfo,
                    receiptDetails,
                    items,
                    taxRate,
                    notes
                }
            };

            const res = await fetch(`${API_URL}/api/receipts`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (res.ok) {
                if (!silent) alert('Recibo salvo com sucesso!');
                fetchReceipts(); // Refresh history
            } else {
                if (!silent) alert(data.error || 'Erro ao salvar recibo.');
            }
        } catch (err) {
            console.error(err);
            if (!silent) alert('Erro de conexão ao salvar recibo.');
        } finally {
            setIsSaving(false);
        }
    };

    const loadReceipt = (receipt) => {
        try {
            const parsedData = JSON.parse(receipt.data);
            setCompanyInfo(parsedData.companyInfo);
            setCustomerInfo(parsedData.customerInfo);

            const loadedDetails = parsedData.receiptDetails;
            if (!loadedDetails.time) {
                // Fallback for older receipts without a time field
                loadedDetails.time = new Date(receipt.timestamp || Date.now()).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            }
            setReceiptDetails(loadedDetails);

            setItems(parsedData.items);
            setTaxRate(parsedData.taxRate);
            setNotes(parsedData.notes);
            setShowHistory(false);
        } catch (e) {
            console.error("Failed to parse receipt data", e);
            alert("Erro ao carregar recibo salvo.");
        }
    };

    const handlePrint = async () => {
        // Auto-save silently before printing
        await handleSave(true);
        window.print();
    };

    const handleLogoUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Prevent SVG uploads due to inherent XSS risks
            if (file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')) {
                alert('SVG uploads are not permitted for security reasons. Please upload a PNG, JPG, or WEBP image.');
                e.target.value = ''; // clear input
                return;
            }

            // Allow only standard raster images
            const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
            if (!allowedTypes.includes(file.type)) {
                alert('Invalid file format. Please upload a valid image.');
                e.target.value = '';
                return;
            }

            const reader = new FileReader();
            reader.onloadend = () => {
                setCompanyInfo({ ...companyInfo, logoUrl: reader.result });
            };
            reader.readAsDataURL(file);
        }
    };

    const addItem = () => {
        const newItem = {
            id: Date.now(),
            qty: 1,
            description: 'Novo Item',
            unitPrice: 0.00
        };
        setItems([...items, newItem]);
    };

    const removeItem = (id) => {
        setItems(items.filter(item => item.id !== id));
    };

    const updateItem = (id, field, value) => {
        setItems(items.map(item => {
            if (item.id === id) {
                return { ...item, [field]: value };
            }
            return item;
        }));
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount);
    };

    const subtotal = items.reduce((sum, item) => sum + (Number(item.qty) * Number(item.unitPrice)), 0);
    const taxAmount = subtotal * (Number(taxRate) / 100);
    const total = subtotal + taxAmount;

    // Helper to format date nicely
    const formatDate = (dateString, timeString) => {
        if (!dateString) return '';
        const [year, month, day] = dateString.split('-');
        let formatted = `${day}/${month}/${year}`;
        if (timeString) {
            formatted += ` às ${timeString}`;
        }
        return formatted;
    };

    // Helper to get time for older receipts in history
    const getHistoryTime = (receipt) => {
        try {
            const parsed = JSON.parse(receipt.data);
            if (parsed.receiptDetails && parsed.receiptDetails.time) return parsed.receiptDetails.time;
            return new Date(receipt.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        } catch {
            return '';
        }
    };

    const sanitize = (dirty) => {
        if (typeof dirty !== 'string') return dirty;
        return DOMPurify.sanitize(dirty);
    };

    return (
        <div className="receipt-builder-container" style={{ display: 'flex', height: '100vh', backgroundColor: '#121212', color: '#fff' }}>

            <div className="no-print" style={{ width: '400px', padding: '2rem', backgroundColor: '#1e1e1e', borderRight: '1px solid #333', overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <h2 style={{ margin: 0, color: '#03dac6' }}>🧾 Gerador de Recibos</h2>
                    <button onClick={() => navigate(-1)} className="btn" style={{ padding: '0.5rem', background: '#333' }}>Voltar</button>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                    <button onClick={handlePrint} className="btn" style={{ flex: 1, padding: '1rem', background: '#bb86fc', color: '#000', fontWeight: 'bold', fontSize: '1rem' }}>
                        🖨️ Imprimir / PDF
                    </button>
                    <button onClick={handleSave} disabled={isSaving} className="btn" style={{ flex: 1, padding: '1rem', background: '#03dac6', color: '#000', fontWeight: 'bold', fontSize: '1rem', opacity: isSaving ? 0.7 : 1 }}>
                        {isSaving ? 'Salvando...' : '💾 Salvar Recibo'}
                    </button>
                </div>

                {isHighHierarchy && (
                    <button onClick={() => setShowHistory(!showHistory)} className="btn" style={{ width: '100%', padding: '0.8rem', background: '#333', color: '#fff', marginBottom: '2rem', fontSize: '0.9rem', border: '1px solid #555' }}>
                        {showHistory ? 'Ocultar Histórico' : '📂 Ver Histórico de Recibos'}
                    </button>
                )}

                {showHistory && isHighHierarchy && (
                    <div style={{ marginBottom: '2rem', background: '#252525', padding: '1rem', borderRadius: '8px' }}>
                        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', color: '#aaa' }}>Histórico</h3>
                        {savedReceipts.length === 0 ? (
                            <p style={{ color: '#888', fontSize: '0.9rem' }}>Nenhum recibo salvo ainda.</p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {savedReceipts.map(r => (
                                    <div key={r.id} onClick={() => loadReceipt(r)} style={{ background: '#333', padding: '0.8rem', borderRadius: '4px', cursor: 'pointer', borderLeft: '3px solid #03dac6' }} className="history-card">
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                                            <strong style={{ color: '#fff', fontSize: '0.9rem' }}>Nº {r.receipt_number}</strong>
                                            <span style={{ color: '#aaa', fontSize: '0.8rem' }}>{formatDate(r.date, getHistoryTime(r))}</span>
                                        </div>
                                        <div style={{ color: '#bbb', fontSize: '0.85rem', marginBottom: '0.3rem' }}>{sanitize(r.customer_name)}</div>
                                        <div style={{ color: '#03dac6', fontSize: '0.85rem', fontWeight: 'bold' }}>{formatCurrency(r.total_amount)}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                <div className="editor-section" style={{ marginBottom: '1.5rem', background: '#252525', padding: '1rem', borderRadius: '8px' }}>
                    <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', color: '#aaa' }}>Informações da Empresa</h3>
                    <input type="text" value={companyInfo.name} onChange={e => setCompanyInfo({ ...companyInfo, name: e.target.value })} placeholder="Nome da Empresa" className="receipt-input" />
                    <input type="text" value={companyInfo.address1} onChange={e => setCompanyInfo({ ...companyInfo, address1: e.target.value })} placeholder="Endereço Linha 1" className="receipt-input" />
                    <input type="text" value={companyInfo.address2} onChange={e => setCompanyInfo({ ...companyInfo, address2: e.target.value })} placeholder="Endereço Linha 2" className="receipt-input" />
                    <label style={{ display: 'block', margin: '0.5rem 0', fontSize: '0.9rem', color: '#888' }}>Upload de Logo</label>
                    <input type="file" accept=".jpg,.jpeg,.png,.webp,.gif" onChange={handleLogoUpload} style={{ width: '100%', color: '#ccc' }} />
                </div>

                <div className="editor-section" style={{ marginBottom: '1.5rem', background: '#252525', padding: '1rem', borderRadius: '8px' }}>
                    <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', color: '#aaa' }}>Informações do Cliente</h3>
                    <input type="text" value={customerInfo.name} onChange={e => setCustomerInfo({ ...customerInfo, name: e.target.value })} placeholder="Nome do Cliente" className="receipt-input" />
                    <input type="text" value={customerInfo.address1} onChange={e => setCustomerInfo({ ...customerInfo, address1: e.target.value })} placeholder="Endereço Linha 1" className="receipt-input" />
                    <input type="text" value={customerInfo.address2} onChange={e => setCustomerInfo({ ...customerInfo, address2: e.target.value })} placeholder="Endereço Linha 2" className="receipt-input" />
                </div>

                <div className="editor-section" style={{ marginBottom: '1.5rem', background: '#252525', padding: '1rem', borderRadius: '8px' }}>
                    <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', color: '#aaa' }}>Detalhes do Recibo</h3>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <div style={{ flex: 1 }}>
                            <label style={{ fontSize: '0.8rem', color: '#888' }}>Nº do Recibo</label>
                            <input type="text" value={receiptDetails.receiptNumber} onChange={e => setReceiptDetails({ ...receiptDetails, receiptNumber: e.target.value })} className="receipt-input" />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={{ fontSize: '0.8rem', color: '#888' }}>Data</label>
                            <input type="date" value={receiptDetails.date} onChange={e => setReceiptDetails({ ...receiptDetails, date: e.target.value })} className="receipt-input" />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={{ fontSize: '0.8rem', color: '#888' }}>Hora</label>
                            <input type="time" value={receiptDetails.time} onChange={e => setReceiptDetails({ ...receiptDetails, time: e.target.value })} className="receipt-input" />
                        </div>
                    </div>
                </div>

                <div className="editor-section" style={{ marginBottom: '1.5rem', background: '#252525', padding: '1rem', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#aaa' }}>Itens</h3>
                        <button onClick={addItem} className="btn" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', background: '#03dac6', color: '#000' }}>+ Adicionar Item</button>
                    </div>

                    {items.map((item, index) => (
                        <div key={item.id} style={{ background: '#333', padding: '0.8rem', borderRadius: '6px', marginBottom: '0.8rem', position: 'relative' }}>
                            <button onClick={() => removeItem(item.id)} style={{ position: 'absolute', top: '5px', right: '5px', background: 'transparent', border: 'none', color: '#ff4444', cursor: 'pointer', fontSize: '1.2rem' }}>×</button>
                            <input type="text" value={item.description} onChange={e => updateItem(item.id, 'description', e.target.value)} placeholder="Descrição" className="receipt-input" style={{ marginBottom: '0.5rem' }} />
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ fontSize: '0.7rem', color: '#aaa' }}>Qtd</label>
                                    <input type="number" value={item.qty} onChange={e => updateItem(item.id, 'qty', e.target.value)} className="receipt-input" min="1" />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ fontSize: '0.7rem', color: '#aaa' }}>Preço Unitário (R$)</label>
                                    <input type="number" value={item.unitPrice} onChange={e => updateItem(item.id, 'unitPrice', e.target.value)} className="receipt-input" step="0.01" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="editor-section" style={{ marginBottom: '1.5rem', background: '#252525', padding: '1rem', borderRadius: '8px' }}>
                    <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', color: '#aaa' }}>Totais e Notas</h3>
                    <label style={{ fontSize: '0.8rem', color: '#888' }}>Taxa de Imposto (%)</label>
                    <input type="number" value={taxRate} onChange={e => setTaxRate(e.target.value)} className="receipt-input" step="0.1" />

                    <label style={{ display: 'block', fontSize: '0.8rem', color: '#888', marginTop: '1rem' }}>Notas / Termos</label>
                    <textarea value={notes} onChange={e => setNotes(e.target.value)} className="receipt-input" rows="4" style={{ resize: 'vertical' }}></textarea>
                </div>

            </div>

            {/* Preview Area */}
            <div className="preview-container" style={{ flex: 1, padding: '2rem', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', overflowY: 'auto', backgroundColor: '#e0e0e0' }}>
                <div className="printable-receipt" style={{
                    backgroundColor: '#fff',
                    color: '#333',
                    width: '210mm',
                    minHeight: '297mm', // A4 dimensions roughly
                    padding: '40mm',
                    boxSizing: 'border-box',
                    boxShadow: '0 0 20px rgba(0,0,0,0.2)',
                    fontFamily: '"Inter", "Helvetica Neue", Helvetica, Arial, sans-serif'
                }}>

                    {/* Receipt Header Grid */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '3rem' }}>
                        <div>
                            <h2 style={{ margin: '0 0 0.5rem 0', color: '#4a4a4a', fontSize: '1.2rem', fontWeight: '600' }}>{sanitize(companyInfo.name)}</h2>
                            <div style={{ fontSize: '0.9rem', color: '#555', lineHeight: '1.4' }}>
                                {sanitize(companyInfo.address1)}<br />
                                {sanitize(companyInfo.address2)}
                            </div>
                        </div>
                        <div style={{
                            width: '200px',
                            height: '60px',
                            border: companyInfo.logoUrl ? 'none' : '1px solid #ccc',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden'
                        }}>
                            {companyInfo.logoUrl ? (
                                <img src={companyInfo.logoUrl} alt="Company Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                            ) : (
                                <span style={{ color: '#aaa', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>☁️ Upload de Logo</span>
                            )}
                        </div>
                    </div>

                    <div style={{ textAlign: 'right', marginBottom: '3rem' }}>
                        <h1 style={{ margin: 0, fontSize: '2.5rem', letterSpacing: '4px', color: '#333', fontWeight: '800' }}>RECIBO</h1>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3rem' }}>
                        <div>
                            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#333', fontWeight: '700' }}>Faturado Para</h3>
                            <div style={{ fontSize: '1.1rem', color: '#333', marginBottom: '0.5rem' }}>{sanitize(customerInfo.name)}</div>
                            <div style={{ fontSize: '0.9rem', color: '#555', lineHeight: '1.4' }}>
                                {sanitize(customerInfo.address1)}<br />
                                {sanitize(customerInfo.address2)}
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '2rem', textAlign: 'right' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem' }}>
                                <strong style={{ color: '#333' }}>Nº Recibo</strong>
                                <strong style={{ color: '#333' }}>Data do Recibo</strong>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem', color: '#555' }}>
                                <span>{sanitize(receiptDetails.receiptNumber)}</span>
                                <span>{sanitize(formatDate(receiptDetails.date, receiptDetails.time))}</span>
                            </div>
                        </div>
                    </div>

                    {/* Items Table */}
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1rem' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#333b40', color: '#fff', fontSize: '0.85rem' }}>
                                <th style={{ padding: '0.6rem 1rem', textAlign: 'left', width: '10%' }}>QTD</th>
                                <th style={{ padding: '0.6rem 1rem', textAlign: 'left', width: '50%' }}>Descrição</th>
                                <th style={{ padding: '0.6rem 1rem', textAlign: 'right', width: '20%' }}>Preço Un.</th>
                                <th style={{ padding: '0.6rem 1rem', textAlign: 'right', width: '20%' }}>Valor</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item, i) => (
                                <tr key={item.id} style={{ borderBottom: '1px solid #ddd', fontSize: '0.9rem' }}>
                                    <td style={{ padding: '0.8rem 1rem', textAlign: 'center', color: '#333' }}>{item.qty}</td>
                                    <td style={{ padding: '0.8rem 1rem', color: '#333' }}>{sanitize(item.description)}</td>
                                    <td style={{ padding: '0.8rem 1rem', textAlign: 'right', color: '#333' }}>{Number(item.unitPrice).toFixed(2)}</td>
                                    <td style={{ padding: '0.8rem 1rem', textAlign: 'right', color: '#333' }}>{formatCurrency(Number(item.qty) * Number(item.unitPrice))}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* Totals Box */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '4rem' }}>
                        <div style={{ width: '50%' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                                <tbody>
                                    <tr>
                                        <td style={{ padding: '0.5rem 1rem', color: '#333' }}>Subtotal</td>
                                        <td style={{ padding: '0.5rem 1rem', textAlign: 'right', color: '#333' }}>{formatCurrency(subtotal)}</td>
                                    </tr>
                                    <tr>
                                        <td style={{ padding: '0.5rem 1rem', color: '#333' }}>Impostos ({taxRate}%)</td>
                                        <td style={{ padding: '0.5rem 1rem', textAlign: 'right', color: '#333' }}>{formatCurrency(taxAmount)}</td>
                                    </tr>
                                    <tr style={{ backgroundColor: '#f5f5f5' }}>
                                        <td style={{ padding: '0.8rem 1rem', color: '#333', fontWeight: 'bold', borderTop: '2px solid #333', borderBottom: '2px solid #333' }}>Total (BRL)</td>
                                        <td style={{ padding: '0.8rem 1rem', textAlign: 'right', color: '#333', fontWeight: 'bold', borderTop: '2px solid #333', borderBottom: '2px solid #333' }}>{formatCurrency(total)}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Notes Section */}
                    <div style={{ marginTop: 'auto' }}>
                        <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', color: '#333', fontWeight: 'bold' }}>Notas</h4>
                        <div style={{ fontSize: '0.8rem', color: '#666', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                            {sanitize(notes)}
                        </div>
                    </div>

                </div>
            </div>

        </div>
    );
}

export default ReceiptsOS;
