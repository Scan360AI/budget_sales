-- =====================================================
-- Budget & Provvigioni - Setup Database Supabase
-- =====================================================
-- Versione: 1.0
-- Data: 16/10/2025
-- Esegui questo script nella console SQL di Supabase
-- =====================================================

-- 1) CREAZIONE TABELLE
-- =====================================================

-- Tabella agents
CREATE TABLE IF NOT EXISTS agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    area TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabella products
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    category TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabella months
CREATE TABLE IF NOT EXISTS months (
    ym TEXT PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabella budgets
CREATE TABLE IF NOT EXISTS budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ym TEXT NOT NULL REFERENCES months(ym) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    qty NUMERIC(14,3) NOT NULL,
    amount NUMERIC(14,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(ym, agent_id, product_id)
);

-- Tabella sales
CREATE TABLE IF NOT EXISTS sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ym TEXT NOT NULL REFERENCES months(ym) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    qty NUMERIC(14,3) NOT NULL CHECK (qty >= 0),
    amount NUMERIC(14,2) NOT NULL CHECK (amount >= 0),
    source TEXT,
    external_ref TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabella commission_rules_general
CREATE TABLE IF NOT EXISTS commission_rules_general (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    valid_from DATE NOT NULL,
    valid_to DATE,
    currency TEXT DEFAULT 'EUR',
    tiers JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabella appointments_kpi_raw
CREATE TABLE IF NOT EXISTS appointments_kpi_raw (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    period TEXT NOT NULL,
    source TEXT NOT NULL,
    payload JSONB NOT NULL,
    imported_at TIMESTAMPTZ DEFAULT now()
);

-- 2) INDICI PER PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_budgets_ym_agent ON budgets(ym, agent_id);
CREATE INDEX IF NOT EXISTS idx_budgets_ym_product ON budgets(ym, product_id);
CREATE INDEX IF NOT EXISTS idx_sales_ym_agent ON sales(ym, agent_id);
CREATE INDEX IF NOT EXISTS idx_sales_ym_product ON sales(ym, product_id);
CREATE INDEX IF NOT EXISTS idx_commission_rules_dates ON commission_rules_general(valid_from, valid_to);
CREATE INDEX IF NOT EXISTS idx_sales_external_ref ON sales(ym, agent_id, product_id, external_ref);

-- 3) ROW LEVEL SECURITY (RLS) - DISABILITATO
-- =====================================================
-- Per MVP senza autenticazione, RLS è disabilitato
-- Tutti possono accedere ai dati

-- Se in futuro vuoi abilitare RLS, decommentare:
/*
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE months ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_rules_general ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments_kpi_raw ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on agents"
    ON agents FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow all operations on products"
    ON products FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow all operations on months"
    ON months FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow all operations on budgets"
    ON budgets FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow all operations on sales"
    ON sales FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow all operations on commission_rules_general"
    ON commission_rules_general FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow all operations on appointments_kpi_raw"
    ON appointments_kpi_raw FOR ALL
    USING (true)
    WITH CHECK (true);
*/

-- 4) DATI DEMO
-- =====================================================

-- Inserisci mesi (ottobre 2024 - ottobre 2025)
INSERT INTO months (ym) VALUES 
    ('2024-10'), ('2024-11'), ('2024-12'),
    ('2025-01'), ('2025-02'), ('2025-03'),
    ('2025-04'), ('2025-05'), ('2025-06'),
    ('2025-07'), ('2025-08'), ('2025-09'),
    ('2025-10')
ON CONFLICT (ym) DO NOTHING;

-- Inserisci agenti demo
INSERT INTO agents (code, name, area, is_active) VALUES
    ('AGT-001', 'Mario Rossi', 'Nord', true),
    ('AGT-002', 'Laura Bianchi', 'Nord', true),
    ('AGT-003', 'Giuseppe Verdi', 'Centro', true),
    ('AGT-004', 'Anna Neri', 'Centro', true),
    ('AGT-005', 'Francesco Blu', 'Sud', true),
    ('AGT-006', 'Giulia Gialli', 'Sud', true),
    ('AGT-007', 'Marco Viola', 'Nord', true),
    ('AGT-008', 'Elena Arancio', 'Centro', true)
ON CONFLICT (code) DO NOTHING;

-- Inserisci prodotti demo
INSERT INTO products (code, name, category, is_active) VALUES
    ('PRD-A', 'Prodotto Alpha', 'Premium', true),
    ('PRD-B', 'Prodotto Beta', 'Standard', true),
    ('PRD-C', 'Prodotto Gamma', 'Premium', true),
    ('PRD-D', 'Prodotto Delta', 'Standard', true),
    ('PRD-E', 'Prodotto Epsilon', 'Economy', true),
    ('PRD-F', 'Prodotto Zeta', 'Premium', true),
    ('PRD-G', 'Prodotto Eta', 'Standard', true),
    ('PRD-H', 'Prodotto Theta', 'Economy', true)
ON CONFLICT (code) DO NOTHING;

-- Inserisci regola provvigioni (valida da gennaio 2025)
INSERT INTO commission_rules_general (valid_from, valid_to, currency, tiers) VALUES
    ('2025-01-01', NULL, 'EUR', 
    '[
        {"min_avg_price": 0, "max_avg_price": 50, "rate": 0.015},
        {"min_avg_price": 50, "max_avg_price": 100, "rate": 0.020},
        {"min_avg_price": 100, "max_avg_price": 150, "rate": 0.025},
        {"min_avg_price": 150, "max_avg_price": null, "rate": 0.030}
    ]'::jsonb)
