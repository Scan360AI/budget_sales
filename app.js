// =====================================================
// Budget & Provvigioni - Main App Logic
// =====================================================

// Global State
let supabase = null;
let currentUser = null;
let appData = {
    agents: [],
    products: [],
    months: [],
    budgets: [],
    sales: [],
    commissionRules: [],
    filteredData: null
};

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

function initializeApp() {
    // Check for Supabase config
    const config = getSupabaseConfig();
    
    if (!config.url || !config.key) {
        showSupabaseConfigModal();
    } else {
        initializeSupabase(config.url, config.key);
        checkAuth();
    }
    
    setupEventListeners();
}

// ===== SUPABASE CONFIGURATION =====
function getSupabaseConfig() {
    return {
        url: localStorage.getItem('supabase_url') || '',
        key: localStorage.getItem('supabase_key') || ''
    };
}

function saveSupabaseConfig(url, key) {
    localStorage.setItem('supabase_url', url);
    localStorage.setItem('supabase_key', key);
}

function initializeSupabase(url, key) {
    try {
        supabase = window.supabase.createClient(url, key);
    } catch (error) {
        showToast('Errore nella configurazione di Supabase', 'error');
        showSupabaseConfigModal();
    }
}

function showSupabaseConfigModal() {
    const modal = document.getElementById('supabaseConfigModal');
    const urlInput = document.getElementById('supabaseUrl');
    const keyInput = document.getElementById('supabaseKey');
    
    const config = getSupabaseConfig();
    urlInput.value = config.url;
    keyInput.value = config.key;
    
    modal.classList.remove('hidden');
}

function hideSupabaseConfigModal() {
    document.getElementById('supabaseConfigModal').classList.add('hidden');
}

// ===== AUTHENTICATION =====
async function checkAuth() {
    showLoading();
    
    try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
            currentUser = session.user;
            showApp();
            await loadAllData();
        } else {
            showLogin();
        }
    } catch (error) {
        console.error('Auth check error:', error);
        showToast('Errore di autenticazione', 'error');
        showLogin();
    } finally {
        hideLoading();
    }
}

