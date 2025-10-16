# Budget & Provvigioni - MVP

Web app minimale per monitorare Budget vs Consuntivo e calcolare provvigioni per agenti commerciali.

## 🚀 Quick Start

### 1. Setup Supabase

1. Crea un nuovo progetto su [Supabase](https://supabase.com)
2. Nel pannello SQL Editor, esegui lo script `supabase-setup.sql`
3. Verifica che le tabelle siano state create correttamente
4. Recupera le credenziali:
   - **Project URL**: Settings → API → Project URL
   - **Anon Key**: Settings → API → Project API keys → `anon` `public`

### 2. Deploy su Netlify

#### Opzione A: Drag & Drop
1. Vai su [Netlify](https://www.netlify.com)
2. Trascina la cartella del progetto nell'area "Deploy"
3. Attendi il completamento del deploy

#### Opzione B: Git
1. Crea un repository Git
2. Push del codice
3. Connetti il repository a Netlify
4. Deploy automatico

### 3. Configurazione App

1. Apri l'app nel browser
2. Inserisci le credenziali Supabase nella schermata di configurazione:
   - **Supabase URL**: `https://xxxxx.supabase.co`
   - **Supabase Anon Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
3. Clicca "Salva Configurazione"
4. L'app si apre automaticamente con i dati demo già caricati!

## 📊 Dati Demo

Lo script SQL include già dati demo per:
- **8 agenti** (3 aree: Nord, Centro, Sud)
- **8 prodotti** (3 categorie: Premium, Standard, Economy)
- **Budget e vendite** per ottobre 2025 e settembre 2025
- **Regola provvigioni** attiva con 4 scaglioni
- **KPI appuntamenti** di esempio

Puoi iniziare subito a esplorare l'app con questi dati!

## 📁 Struttura Progetto

```
budget-provvigioni-app/
├── index.html              # Entry point, struttura HTML
├── styles.css              # Stile Stripe-inspired
├── app.js                  # Logica applicativa completa
├── supabase-setup.sql      # Script SQL per database
└── README.md               # Questo file
```

## 🎯 Funzionalità

### Dashboard
- **KPI Header**: Totale venduto, budget, target medio, provvigioni
- **Filtri dinamici**: Per mese, agente, area, prodotto
- **Grafici**:
  - Budget vs Venduto (top 10 agenti)
  - % Target per agente
- **Tabelle**:
  - Riepilogo per agente (con provvigioni calcolate)
  - Dettaglio agente × prodotto
- **Export CSV**: Esportazione risultati filtrati

### Import Dati
- **CSV Budget**: Upload e importazione con preview
- **CSV Sales**: Upload con gestione `external_ref` per dedup
- **JSON KPI**: Importazione KPI appuntamenti (solo archiviazione)
- **Auto-creazione**: Prompt per creare agenti/prodotti mancanti

### Regole Provvigioni
- **Editor JSON** per definire scaglioni
- **Validazione automatica** della struttura tiers
- **Storico regole** salvate
- Calcolo provvigioni basato su **prezzo medio agente**

### Anagrafiche
- **CRUD Agenti**: Inline editing per nome e area
- **CRUD Prodotti**: Inline editing per nome e categoria
- **Soft disable**: Toggle "Attivo" senza eliminazione fisica

## 📝 Formati Import

### CSV Budget
```csv
ym,agent_code,product_code,qty,amount
2025-10,AGT-001,PRD-A,120,48000
2025-10,AGT-001,PRD-B,85,6800
```

### CSV Sales
```csv
ym,agent_code,product_code,qty,amount,source,external_ref
2025-10,AGT-001,PRD-A,100,41000,ERP,FA-000123
2025-10,AGT-002,PRD-B,95,7600,ERP,FA-000124
```

### JSON KPI
```json
{
  "source": "crm-x",
  "period": "2025-10",
  "items": [
    {
      "agent_code": "AGT-001",
      "meetings_total": 42,
      "meetings_held": 33,
      "deals_won": 4
    }
  ],
  "meta": {
    "generated_at": "2025-10-01T08:00:00Z",
    "version": "1.0"
  }
}
```

## 🔧 Configurazione Provvigioni

### Struttura Tiers

```json
[
  {
    "min_avg_price": 0,
    "max_avg_price": 50,
    "rate": 0.015
  },
  {
    "min_avg_price": 50,
    "max_avg_price": 100,
    "rate": 0.020
  },
  {
    "min_avg_price": 100,
    "max_avg_price": 150,
    "rate": 0.025
  },
  {
    "min_avg_price": 150,
    "max_avg_price": null,
    "rate": 0.030
  }
]
```

**Regole di validazione**:
- Array non vuoto
- `min_avg_price` crescenti
- `rate` tra 0 e 1
- Ultimo tier con `max_avg_price = null`

### Calcolo Provvigioni

1. **Prezzo medio agente** = Σ sales.amount / Σ sales.qty
2. **Trova tier** corrispondente al prezzo medio
3. **Provvigione** = sales.amount × tier.rate

## 🎨 Design System

### Colori (stile Stripe)
- **Primary**: `#635bff` (viola Stripe)
- **Secondary**: `#0a2540` (navy)
- **Accent**: `#00d4ff` (cyan)
- **Success**: `#10b981`
- **Background**: `#f6f9fc`
- **Sidebar**: `#1a1f36`

### Icone
Usa [Lucide Icons](https://lucide.dev) per tutte le icone

## 🔐 Sicurezza

- **Accesso aperto** - Nessuna autenticazione richiesta (uso interno)
- **RLS disabilitato** - Per semplicità MVP
- Configura le credenziali Supabase solo al primo accesso
- Per uso in produzione, considera di abilitare autenticazione

⚠️ **Nota**: Questa configurazione è ideale per uso interno/demo. Per ambienti di produzione con dati sensibili, abilita l'autenticazione e RLS.

## 🐛 Troubleshooting

### "Errore nella configurazione di Supabase"
- Verifica che URL e Key siano corretti
- Assicurati che il progetto Supabase sia attivo

### "Nessun dato caricato"
- Verifica che lo script `supabase-setup.sql` sia stato eseguito correttamente
- Controlla nella console SQL di Supabase: `SELECT * FROM agents;`
- Dovresti vedere 8 agenti

### Import fallisce
- Controlla che il formato CSV sia corretto (header + dati)
- Verifica encoding UTF-8
- Controlla console browser (F12) per errori specifici

## 📞 Supporto

Per domande o problemi:
1. Controlla la console browser (F12) per errori
2. Verifica i log Supabase (Logs → SQL Queries)
3. Controlla che tutte le tabelle abbiano le RLS policies attive

## 🚀 Next Steps (Post-MVP)

Funzionalità pianificate per versioni future:
- Override provvigioni per area/agente
- Snapshot mensili con storicizzazione
- Multi-ruolo (manager vs agenti)
- Dashboard personalizzabili
- API webhook per import automatici
- Notifiche email/Slack

## 📄 Licenza

Progetto interno - Uso riservato all'azienda

---

**Versione**: 1.0  
**Data**: 16 Ottobre 2025  
**Owner**: Carlo (CIO)