ON CONFLICT DO NOTHING;

-- Inserisci budget demo per 2025-10 (ottobre 2025)
-- Budget per ogni combinazione agente x prodotto (sample realistico)
INSERT INTO budgets (ym, agent_id, product_id, qty, amount)
SELECT 
    '2025-10',
    a.id,
    p.id,
    CASE 
        WHEN p.category = 'Premium' THEN 50 + (random() * 50)::numeric
        WHEN p.category = 'Standard' THEN 80 + (random() * 70)::numeric
        ELSE 120 + (random() * 80)::numeric
    END,
    CASE 
        WHEN p.category = 'Premium' THEN 8000 + (random() * 4000)::numeric
        WHEN p.category = 'Standard' THEN 5000 + (random() * 3000)::numeric
        ELSE 2500 + (random() * 1500)::numeric
    END
FROM agents a
CROSS JOIN products p
WHERE a.code IN ('AGT-001', 'AGT-002', 'AGT-003', 'AGT-004', 'AGT-005')
    AND p.code IN ('PRD-A', 'PRD-B', 'PRD-C', 'PRD-D', 'PRD-E')
ON CONFLICT (ym, agent_id, product_id) DO NOTHING;

-- Inserisci sales demo per 2025-10 (performance variabile 70-120% del budget)
INSERT INTO sales (ym, agent_id, product_id, qty, amount, source, external_ref)
SELECT 
    '2025-10',
    b.agent_id,
    b.product_id,
    (b.qty * (0.7 + random() * 0.5))::numeric(14,3),
    (b.amount * (0.7 + random() * 0.5))::numeric(14,2),
    'ERP',
    'DEMO-' || substr(md5(random()::text), 1, 8)
FROM budgets b
WHERE b.ym = '2025-10'
ON CONFLICT DO NOTHING;

-- Inserisci alcuni dati per mesi precedenti (per trend)
INSERT INTO budgets (ym, agent_id, product_id, qty, amount)
SELECT 
    '2025-09',
    a.id,
    p.id,
    CASE 
        WHEN p.category = 'Premium' THEN 45 + (random() * 45)::numeric
        WHEN p.category = 'Standard' THEN 75 + (random() * 65)::numeric
        ELSE 110 + (random() * 70)::numeric
    END,
    CASE 
        WHEN p.category = 'Premium' THEN 7500 + (random() * 3500)::numeric
        WHEN p.category = 'Standard' THEN 4800 + (random() * 2800)::numeric
        ELSE 2300 + (random() * 1300)::numeric
    END
FROM agents a
CROSS JOIN products p
WHERE a.code IN ('AGT-001', 'AGT-002', 'AGT-003', 'AGT-004', 'AGT-005')
    AND p.code IN ('PRD-A', 'PRD-B', 'PRD-C', 'PRD-D', 'PRD-E')
ON CONFLICT (ym, agent_id, product_id) DO NOTHING;

INSERT INTO sales (ym, agent_id, product_id, qty, amount, source, external_ref)
SELECT 
    '2025-09',
    b.agent_id,
    b.product_id,
    (b.qty * (0.75 + random() * 0.45))::numeric(14,3),
    (b.amount * (0.75 + random() * 0.45))::numeric(14,2),
    'ERP',
    'DEMO-' || substr(md5(random()::text), 1, 8)
FROM budgets b
WHERE b.ym = '2025-09'
ON CONFLICT DO NOTHING;

-- Inserisci KPI appuntamenti demo
INSERT INTO appointments_kpi_raw (period, source, payload) VALUES
    ('2025-10', 'crm-demo', 
    '{
        "source": "crm-demo",
        "period": "2025-10",
        "items": [
            {"agent_code": "AGT-001", "meetings_total": 45, "meetings_held": 38, "deals_won": 6},
            {"agent_code": "AGT-002", "meetings_total": 52, "meetings_held": 44, "deals_won": 8},
            {"agent_code": "AGT-003", "meetings_total": 38, "meetings_held": 32, "deals_won": 5},
            {"agent_code": "AGT-004", "meetings_total": 41, "meetings_held": 35, "deals_won": 4},
            {"agent_code": "AGT-005", "meetings_total": 36, "meetings_held": 30, "deals_won": 3}
        ],
        "meta": {"generated_at": "2025-10-01T08:00:00Z", "version": "1.0"}
    }'::jsonb)
ON CONFLICT DO NOTHING;

-- 5) FUNZIONI UTILITY (OPZIONALI)
-- =====================================================

-- Funzione per aggiornare updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger per agents
DROP TRIGGER IF EXISTS update_agents_updated_at ON agents;
CREATE TRIGGER update_agents_updated_at
    BEFORE UPDATE ON agents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger per products
DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger per budgets
DROP TRIGGER IF EXISTS update_budgets_updated_at ON budgets;
CREATE TRIGGER update_budgets_updated_at
    BEFORE UPDATE ON budgets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger per sales
DROP TRIGGER IF EXISTS update_sales_updated_at ON sales;
CREATE TRIGGER update_sales_updated_at
    BEFORE UPDATE ON sales
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SETUP COMPLETATO!
-- =====================================================
-- Verifica i dati con:
-- SELECT * FROM agents;
-- SELECT * FROM products;
-- SELECT * FROM budgets WHERE ym = '2025-10' LIMIT 10;
-- SELECT * FROM sales WHERE ym = '2025-10' LIMIT 10;
-- SELECT * FROM commission_rules_general;
-- =====================================================