async function sendMagicLink(email) {
    showLoading();
    
    try {
        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: {
                emailRedirectTo: window.location.origin
            }
        });
        
        if (error) throw error;
        
        document.getElementById('loginMessage').textContent = 
            'Magic link inviato! Controlla la tua email.';
        document.getElementById('loginMessage').classList.add('success');
        document.getElementById('loginMessage').classList.remove('hidden');
        
        showToast('Magic link inviato con successo', 'success');
    } catch (error) {
        console.error('Magic link error:', error);
        showToast('Errore nell\'invio del magic link: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

async function logout() {
    showLoading();
    
    try {
        await supabase.auth.signOut();
        currentUser = null;
        showLogin();
        showToast('Logout effettuato', 'success');
    } catch (error) {
        showToast('Errore nel logout', 'error');
    } finally {
        hideLoading();
    }
}

function showLogin() {
    document.getElementById('loginScreen').classList.remove('hidden');
    document.getElementById('appLayout').classList.add('hidden');
}

function showApp() {
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('appLayout').classList.remove('hidden');
    
    if (currentUser) {
        document.getElementById('userInfo').textContent = currentUser.email;
    }
}

// ===== DATA LOADING =====
async function loadAllData() {
    showLoading();
    
    try {
        await Promise.all([
            loadAgents(),
            loadProducts(),
            loadMonths(),
            loadBudgets(),
            loadSales(),
            loadCommissionRules()
        ]);
        
        populateFilters();
        renderAgentsCRUD();
        renderProductsCRUD();
        renderCommissionRules();
        applyFilters(); // Load dashboard with default filters
    } catch (error) {
        console.error('Data loading error:', error);
        showToast('Errore nel caricamento dei dati', 'error');
    } finally {
        hideLoading();
    }
}

async function loadAgents() {
    const { data, error } = await supabase
        .from('agents')
        .select('*')
        .order('code');
    
    if (error) throw error;
    appData.agents = data || [];
}

async function loadProducts() {
    const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('code');
    
    if (error) throw error;
    appData.products = data || [];
}

async function loadMonths() {
    const { data, error } = await supabase
        .from('months')
        .select('*')
        .order('ym', { ascending: false });
    
    if (error) throw error;
    appData.months = data || [];
}

async function loadBudgets() {
    const { data, error } = await supabase
        .from('budgets')
        .select('*');
    
    if (error) throw error;
    appData.budgets = data || [];
}

async function loadSales() {
    const { data, error } = await supabase
        .from('sales')
        .select('*');
    
    if (error) throw error;
    appData.sales = data || [];
}

async function loadCommissionRules() {
    const { data, error } = await supabase
        .from('commission_rules_general')
        .select('*')
        .order('valid_from', { ascending: false });
    
    if (error) throw error;
    appData.commissionRules = data || [];
}

// ===== FILTERS & DASHBOARD =====
function populateFilters() {
    // Month filter
    const monthSelect = document.getElementById('filterMonth');
    monthSelect.innerHTML = appData.months.map(m => 
        `<option value="${m.ym}">${m.ym}</option>`
    ).join('');
    
    // Set default to current month or latest
    if (appData.months.length > 0) {
        monthSelect.value = appData.months[0].ym;
    }
    
    // Agent filter
    const agentSelect = document.getElementById('filterAgent');
    agentSelect.innerHTML = appData.agents
        .filter(a => a.is_active)
        .map(a => `<option value="${a.id}">${a.name}</option>`)
        .join('');
    
    // Area filter
    const areas = [...new Set(appData.agents.map(a => a.area).filter(Boolean))];
    const areaSelect = document.getElementById('filterArea');
    areaSelect.innerHTML = areas.map(area => 
        `<option value="${area}">${area}</option>`
    ).join('');
    
    // Product filter
    const productSelect = document.getElementById('filterProduct');
    productSelect.innerHTML = appData.products
        .filter(p => p.is_active)
        .map(p => `<option value="${p.id}">${p.name}</option>`)
        .join('');
}

function getSelectedFilters() {
    const monthSelect = document.getElementById('filterMonth');
    const agentSelect = document.getElementById('filterAgent');
    const areaSelect = document.getElementById('filterArea');
    const productSelect = document.getElementById('filterProduct');
    
    return {
        month: monthSelect.value,
        agents: Array.from(agentSelect.selectedOptions).map(o => o.value),
        areas: Array.from(areaSelect.selectedOptions).map(o => o.value),
        products: Array.from(productSelect.selectedOptions).map(o => o.value)
    };
}

function applyFilters() {
    const filters = getSelectedFilters();
    
    // Filter budgets
    let filteredBudgets = appData.budgets.filter(b => {
        if (b.ym !== filters.month) return false;
        if (filters.agents.length && !filters.agents.includes(b.agent_id)) return false;
        if (filters.products.length && !filters.products.includes(b.product_id)) return false;
        
        // Check area filter
        if (filters.areas.length) {
            const agent = appData.agents.find(a => a.id === b.agent_id);
            if (!agent || !filters.areas.includes(agent.area)) return false;
        }
        
        return true;
    });
    
    // Filter sales
    let filteredSales = appData.sales.filter(s => {
        if (s.ym !== filters.month) return false;
        if (filters.agents.length && !filters.agents.includes(s.agent_id)) return false;
        if (filters.products.length && !filters.products.includes(s.product_id)) return false;
        
        // Check area filter
        if (filters.areas.length) {
            const agent = appData.agents.find(a => a.id === s.agent_id);
            if (!agent || !filters.areas.includes(agent.area)) return false;
        }
        
        return true;
    });
    
    appData.filteredData = { budgets: filteredBudgets, sales: filteredSales };
    
    renderDashboard();
}

function renderDashboard() {
    const { budgets, sales } = appData.filteredData;
    
    // Calculate aggregated data by agent
    const agentData = calculateAgentData(budgets, sales);
    
    // Calculate KPIs
    const totalBudget = agentData.reduce((sum, a) => sum + a.budget_amount, 0);
    const totalSales = agentData.reduce((sum, a) => sum + a.sales_amount, 0);
    const avgTarget = totalBudget > 0 ? (totalSales / totalBudget * 100) : 0;
    const totalCommissions = agentData.reduce((sum, a) => sum + a.commission, 0);
    
    // Update KPI cards
    document.getElementById('kpiTotalSales').textContent = formatCurrency(totalSales);
    document.getElementById('kpiTotalBudget').textContent = formatCurrency(totalBudget);
    document.getElementById('kpiAvgTarget').textContent = formatPercent(avgTarget);
    document.getElementById('kpiTotalCommissions').textContent = formatCurrency(totalCommissions);
    
    // Render tables
    renderAgentsTable(agentData);
    renderProductsTable(budgets, sales);
    
    // Render charts
    renderCharts(agentData);
}

function calculateAgentData(budgets, sales) {
    const agentMap = new Map();
    
    // Aggregate budgets by agent
    budgets.forEach(b => {
        if (!agentMap.has(b.agent_id)) {
            const agent = appData.agents.find(a => a.id === b.agent_id);
            agentMap.set(b.agent_id, {
                agent_id: b.agent_id,
                agent_code: agent?.code || '',
                agent_name: agent?.name || '',
                area: agent?.area || '',
                budget_amount: 0,
                sales_amount: 0,
                sales_qty: 0
            });
        }
        
        const data = agentMap.get(b.agent_id);
        data.budget_amount += parseFloat(b.amount);
    });
    
    // Aggregate sales by agent
    sales.forEach(s => {
        if (!agentMap.has(s.agent_id)) {
            const agent = appData.agents.find(a => a.id === s.agent_id);
            agentMap.set(s.agent_id, {
                agent_id: s.agent_id,
                agent_code: agent?.code || '',
                agent_name: agent?.name || '',
                area: agent?.area || '',
                budget_amount: 0,
                sales_amount: 0,
                sales_qty: 0
            });
        }
        
        const data = agentMap.get(s.agent_id);
        data.sales_amount += parseFloat(s.amount);
        data.sales_qty += parseFloat(s.qty);
    });
    
    // Calculate derived metrics
    const agentData = Array.from(agentMap.values()).map(a => {
        const avg_price = a.sales_qty > 0 ? a.sales_amount / a.sales_qty : 0;
        const rate = getCommissionRate(avg_price);
        const commission = a.sales_amount * rate;
        const target_pct = a.budget_amount > 0 ? (a.sales_amount / a.budget_amount * 100) : 0;
        const scostamento = a.sales_amount - a.budget_amount;
        
        return {
            ...a,
            avg_price,
            rate,
            commission,
            target_pct,
            scostamento
        };
    });
    
    return agentData.sort((a, b) => b.sales_amount - a.sales_amount);
}

function getCommissionRate(avgPrice) {
    // Get active commission rule
    const filters = getSelectedFilters();
    const monthDate = new Date(filters.month + '-01');
    
    const activeRule = appData.commissionRules.find(r => {
        const validFrom = new Date(r.valid_from);
        const validTo = r.valid_to ? new Date(r.valid_to) : null;
        
        return validFrom <= monthDate && (!validTo || validTo >= monthDate);
    });
    
    if (!activeRule || !activeRule.tiers) return 0;
    
    // Find matching tier
    const tier = activeRule.tiers.find(t => {
        return avgPrice >= t.min_avg_price && 
               (t.max_avg_price === null || avgPrice < t.max_avg_price);
    });
    
    return tier ? tier.rate : 0;
}

function renderAgentsTable(agentData) {
    const tbody = document.getElementById('agentsTableBody');
    
    tbody.innerHTML = agentData.map(a => `
        <tr>
            <td>${escapeHtml(a.agent_name)}</td>
            <td>${escapeHtml(a.area || '-')}</td>
            <td class="number">${formatCurrency(a.budget_amount)}</td>
            <td class="number">${formatCurrency(a.sales_amount)}</td>
            <td class="number">${formatPercent(a.target_pct)}</td>
            <td class="number ${a.scostamento >= 0 ? 'positive' : 'negative'}">
                ${formatCurrency(a.scostamento)}
            </td>
            <td class="number">${formatCurrency(a.avg_price)}</td>
            <td class="number">${formatPercent(a.rate * 100)}</td>
            <td class="number">${formatCurrency(a.commission)}</td>
        </tr>
    `).join('');
}

function renderProductsTable(budgets, sales) {
    const tbody = document.getElementById('productsTableBody');
    
    // Create map of agent x product
    const rows = [];
    
    budgets.forEach(b => {
        const agent = appData.agents.find(a => a.id === b.agent_id);
        const product = appData.products.find(p => p.id === b.product_id);
        const sale = sales.find(s => s.agent_id === b.agent_id && s.product_id === b.product_id);
        
        const budget_qty = parseFloat(b.qty);
        const budget_amount = parseFloat(b.amount);
        const sales_qty = sale ? parseFloat(sale.qty) : 0;
        const sales_amount = sale ? parseFloat(sale.amount) : 0;
        const target_pct = budget_amount > 0 ? (sales_amount / budget_amount * 100) : 0;
        const scostamento = sales_amount - budget_amount;
        const avg_price = sales_qty > 0 ? sales_amount / sales_qty : 0;
        
        rows.push({
            agent_name: agent?.name || '',
            product_name: product?.name || '',
            budget_qty,
            budget_amount,
            sales_qty,
            sales_amount,
            target_pct,
            scostamento,
            avg_price
        });
    });
    
    tbody.innerHTML = rows.map(r => `
        <tr>
            <td>${escapeHtml(r.agent_name)}</td>
            <td>${escapeHtml(r.product_name)}</td>
            <td class="number">${formatNumber(r.budget_qty)}</td>
            <td class="number">${formatCurrency(r.budget_amount)}</td>
            <td class="number">${formatNumber(r.sales_qty)}</td>
            <td class="number">${formatCurrency(r.sales_amount)}</td>
            <td class="number">${formatPercent(r.target_pct)}</td>
            <td class="number ${r.scostamento >= 0 ? 'positive' : 'negative'}">
                ${formatCurrency(r.scostamento)}
            </td>
            <td class="number">${formatCurrency(r.avg_price)}</td>
        </tr>
    `).join('');
}

// ===== CHARTS =====
let chartBudgetVsSales = null;
let chartTargetPercentage = null;

function renderCharts(agentData) {
    // Top 10 agents
    const top10 = agentData.slice(0, 10);
    
    // Budget vs Sales chart
    const ctxBudget = document.getElementById('chartBudgetVsSales');
    if (chartBudgetVsSales) chartBudgetVsSales.destroy();
    
    chartBudgetVsSales = new Chart(ctxBudget, {
        type: 'bar',
        data: {
            labels: top10.map(a => a.agent_name),
            datasets: [
                {
                    label: 'Budget',
                    data: top10.map(a => a.budget_amount),
                    backgroundColor: '#00d4ff80',
                    borderColor: '#00d4ff',
                    borderWidth: 1
                },
                {
                    label: 'Venduto',
                    data: top10.map(a => a.sales_amount),
                    backgroundColor: '#635bff80',
                    borderColor: '#635bff',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'top'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: value => '€' + value.toLocaleString('it-IT')
                    }
                }
            }
        }
    });
    
    // Target percentage chart
    const ctxTarget = document.getElementById('chartTargetPercentage');
    if (chartTargetPercentage) chartTargetPercentage.destroy();
    
    chartTargetPercentage = new Chart(ctxTarget, {
        type: 'bar',
        data: {
            labels: top10.map(a => a.agent_name),
            datasets: [{
                label: '% Target',
                data: top10.map(a => a.target_pct),
                backgroundColor: top10.map(a => a.target_pct >= 100 ? '#10b98180' : '#f59e0b80'),
                borderColor: top10.map(a => a.target_pct >= 100 ? '#10b981' : '#f59e0b'),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: value => value + '%'
                    }
                }
            }
        }
    });
}

