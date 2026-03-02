import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './index.css';

function InvoiceCalculator() {
    const navigate = useNavigate();

    useEffect(() => {
        const role = localStorage.getItem('role');
        const allowedRoles = ['Vendors', 'Selling manager', 'Selling & merchandise representative', 'Merchandising', 'HR'];
        if (!allowedRoles.includes(role)) {
            alert('Acesso negado: Somente o departamento de vendas tem acesso à Calculadora de Preços.');
            navigate(-1);
        }
    }, [navigate]);

    const [costPrice, setCostPrice] = useState('');
    const [markupPercent, setMarkupPercent] = useState('');
    const [taxPercent, setTaxPercent] = useState('');
    const [discountPercent, setDiscountPercent] = useState('');

    const [results, setResults] = useState({
        sellingPrice: 0,
        taxAmount: 0,
        discountAmount: 0,
        finalPrice: 0,
        profitAmount: 0,
        profitMargin: 0,
    });

    const calculate = () => {
        const cost = parseFloat(costPrice) || 0;
        const markup = parseFloat(markupPercent) || 0;
        const tax = parseFloat(taxPercent) || 0;
        const discount = parseFloat(discountPercent) || 0;

        // Base Selling Price = Cost + (Cost * Markup / 100)
        const sellingPrice = cost + (cost * (markup / 100));

        // Tax Amount = Selling Price * (Tax / 100)
        const taxAmount = sellingPrice * (tax / 100);

        // Price with tax
        const priceWithTax = sellingPrice + taxAmount;

        // Discount Amount = Price with tax * (Discount / 100)
        const discountAmount = priceWithTax * (discount / 100);

        // Final Price
        const finalPrice = priceWithTax - discountAmount;

        // Profit Data
        const pureRevenue = sellingPrice - discountAmount; // Without tax
        const profitAmount = pureRevenue - cost;
        const profitMargin = pureRevenue > 0 ? (profitAmount / pureRevenue) * 100 : 0;

        setResults({
            sellingPrice,
            taxAmount,
            discountAmount,
            finalPrice,
            profitAmount,
            profitMargin
        });
    };

    useEffect(() => {
        calculate();
    }, [costPrice, markupPercent, taxPercent, discountPercent]);

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount);
    };

    return (
        <div className="app-container" style={{ padding: '2rem', display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
            <div className="card" style={{ width: '100%', maxWidth: '800px', display: 'flex', gap: '2rem' }}>

                {/* Inputs Section */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h2 style={{ margin: 0, color: '#03dac6' }}>🧮 Calculadora de Preços</h2>
                    </div>
                    <p style={{ color: '#aaa', fontSize: '0.9rem', margin: '0 0 1rem 0' }}>Simule preços de venda, impostos e descontos para faturas.</p>

                    <div className="input-group">
                        <label>Custo do Produto (R$)</label>
                        <input type="number" className="input-field" value={costPrice} onChange={e => setCostPrice(e.target.value)} placeholder="Ex: 50.00" step="0.01" />
                    </div>

                    <div className="input-group">
                        <label>Margem de Lucro / Markup (%)</label>
                        <input type="number" className="input-field" value={markupPercent} onChange={e => setMarkupPercent(e.target.value)} placeholder="Ex: 40" step="0.1" />
                    </div>

                    <div className="input-group">
                        <label>Impostos (%)</label>
                        <input type="number" className="input-field" value={taxPercent} onChange={e => setTaxPercent(e.target.value)} placeholder="Ex: 18" step="0.1" />
                    </div>

                    <div className="input-group">
                        <label>Desconto Oferecido (%)</label>
                        <input type="number" className="input-field" value={discountPercent} onChange={e => setDiscountPercent(e.target.value)} placeholder="Ex: 5" step="0.1" />
                    </div>

                    <div style={{ marginTop: 'auto', paddingTop: '1rem' }}>
                        <button onClick={() => navigate(-1)} className="btn" style={{ background: '#333', width: '100%' }}>Voltar</button>
                    </div>
                </div>

                {/* Results Section */}
                <div style={{ flex: 1, backgroundColor: '#1e1e1e', padding: '2rem', borderRadius: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <h3 style={{ margin: '0 0 1.5rem 0', color: '#fff', textAlign: 'center' }}>Resumo da Fatura</h3>

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid #333', paddingBottom: '0.5rem' }}>
                        <span style={{ color: '#aaa' }}>Preço Base de Venda:</span>
                        <strong style={{ color: '#fff' }}>{formatCurrency(results.sellingPrice)}</strong>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid #333', paddingBottom: '0.5rem' }}>
                        <span style={{ color: '#aaa' }}>Impostos Destacados:</span>
                        <strong style={{ color: '#ff5555' }}>+ {formatCurrency(results.taxAmount)}</strong>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', borderBottom: '1px solid #333', paddingBottom: '0.5rem' }}>
                        <span style={{ color: '#aaa' }}>Desconto Aplicado:</span>
                        <strong style={{ color: '#55ff55' }}>- {formatCurrency(results.discountAmount)}</strong>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', background: '#2d2d2d', padding: '1rem', borderRadius: '8px' }}>
                        <span style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 'bold' }}>Preço Final (Fatura):</span>
                        <strong style={{ color: '#03dac6', fontSize: '1.2rem' }}>{formatCurrency(results.finalPrice)}</strong>
                    </div>

                    <h4 style={{ margin: '0 0 1rem 0', color: '#888', fontSize: '0.9rem' }}>Análise de Rentabilidade</h4>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <div style={{ flex: 1, background: '#252525', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
                            <div style={{ color: '#aaa', fontSize: '0.8rem', marginBottom: '0.5rem' }}>Lucro Bruto Estimado</div>
                            <div style={{ color: results.profitAmount >= 0 ? '#4caf50' : '#f44336', fontWeight: 'bold', fontSize: '1.1rem' }}>
                                {formatCurrency(results.profitAmount)}
                            </div>
                        </div>
                        <div style={{ flex: 1, background: '#252525', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
                            <div style={{ color: '#aaa', fontSize: '0.8rem', marginBottom: '0.5rem' }}>Margem Líquida</div>
                            <div style={{ color: results.profitMargin >= 0 ? '#4caf50' : '#f44336', fontWeight: 'bold', fontSize: '1.1rem' }}>
                                {results.profitMargin.toFixed(1)}%
                            </div>
                        </div>
                    </div>

                </div>

            </div>
        </div>
    );
}

export default InvoiceCalculator;
