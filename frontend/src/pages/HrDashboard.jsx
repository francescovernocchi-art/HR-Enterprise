import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  AlertTriangle,
  BadgeCheck,
  Bell,
  ClipboardList,
  FileText,
  FileUp,
  RefreshCw,
  Search,
  ShieldCheck,
  UserPlus,
  Users,
} from 'lucide-react';
import EmployeeTable from '../components/EmployeeTable.jsx';

const API_BASE = 'http://127.0.0.1:3000';

const kpiLabels = [
  ['dipendenti_attivi', 'Dipendenti attivi', Users],
  ['dipendenti_cessati', 'Dipendenti cessati', AlertTriangle],
  ['gpg', 'GPG', ShieldCheck],
  ['servizi_fiduciari', 'Servizi fiduciari', BadgeCheck],
  ['scadenze_entro_30', 'Scadenze entro 30 giorni', Bell],
  ['scadenze_scadute', 'Scadenze scadute', AlertTriangle],
  ['nuove_assunzioni_mese', 'Nuove assunzioni mese', UserPlus],
  ['cessazioni_mese', 'Cessazioni mese', ClipboardList],
];

function HrDashboard({ onImport, onOpenEmployee, onNavigate }) {
  const [employees, setEmployees] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadData() {
    setLoading(true);
    setError('');

    try {
      const [employeesResponse, dashboardResponse] = await Promise.all([
        axios.get(`${API_BASE}/api/hr/dipendenti`, { params: { search } }),
        axios.get(`${API_BASE}/api/hr/dashboard`),
      ]);
      setEmployees(employeesResponse.data || []);
      setDashboard(dashboardResponse.data);
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Errore nel caricamento dashboard HR.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const kpi = dashboard?.kpi || {};
  const charts = dashboard?.charts || {};

  return (
    <>
      <header className="page-header">
        <div>
          <h1>Dashboard HR Enterprise</h1>
          <p>Cruscotto operativo per anagrafiche, contratti, vigilanza e scadenze del personale.</p>
        </div>
        <div className="header-actions">
          <button className="secondary-button" onClick={loadData} type="button">
            <RefreshCw size={17} />
            Aggiorna
          </button>
          <button onClick={onImport} type="button">
            <FileUp size={17} />
            Importa CSV
          </button>
        </div>
      </header>

      {error && <div className="alert error">{error}</div>}

      <section className="kpi-grid">
        {kpiLabels.map(([key, label, Icon]) => (
          <div className={`enterprise-kpi ${key.includes('scadut') ? 'danger-kpi' : ''}`} key={key}>
            <Icon size={20} />
            <span>{label}</span>
            <strong>{kpi[key] ?? 0}</strong>
          </div>
        ))}
      </section>

      <section className="enterprise-grid">
        <ChartCard title="Distribuzione CCNL" rows={charts.ccnl || []} />
        <ChartCard title="Distribuzione livelli" rows={charts.livelli || []} />
        <ChartCard title="Contratti full time / part time" rows={charts.contratti || []} />
        <ChartCard title="Scadenze per tipologia" rows={charts.scadenze_tipologia || []} />
      </section>

      <section className="card">
        <div className="section-title">
          <h2>Top 10 Scadenze Urgenti</h2>
          <span className="badge warning">Prossimi rinnovi</span>
        </div>
        <div className="table-card">
          <table>
            <thead>
              <tr>
                <th>Dipendente</th>
                <th>Matricola</th>
                <th>Tipo</th>
                <th>Data</th>
                  <th>Giorni</th>
                  <th>Stato</th>
                  <th>Azione rinnovo</th>
              </tr>
            </thead>
            <tbody>
              {(charts.top_scadenze || []).map((row) => (
                <tr key={row.id}>
                  <td>{[row.cognome, row.nome].filter(Boolean).join(' ') || '-'}</td>
                  <td>{row.matricola || '-'}</td>
                  <td>{row.tipo_scadenza}</td>
                  <td>{row.data_scadenza ? new Date(row.data_scadenza).toLocaleDateString('it-IT') : '-'}</td>
                  <td>{row.giorni_residui}</td>
                  <td><span className={`state-pill ${row.stato.toLowerCase()}`}>{String(row.stato).replace(/_/g, ' ').toUpperCase()}</span></td>
                  <td>
                    <button
                      className="small-button"
                      onClick={() => onNavigate('rinnovi', `/hr/rinnovi?scadenza_id=${row.id}&dipendente_id=${row.dipendente_id}&tipo=${row.tipo_scadenza}&origine=${row.origine || 'vigilanza'}`)}
                      type="button"
                    >
                      Apri Rinnovo
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <div className="section-title">
          <h2>Azioni rapide</h2>
          <span className="badge">HR Operations</span>
        </div>
        <div className="quick-actions">
          <ActionButton icon={<FileUp size={18} />} label="Importa CSV" onClick={onImport} />
          <ActionButton icon={<UserPlus size={18} />} label="Nuovo dipendente" onClick={() => onNavigate('dipendenti', '/hr/dipendenti')} />
          <ActionButton icon={<Bell size={18} />} label="Scadenze" onClick={() => onNavigate('scadenze', '/hr/scadenze')} />
          <ActionButton icon={<RefreshCw size={18} />} label="Rinnovi" onClick={() => onNavigate('rinnovi', '/hr/rinnovi')} />
          <ActionButton icon={<ClipboardList size={18} />} label="Bollettini" onClick={() => onNavigate('bollettini', '/hr/bollettini')} />
          <ActionButton icon={<FileText size={18} />} label="Report HR" onClick={() => onNavigate('report', '/hr/report')} />
        </div>
      </section>

      <section className="card">
        <div className="section-title">
          <h2>Fascicoli dipendenti</h2>
          <span className="badge">{loading ? 'Caricamento' : `${employees.length} record`}</span>
        </div>
        <div className="search-row">
          <Search size={17} />
          <input
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') loadData();
            }}
            placeholder="Cerca per nome, cognome, matricola o codice fiscale"
            type="search"
            value={search}
          />
          <button className="secondary-button" onClick={loadData} type="button">
            Cerca
          </button>
        </div>
        <EmployeeTable employees={employees} loading={loading} onOpenEmployee={onOpenEmployee} />
      </section>
    </>
  );
}

function ChartCard({ rows, title }) {
  const max = Math.max(...rows.map((row) => row.value || 0), 1);

  return (
    <div className="card chart-card">
      <div className="section-title compact">
        <h3>{title}</h3>
      </div>
      <div className="bar-list">
        {rows.length === 0 && <div className="empty-state compact-empty">Nessun dato disponibile.</div>}
        {rows.map((row) => (
          <div className="bar-row" key={row.label}>
            <div>
              <span>{row.label}</span>
              <strong>{row.value}</strong>
            </div>
            <div className="bar-track">
              <span style={{ width: `${Math.max(4, ((row.value || 0) / max) * 100)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ActionButton({ icon, label, onClick }) {
  return (
    <button className="quick-action-button" onClick={onClick} type="button">
      {icon}
      {label}
    </button>
  );
}

export default HrDashboard;