// ===== EXPORT CSV =====
function exportCSV() {
    const filters = getSelectedFilters();
    const { budgets, sales } = appData.filteredData;
    const agentData = calculateAgentData(budgets, sales);
    
    // Create CSV header
    const headers = [
        'ym', 'agent_code', 'agent_name', 'area', 'budget_amount', 
        'sales_amount', 'achievement_pct', 'avg_price_agent', 'rate', 
        'commission', 'scostamento'
    ];
    
    // Create CSV rows
    const rows = agentData.map(a => [
        filters.month,
        a.agent_code,
        a.agent_name,
        a.area || '',
        a.budget_amount.toFixed(2),
        a.sales_amount.toFixed(2),
        a.target_pct.toFixed(2),
        a.avg_price.toFixed(2),
        a.rate.toFixed(4),
        a.commission.toFixed(2),
        a.scostamento.toFixed(2)
    ]);
    
    // Build CSV content
    const csv = [headers, ...rows]
        .map(row => row.join(','))
        .join('\n');
    
    // Download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `export_agenti_${filters.month}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    
    showToast('Export completato', 'success');
}

// ===== AGENTS CRUD =====
function renderAgentsCRUD() {
    const tbody = document.getElementById('agentsCrudTableBody');
    
    tbody.innerHTML = appData.agents.map(a => `
        <tr>
            <td>${escapeHtml(a.code)}</td>
            <td contenteditable="true" data-id="${a.id}" data-field="name">
                ${escapeHtml(a.name)}
            </td>
            <td contenteditable="true" data-id="${a.id}" data-field="area">
                ${escapeHtml(a.area || '')}
            </td>
            <td>
                <input type="checkbox" 
                       ${a.is_active ? 'checked' : ''} 
                       data-id="${a.id}" 
                       data-field="is_active" />
            </td>
            <td>
                <button class="btn btn-sm btn-danger" onclick="deleteAgent('${a.id}')">
                    <i data-lucide="trash-2"></i>
                </button>
            </td>
        </tr>
    `).join('');
    
    // Re-initialize Lucide icons
    lucide.createIcons();
    
    // Add blur event listeners for inline editing
    tbody.querySelectorAll('[contenteditable]').forEach(cell => {
        cell.addEventListener('blur', handleAgentEdit);
    });
    
    tbody.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', handleAgentEdit);
    });
}

