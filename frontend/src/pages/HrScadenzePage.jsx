import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { ExternalLink, RefreshCw, Search } from 'lucide-react';

const API_BASE = 'http://127.0.0.1:3000';
const tipi = ['', 'DECRETO', 'LIBRETTO_PISTOLA', 'LICENZA_PISTOLA', 'LIBRETTO_FUCILE', 'LICENZA_FUCILE', 'POLIGONO', 'PATENTINO_1', 'PATENTINO_2', 'CARTA_IDENTITA'];
const stati = ['', 'scaduto', 'in_scadenza', 'regolare'];
const origini = ['', 'vigilanza', 'contratto', 'formazione', 'visita_medica', 'documento'];

function HrScadenzePage({ onOpenEmployee, onOpenRinnovo }) {
  const [dashboard, setDashboard] = useState(null);
  const [rows, setRows] = useState([]);
  const [filters, setFilters] = useState({ dipendente: '', matricola: '', tipo: '', stato: '', data_da: '', data_a: '', origine: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadData(nextFilters = filters) {
    setLoading(true);
    setError('');
    try {
      const [dash, list] = await Promise.all([
        axios.get(`${API_BASE}/api/hr/dashboard/scadenze`),
        axios.get(`${API_BASE}/api/hr/scadenze`, { params: nextFilters }),
      ]);
      setDashboard(dash.data);
      setRows(list.data || []);
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Errore nel caricamento scadenze.');
    } finally {
      setLoading(false);
    }
  }

  async function regenerate() {
    await axios.post(`${API_BASE}/api/hr/scadenze/rigenera`);
    await loadData();
  }

  useEffect(() => {
    loadData();
  }, []);

  return (
    <>
      <header className="page-header">
        <div>
          <h1>Scadenzario Vigilanza</h1>
          <p>Controllo aziendale di decreti, licenze, libretti, poligono, patentini e carta identita.</p>
        </div>
        <div className="header-actions">
          <button className="secondary-button" onClick={regenerate} type="button">
            <RefreshCw size={17} />
            Rigenera
          </button>
          <button onClick={() => loadData()} type="button">
            <Search size={17} />
            Applica filtri
          </button>
        </div>
      </header>

      {error && <div className="alert error">{error}</div>}

      <section className="kpi-grid">
        <Kpi label="Totale scadute" value={dashboard?.scadute || 0} tone="danger" />
        <Kpi label="Totale in scadenza" value={dashboard?.in_scadenza || 0} tone="warning" />
        <Kpi label="Totale regolari" value={dashboard?.regolari || 0} tone="success" />
        <Kpi label="Prossime 20 scadenze" value={dashboard?.prossime?.length || 0} />
      </section>

      <section className="card">
        <div className="filter-grid">
          <FilterInput label="Dipendente" name="dipendente" filters={filters} setFilters={setFilters} />
          <FilterInput label="Matricola" name="matricola" filters={filters} setFilters={setFilters} />
          <label>
            <span>Tipologia</span>
            <select value={filters.tipo} onChange={(event) => setFilters((current) => ({ ...current, tipo: event.target.value }))}>
              {tipi.map((tipo) => <option key={tipo} value={tipo}>{tipo || 'Tutte'}</option>)}
            </select>
          </label>
          <label>
            <span>Stato</span>
            <select value={filters.stato} onChange={(event) => setFilters((current) => ({ ...current, stato: event.target.value }))}>
              {stati.map((stato) => <option key={stato} value={stato}>{stato || 'Tutti'}</option>)}
            </select>
          </label>
          <label>
            <span>Origine</span>
            <select value={filters.origine} onChange={(event) => setFilters((current) => ({ ...current, origine: event.target.value }))}>
              {origini.map((origine) => <option key={origine} value={origine}>{origine || 'Tutte'}</option>)}
            </select>
          </label>
          <FilterInput label="Data da" name="data_da" type="date" filters={filters} setFilters={setFilters} />
          <FilterInput label="Data a" name="data_a" type="date" filters={filters} setFilters={setFilters} />
        </div>
      </section>

      <section className="card">
        <div className="section-title">
          <h2>Scadenze</h2>
          <span className="badge">{loading ? 'Caricamento' : `${rows.length} record`}</span>
        </div>
        {loading && <div className="empty-state">Caricamento scadenze...</div>}
        {!loading && (
          <div className="table-card">
            <table>
              <thead>
                <tr>
                  <th>Dipendente</th>
                  <th>Matricola</th>
                  <th>Tipo</th>
                  <th>Descrizione</th>
                  <th>Data Scadenza</th>
                  <th>Giorni Residui</th>
                  <th>Stato</th>
                  <th>Azione rinnovo</th>
                  <th>Azione</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>{[row.cognome, row.nome].filter(Boolean).join(' ') || '-'}</td>
                    <td>{row.matricola || '-'}</td>
                    <td>{row.tipo_scadenza}</td>
                    <td>{row.descrizione || '-'}</td>
                    <td>{formatDate(row.data_scadenza)}</td>
                    <td>{row.giorni_residui}</td>
                    <td><span className={`state-pill ${row.stato.toLowerCase()}`}>{formatState(row.stato)}</span></td>
                    <td>
                      <button className="small-button" onClick={() => onOpenRinnovo(row)} type="button">
                        Apri Rinnovo
                      </button>
                    </td>
                    <td>
                      <button className="small-button" onClick={() => onOpenEmployee(row.dipendente_id)} type="button">
                        <ExternalLink size={14} />
                        Apri Scheda
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

function FilterInput({ filters, label, name, setFilters, type = 'text' }) {
  return (
    <label>
      <span>{label}</span>
      <input type={type} value={filters[name]} onChange={(event) => setFilters((current) => ({ ...current, [name]: event.target.value }))} />
    </label>
  );
}

function Kpi({ label, tone = '', value }) {
  return (
    <div className={`enterprise-kpi ${tone ? `${tone}-kpi` : ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('it-IT');
}

function formatState(value) {
  return String(value || '').replace(/_/g, ' ').toUpperCase();
}

export default HrScadenzePage;