async function handleAgentEdit(event) {
    const element = event.target;
    const id = element.dataset.id;
    const field = element.dataset.field;
    const value = element.tagName === 'INPUT' ? element.checked : element.textContent.trim();
    
    try {
        const { error } = await supabase
            .from('agents')
            .update({ [field]: value })
            .eq('id', id);
        
        if (error) throw error;
        
        // Update local data
        const agent = appData.agents.find(a => a.id === id);
        if (agent) agent[field] = value;
        
        showToast('Agente aggiornato', 'success');
    } catch (error) {
        console.error('Agent update error:', error);
        showToast('Errore nell\'aggiornamento', 'error');
        renderAgentsCRUD(); // Revert
    }
}

async function addAgent() {
    const code = prompt('Codice agente:');
    if (!code) return;
    
    const name = prompt('Nome agente:');
    if (!name) return;
    
    const area = prompt('Area (opzionale):') || null;
    
    try {
        const { data, error } = await supabase
            .from('agents')
            .insert([{ code, name, area, is_active: true }])
            .select();
        
        if (error) throw error;
        
        appData.agents.push(data[0]);
        renderAgentsCRUD();
        populateFilters();
        showToast('Agente creato', 'success');
    } catch (error) {
        console.error('Agent creation error:', error);
        showToast('Errore nella creazione: ' + error.message, 'error');
    }
}

async function deleteAgent(id) {
    if (!confirm('Eliminare questo agente?')) return;
    
    try {
        const { error } = await supabase
            .from('agents')
            .delete()
            .eq('id', id);
        
        if (error) throw error;
        
        appData.agents = appData.agents.filter(a => a.id !== id);
        renderAgentsCRUD();
        populateFilters();
        showToast('Agente eliminato', 'success');
    } catch (error) {
        console.error('Agent deletion error:', error);
        showToast('Errore nell\'eliminazione: ' + error.message, 'error');
    }
}

// ===== PRODUCTS CRUD =====
function renderProductsCRUD() {
    const tbody = document.getElementById('productsCrudTableBody');
    
    tbody.innerHTML = appData.products.map(p => `
        <tr>
            <td>${escapeHtml(p.code)}</td>
            <td contenteditable="true" data-id="${p.id}" data-field="name">
                ${escapeHtml(p.name)}
            </td>
            <td contenteditable="true" data-id="${p.id}" data-field="category">
                ${escapeHtml(p.category || '')}
            </td>
            <td>
                <input type="checkbox" 
                       ${p.is_active ? 'checked' : ''} 
                       data-id="${p.id}" 
                       data-field="is_active" />
            </td>
            <td>
                <button class="btn btn-sm btn-danger" onclick="deleteProduct('${p.id}')">
                    <i data-lucide="trash-2"></i>
                </button>
            </td>
        </tr>
    `).join('');
    
    lucide.createIcons();
    
    tbody.querySelectorAll('[contenteditable]').forEach(cell => {
        cell.addEventListener('blur', handleProductEdit);
    });
    
    tbody.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', handleProductEdit);
    });
}

async function handleProductEdit(event) {
    const element = event.target;
    const id = element.dataset.id;
    const field = element.dataset.field;
    const value = element.tagName === 'INPUT' ? element.checked : element.textContent.trim();
    
    try {
        const { error } = await supabase
            .from('products')
            .update({ [field]: value })
            .eq('id', id);
        
        if (error) throw error;
        
        const product = appData.products.find(p => p.id === id);
        if (product) product[field] = value;
        
        showToast('Prodotto aggiornato', 'success');
    } catch (error) {
        console.error('Product update error:', error);
        showToast('Errore nell\'aggiornamento', 'error');
        renderProductsCRUD();
    }
}

async function addProduct() {
    const code = prompt('Codice prodotto:');
    if (!code) return;
    
    const name = prompt('Nome prodotto:');
    if (!name) return;
    
    const category = prompt('Categoria (opzionale):') || null;
    
    try {
        const { data, error } = await supabase
            .from('products')
            .insert([{ code, name, category, is_active: true }])
            .select();
        
        if (error) throw error;
        
        appData.products.push(data[0]);
        renderProductsCRUD();
        populateFilters();
        showToast('Prodotto creato', 'success');
    } catch (error) {
        console.error('Product creation error:', error);
        showToast('Errore nella creazione: ' + error.message, 'error');
    }
}

async function deleteProduct(id) {
    if (!confirm('Eliminare questo prodotto?')) return;
    
    try {
        const { error } = await supabase
            .from('products')
            .delete()
            .eq('id', id);
        
        if (error) throw error;
        
        appData.products = appData.products.filter(p => p.id !== id);
        renderProductsCRUD();
        populateFilters();
        showToast('Prodotto eliminato', 'success');
    } catch (error) {
        console.error('Product deletion error:', error);
        showToast('Errore nell\'eliminazione: ' + error.message, 'error');
    }
}

// ===== IMPORT CSV =====
let budgetData = null;
let salesData = null;

function handleBudgetFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
            budgetData = results.data;
            displayPreview('budgetPreview', results.data, 10);
            document.getElementById('importBudgetBtn').classList.remove('hidden');
        },
        error: (error) => {
            showToast('Errore nel parsing CSV: ' + error.message, 'error');
        }
    });
}

function handleSalesFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
            salesData = results.data;
            displayPreview('salesPreview', results.data, 10);
            document.getElementById('importSalesBtn').classList.remove('hidden');
        },
        error: (error) => {
            showToast('Errore nel parsing CSV: ' + error.message, 'error');
        }
    });
}

function displayPreview(containerId, data, limit) {
    const container = document.getElementById(containerId);
    const preview = data.slice(0, limit);
    
    if (preview.length === 0) {
        container.innerHTML = '<p class="text-muted">Nessun dato trovato</p>';
        container.classList.remove('hidden');
        return;
    }
    
    const headers = Object.keys(preview[0]);
    
    const table = `
        <table>
            <thead>
                <tr>${headers.map(h => `<th>${escapeHtml(h)}</th>`).join('')}</tr>
            </thead>
            <tbody>
                ${preview.map(row => `
                    <tr>${headers.map(h => `<td>${escapeHtml(String(row[h] || ''))}</td>`).join('')}</tr>
                `).join('')}
            </tbody>
        </table>
        <p class="text-muted" style="margin-top: 8px;">
            Anteprima ${preview.length} righe di ${data.length} totali
        </p>
    `;
    
    container.innerHTML = table;
    container.classList.remove('hidden');
}

async function importBudget() {
    if (!budgetData) return;
    
    showLoading();
    
    try {
        const processedData = [];
        
        for (const row of budgetData) {
            // Validate row
            if (!row.ym || !row.agent_code || !row.product_code || !row.qty || !row.amount) {
                console.warn('Skipping invalid row:', row);
                continue;
            }
            
            // Find or create agent
            let agent = appData.agents.find(a => a.code === row.agent_code);
            if (!agent) {
                const createAgent = confirm(`Agente ${row.agent_code} non trovato. Crearlo?`);
                if (createAgent) {
                    const { data, error } = await supabase
                        .from('agents')
                        .insert([{ 
                            code: row.agent_code, 
                            name: row.agent_code,
                            is_active: true 
                        }])
                        .select();
                    
                    if (error) throw error;
                    agent = data[0];
                    appData.agents.push(agent);
                } else {
                    continue;
                }
            }
            
            // Find or create product
            let product = appData.products.find(p => p.code === row.product_code);
            if (!product) {
                const createProduct = confirm(`Prodotto ${row.product_code} non trovato. Crearlo?`);
                if (createProduct) {
                    const { data, error } = await supabase
                        .from('products')
                        .insert([{ 
                            code: row.product_code, 
                            name: row.product_code,
                            is_active: true 
                        }])
                        .select();
                    
                    if (error) throw error;
                    product = data[0];
                    appData.products.push(product);
                } else {
                    continue;
                }
            }
            
            // Ensure month exists
            const monthExists = appData.months.find(m => m.ym === row.ym);
            if (!monthExists) {
                await supabase.from('months').insert([{ ym: row.ym }]);
                appData.months.push({ ym: row.ym });
            }
            
            processedData.push({
                ym: row.ym,
                agent_id: agent.id,
                product_id: product.id,
                qty: parseFloat(row.qty),
                amount: parseFloat(row.amount)
            });
        }
        
        // Upsert budgets
        if (processedData.length > 0) {
            const { error } = await supabase
                .from('budgets')
                .upsert(processedData, { 
                    onConflict: 'ym,agent_id,product_id',
                    ignoreDuplicates: false 
                });
            
            if (error) throw error;
        }
        
        await loadBudgets();
        populateFilters();
        applyFilters();
        
        showToast(`Importati ${processedData.length} budget`, 'success');
        logImport('Budget', processedData.length);
        
        // Reset
        budgetData = null;
        document.getElementById('budgetFileInput').value = '';
        document.getElementById('budgetPreview').classList.add('hidden');
        document.getElementById('importBudgetBtn').classList.add('hidden');
    } catch (error) {
        console.error('Budget import error:', error);
        showToast('Errore nell\'import: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

async function importSales() {
    if (!salesData) return;
    
    showLoading();
    
    try {
        const processedData = [];
        
        for (const row of salesData) {
            if (!row.ym || !row.agent_code || !row.product_code || !row.qty || !row.amount) {
                console.warn('Skipping invalid row:', row);
                continue;
            }
            
            let agent = appData.agents.find(a => a.code === row.agent_code);
            if (!agent) {
                const createAgent = confirm(`Agente ${row.agent_code} non trovato. Crearlo?`);
                if (createAgent) {
                    const { data, error } = await supabase
                        .from('agents')
                        .insert([{ 
                            code: row.agent_code, 
                            name: row.agent_code,
                            is_active: true 
                        }])
                        .select();
                    
                    if (error) throw error;
                    agent = data[0];
                    appData.agents.push(agent);
                } else {
                    continue;
                }
            }
            
            let product = appData.products.find(p => p.code === row.product_code);
            if (!product) {
                const createProduct = confirm(`Prodotto ${row.product_code} non trovato. Crearlo?`);
                if (createProduct) {
                    const { data, error } = await supabase
                        .from('products')
                        .insert([{ 
                            code: row.product_code, 
                            name: row.product_code,
                            is_active: true 
                        }])
                        .select();
                    
                    if (error) throw error;
                    product = data[0];
                    appData.products.push(product);
                } else {
                    continue;
                }
            }
            
            const monthExists = appData.months.find(m => m.ym === row.ym);
            if (!monthExists) {
                await supabase.from('months').insert([{ ym: row.ym }]);
                appData.months.push({ ym: row.ym });
            }
            
            processedData.push({
                ym: row.ym,
                agent_id: agent.id,
                product_id: product.id,
                qty: parseFloat(row.qty),
                amount: parseFloat(row.amount),
                source: row.source || null,
                external_ref: row.external_ref || null
            });
        }
        
        if (processedData.length > 0) {
            const { error } = await supabase
                .from('sales')
                .insert(processedData);
            
            if (error) throw error;
        }
        
        await loadSales();
        applyFilters();
        
        showToast(`Importate ${processedData.length} vendite`, 'success');
        logImport('Sales', processedData.length);
        
        salesData = null;
        document.getElementById('salesFileInput').value = '';
        document.getElementById('salesPreview').classList.add('hidden');
        document.getElementById('importSalesBtn').classList.add('hidden');
    } catch (error) {
        console.error('Sales import error:', error);
        showToast('Errore nell\'import: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

// ===== IMPORT JSON KPI =====
function handleKpiFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const json = JSON.parse(e.target.result);
            
            // Display preview
            const container = document.getElementById('kpiPreview');
            container.innerHTML = `<pre>${JSON.stringify(json, null, 2).substring(0, 500)}...</pre>`;
            container.classList.remove('hidden');
            
            document.getElementById('importKpiBtn').classList.remove('hidden');
            document.getElementById('importKpiBtn').onclick = () => importKpi(json);
        } catch (error) {
            showToast('Errore nel parsing JSON: ' + error.message, 'error');
        }
    };
    reader.readAsText(file);
}

async function importKpi(payload) {
    showLoading();
    
    try {
        const { error } = await supabase
            .from('appointments_kpi_raw')
            .insert([{
                period: payload.period || 'unknown',
                source: payload.source || 'unknown',
                payload: payload
            }]);
        
        if (error) throw error;
        
        showToast('KPI importato con successo', 'success');
        logImport('KPI JSON', 1);
        
        document.getElementById('kpiFileInput').value = '';
        document.getElementById('kpiPreview').classList.add('hidden');
        document.getElementById('importKpiBtn').classList.add('hidden');
    } catch (error) {
        console.error('KPI import error:', error);
        showToast('Errore nell\'import: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

function logImport(type, count) {
    const history = document.getElementById('importHistory');
    
    const log = document.createElement('div');
    log.className = 'import-log';
    log.innerHTML = `
        <strong>${type}</strong><br>
        ${count} record importati<br>
        <small>${new Date().toLocaleString('it-IT')}</small>
    `;
    
    history.prepend(log);
    
    // Remove "no imports" message if present
    const noImports = history.querySelector('.text-muted');
    if (noImports) noImports.remove();
}

// ===== COMMISSION RULES =====
function renderCommissionRules() {
    const tbody = document.getElementById('rulesTableBody');
    
    if (appData.commissionRules.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Nessuna regola salvata</td></tr>';
        return;
    }
    
    tbody.innerHTML = appData.commissionRules.map(r => `
        <tr>
            <td>${r.valid_from}</td>
            <td>${r.valid_to || 'Attiva'}</td>
            <td>${r.currency}</td>
            <td><code style="font-size: 11px;">${JSON.stringify(r.tiers).substring(0, 80)}...</code></td>
            <td>
                <button class="btn btn-sm btn-secondary" onclick="loadRuleForEdit('${r.id}')">
                    <i data-lucide="edit"></i>
                </button>
            </td>
        </tr>
    `).join('');
    
    lucide.createIcons();
}

function loadRuleForEdit(id) {
    const rule = appData.commissionRules.find(r => r.id === id);
    if (!rule) return;
    
    document.getElementById('ruleValidFrom').value = rule.valid_from;
    document.getElementById('tiersEditor').value = JSON.stringify(rule.tiers, null, 2);
    
    // Navigate to rules page
    navigateToPage('rules');
}

function validateTiers() {
    const editor = document.getElementById('tiersEditor');
    const validationDiv = document.getElementById('tiersValidation');
    
    try {
        const tiers = JSON.parse(editor.value);
        
        // Validations
        if (!Array.isArray(tiers) || tiers.length === 0) {
            throw new Error('Tiers deve essere un array non vuoto');
        }
        
        for (let i = 0; i < tiers.length; i++) {
            const tier = tiers[i];
            
            if (typeof tier.min_avg_price !== 'number' || tier.min_avg_price < 0) {
                throw new Error(`Tier ${i}: min_avg_price deve essere >= 0`);
            }
            
            if (tier.max_avg_price !== null && typeof tier.max_avg_price !== 'number') {
                throw new Error(`Tier ${i}: max_avg_price deve essere number o null`);
            }
            
            if (typeof tier.rate !== 'number' || tier.rate < 0 || tier.rate > 1) {
                throw new Error(`Tier ${i}: rate deve essere tra 0 e 1`);
            }
            
            if (i > 0 && tier.min_avg_price <= tiers[i-1].min_avg_price) {
                throw new Error(`Tier ${i}: min_avg_price deve essere crescente`);
            }
        }
        
        // Check last tier has null max
        if (tiers[tiers.length - 1].max_avg_price !== null) {
            throw new Error('L\'ultimo tier deve avere max_avg_price = null');
        }
        
        validationDiv.className = 'validation-message success';
        validationDiv.textContent = '✓ JSON valido';
        validationDiv.classList.remove('hidden');
        
        return true;
    } catch (error) {
        validationDiv.className = 'validation-message error';
        validationDiv.textContent = '✗ ' + error.message;
        validationDiv.classList.remove('hidden');
        
        return false;
    }
}

async function saveCommissionRule() {
    if (!validateTiers()) {
        showToast('Correggi gli errori prima di salvare', 'error');
        return;
    }
    
    const validFrom = document.getElementById('ruleValidFrom').value;
    if (!validFrom) {
        showToast('Inserisci una data di validità', 'error');
        return;
    }
    
    const tiers = JSON.parse(document.getElementById('tiersEditor').value);
    
    showLoading();
    
    try {
        const { error } = await supabase
            .from('commission_rules_general')
            .insert([{
                valid_from: validFrom,
                valid_to: null,
                currency: 'EUR',
                tiers: tiers
            }]);
        
        if (error) throw error;
        
        await loadCommissionRules();
        renderCommissionRules();
        applyFilters(); // Recalculate with new rules
        
        showToast('Regola salvata con successo', 'success');
    } catch (error) {
        console.error('Rule save error:', error);
        showToast('Errore nel salvataggio: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

// ===== NAVIGATION =====
function setupEventListeners() {
    // Config modal
    document.getElementById('saveSupabaseConfig').addEventListener('click', () => {
        const url = document.getElementById('supabaseUrl').value.trim();
        const key = document.getElementById('supabaseKey').value.trim();
        
        if (!url || !key) {
            showToast('Inserisci URL e Key', 'error');
            return;
        }
        
        saveSupabaseConfig(url, key);
        initializeSupabase(url, key);
        hideSupabaseConfigModal();
        checkAuth();
        showToast('Configurazione salvata', 'success');
    });
    
    document.getElementById('toggleKeyVisibility').addEventListener('click', () => {
        const input = document.getElementById('supabaseKey');
        const icon = document.querySelector('#toggleKeyVisibility i');
        
        if (input.type === 'password') {
            input.type = 'text';
            icon.setAttribute('data-lucide', 'eye-off');
        } else {
            input.type = 'password';
            icon.setAttribute('data-lucide', 'eye');
        }
        lucide.createIcons();
    });
    
    document.getElementById('openConfigFromLogin').addEventListener('click', showSupabaseConfigModal);
    document.getElementById('openConfigBtn').addEventListener('click', showSupabaseConfigModal);
    
    // Login
    document.getElementById('loginForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        sendMagicLink(email);
    });
    
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', logout);
    
    // Navigation
    document.querySelectorAll('.nav-item[data-page]').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.dataset.page;
            navigateToPage(page);
        });
    });
    
    // Filters
    document.getElementById('applyFiltersBtn').addEventListener('click', applyFilters);
    
    // Export
    document.getElementById('exportBtn').addEventListener('click', exportCSV);
    
    // Agents CRUD
    document.getElementById('addAgentBtn').addEventListener('click', addAgent);
    
    // Products CRUD
    document.getElementById('addProductBtn').addEventListener('click', addProduct);
    
    // Import
    document.getElementById('budgetFileInput').addEventListener('change', handleBudgetFile);
    document.getElementById('salesFileInput').addEventListener('change', handleSalesFile);
    document.getElementById('kpiFileInput').addEventListener('change', handleKpiFile);
    document.getElementById('importBudgetBtn').addEventListener('click', importBudget);
    document.getElementById('importSalesBtn').addEventListener('click', importSales);
    
    // Rules
    document.getElementById('validateTiersBtn').addEventListener('click', validateTiers);
    document.getElementById('saveRulesBtn').addEventListener('click', saveCommissionRule);
    
    // Set default tiers in editor
    document.getElementById('tiersEditor').value = JSON.stringify([
        {"min_avg_price": 0, "max_avg_price": 50, "rate": 0.015},
        {"min_avg_price": 50, "max_avg_price": 100, "rate": 0.020},
        {"min_avg_price": 100, "max_avg_price": 150, "rate": 0.025},
        {"min_avg_price": 150, "max_avg_price": null, "rate": 0.030}
    ], null, 2);
}

function navigateToPage(pageName) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // Show selected page
    document.getElementById(pageName + 'Page').classList.add('active');
    
    // Update nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`[data-page="${pageName}"]`).classList.add('active');
}

// ===== UTILITIES =====
function showLoading() {
    document.getElementById('loadingOverlay').classList.remove('hidden');
}

function hideLoading() {
    document.getElementById('loadingOverlay').classList.add('hidden');
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i data-lucide="${type === 'success' ? 'check-circle' : type === 'error' ? 'x-circle' : 'alert-circle'}"></i>
        <span>${escapeHtml(message)}</span>
    `;
    
    container.appendChild(toast);
    lucide.createIcons();
    
    setTimeout(() => {
        toast.remove();
    }, 5000);
}

function formatCurrency(value) {
    return '€ ' + parseFloat(value).toLocaleString('it-IT', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function formatNumber(value) {
    return parseFloat(value).toLocaleString('it-IT', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    });
}

function formatPercent(value) {
    return parseFloat(value).toFixed(1) + '%';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Make functions globally accessible
window.deleteAgent = deleteAgent;
window.deleteProduct = deleteProduct;
window.loadRuleForEdit = loadRuleForEdit;
