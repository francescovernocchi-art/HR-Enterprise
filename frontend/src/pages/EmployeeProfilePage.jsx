import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { ArrowLeft, Briefcase, ClipboardList, FileArchive, History, Mail, MapPin, PackageCheck, Save, ShieldCheck, UserRound } from 'lucide-react';

const API_BASE = 'http://127.0.0.1:3000';
const tabs = ['Generale', 'Contratto', 'Contatti', 'Residenza/Domicilio', 'Vigilanza', 'Scadenze', 'Documenti', 'Dotazioni', 'Bollettini', 'Storico'];

const generalFields = [
  'codice_soggetto', 'matricola', 'tracciato_paghe', 'numero_badge', 'alias', 'nome', 'cognome',
  'codice_fiscale', 'sesso', 'data_nascita', 'luogo_nascita', 'provincia_nascita', 'cittadinanza',
  'azienda', 'unita_locale', 'segmento', 'stato',
];

const labels = {
  codice_soggetto: 'Codice soggetto',
  matricola: 'Matricola',
  tracciato_paghe: 'Tracciato paghe',
  numero_badge: 'Numero badge',
  alias: 'Alias',
  nome: 'Nome',
  cognome: 'Cognome',
  codice_fiscale: 'Codice fiscale',
  sesso: 'Sesso',
  data_nascita: 'Data nascita',
  luogo_nascita: 'Luogo nascita',
  provincia_nascita: 'Provincia nascita',
  cittadinanza: 'Cittadinanza',
  azienda: 'Azienda',
  unita_locale: 'Unita locale',
  segmento: 'Segmento',
  stato: 'Stato',
};

const vigilanzaGroups = [
  ['Decreto', ['prefettura', 'rin_decreto', 'scad_decreto']],
  ['Libretto Pistola', ['nr_libretto_pistola', 'rin_libretto_pistola', 'scad_libretto_pistola']],
  ['Licenza Pistola', ['rin_licenza_pistola', 'scad_licenza_pistola']],
  ['Libretto Fucile', ['nr_libretto_fucile', 'rin_libretto_fucile', 'scad_libretto_fucile']],
  ['Licenza Fucile', ['rin_licenza_fucile', 'scad_licenza_fucile']],
  ['Poligono', ['poligono', 'data_validita_poligono', 'codice_poligono']],
  ['Patentini', ['ril_patentino_1', 'nr_patentino_1', 'ril_patentino_2', 'nr_patentino_2']],
  ['Carta Identita', ['cod_ci', 'ril_ci', 'scad_ci', 'ente_ci']],
  ['Denuncia Arma', ['luogo_den_arma', 'data_den_arma', 'ente_den_arma']],
];

const dateFields = new Set([
  'rin_decreto', 'scad_decreto', 'rin_libretto_pistola', 'scad_libretto_pistola',
  'rin_licenza_pistola', 'scad_licenza_pistola', 'rin_libretto_fucile', 'scad_libretto_fucile',
  'rin_licenza_fucile', 'scad_licenza_fucile', 'data_validita_poligono', 'ril_patentino_1',
  'ril_patentino_2', 'ril_ci', 'scad_ci', 'data_den_arma',
]);

function EmployeeProfilePage({ employeeId, onBack }) {
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({});
  const [vigilanzaForm, setVigilanzaForm] = useState({});
  const [activeTab, setActiveTab] = useState('Generale');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function loadProfile() {
    setLoading(true);
    setError('');

    try {
      const response = await axios.get(`${API_BASE}/api/hr/dipendenti/${employeeId}`);
      setProfile(response.data);
      setForm(response.data.dipendente || {});
      setVigilanzaForm(response.data.vigilanza || {});
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Errore nel caricamento scheda dipendente.');
    } finally {
      setLoading(false);
    }
  }

  async function saveVigilanza() {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await axios.put(`${API_BASE}/api/hr/dipendenti/${employeeId}/vigilanza`, vigilanzaForm);
      await loadProfile();
      setMessage('Dati vigilanza salvati e scadenze rigenerate.');
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Errore durante il salvataggio vigilanza.');
    } finally {
      setSaving(false);
    }
  }

  async function saveGeneral() {
    setSaving(true);
    setError('');
    setMessage('');

    try {
      const response = await axios.put(`${API_BASE}/api/hr/dipendenti/${employeeId}`, form);
      setProfile(response.data);
      setForm(response.data.dipendente || {});
      setMessage('Dati principali salvati.');
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Errore durante il salvataggio.');
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    loadProfile();
  }, [employeeId]);

  const employee = profile?.dipendente;
  const fullName = useMemo(() => {
    if (!employee) return 'Scheda dipendente';
    return [employee.cognome, employee.nome].filter(Boolean).join(' ') || 'Scheda dipendente';
  }, [employee]);

  return (
    <>
      <header className="page-header profile-header">
        <div>
          <button className="secondary-button inline-back" onClick={onBack} type="button">
            <ArrowLeft size={16} />
            Dipendenti
          </button>
          <h1>{fullName}</h1>
          <p>Fascicolo HR enterprise con dati anagrafici, contrattuali e presidio vigilanza.</p>
        </div>
        {employee && (
          <div className="profile-badges">
            <span className="badge">ID {employee.id}</span>
            <span className={`badge ${employee.stato === 'attivo' ? 'success' : 'warning'}`}>{employee.stato}</span>
          </div>
        )}
      </header>

      {error && <div className="alert error">{error}</div>}
      {message && <div className="alert success">{message}</div>}
      {loading && <div className="empty-state">Caricamento scheda dipendente...</div>}

      {!loading && profile && (
        <>
          <section className="stats-grid">
            <Metric icon={<UserRound size={22} />} label="Dipendente" value={fullName} />
            <Metric icon={<Briefcase size={22} />} label="Contratto" value={profile.contratto?.tipo_contratto || '-'} />
            <Metric icon={<Mail size={22} />} label="Email" value={profile.contatti?.email || '-'} />
            <Metric icon={<MapPin size={22} />} label="Sedi" value={profile.indirizzi?.length || 0} />
          </section>

          <section className="card profile-card">
            <div className="tabs">
              {tabs.map((tab) => (
                <button className={activeTab === tab ? 'active' : ''} key={tab} onClick={() => setActiveTab(tab)} type="button">
                  {tab}
                </button>
              ))}
            </div>

            {activeTab === 'Generale' && (
              <div className="tab-content">
                <div className="section-title">
                  <h2>Dati principali</h2>
                  <button disabled={saving} onClick={saveGeneral} type="button">
                    <Save size={16} />
                    {saving ? 'Salvataggio...' : 'Salva'}
                  </button>
                </div>
                <div className="detail-grid">
                  {generalFields.map((field) => (
                    <label className="detail-field editable-field" key={field}>
                      <span>{labels[field]}</span>
                      <input
                        onChange={(event) => setForm((current) => ({ ...current, [field]: event.target.value }))}
                        type={field.startsWith('data_') ? 'date' : 'text'}
                        value={formatInputValue(form[field])}
                      />
                    </label>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'Contratto' && <RecordTab icon={<Briefcase size={18} />} record={profile.contratto} title="Contratto" />}
            {activeTab === 'Contatti' && <RecordTab icon={<Mail size={18} />} record={profile.contatti} title="Contatti" />}
            {activeTab === 'Residenza/Domicilio' && <AddressesTab addresses={profile.indirizzi || []} />}
            {activeTab === 'Vigilanza' && (
              <VigilanzaTab
                form={vigilanzaForm}
                onChange={setVigilanzaForm}
                onSave={saveVigilanza}
                saving={saving}
              />
            )}
            {activeTab === 'Scadenze' && <ScadenzeTab rows={profile.scadenze || []} />}
            {activeTab === 'Documenti' && <FutureTab icon={<FileArchive size={20} />} title="Documenti" />}
            {activeTab === 'Dotazioni' && <FutureTab icon={<PackageCheck size={20} />} title="Dotazioni" />}
            {activeTab === 'Bollettini' && <FutureTab icon={<ClipboardList size={20} />} title="Bollettini" />}
            {activeTab === 'Storico' && <FutureTab icon={<History size={20} />} title="Storico" />}
          </section>
        </>
      )}
    </>
  );
}

function VigilanzaTab({ form, onChange, onSave, saving }) {
  return (
    <div className="tab-content">
      <div className="section-title">
        <h2>Vigilanza</h2>
        <button disabled={saving} onClick={onSave} type="button">
          <Save size={16} />
          {saving ? 'Salvataggio...' : 'Salva Vigilanza'}
        </button>
      </div>
      <div className="imported-groups">
        {vigilanzaGroups.map(([title, fields]) => (
          <div className="imported-group" key={title}>
            <div className="section-title compact">
              <h3>{title}</h3>
              <ShieldCheck size={16} />
            </div>
            <div className="detail-grid">
              {fields.map((field) => (
                <label className="detail-field editable-field" key={field}>
                  <span>{field.replace(/_/g, ' ')}</span>
                  <input
                    type={dateFields.has(field) ? 'date' : 'text'}
                    value={formatInputValue(form[field])}
                    onChange={(event) => onChange((current) => ({ ...current, [field]: event.target.value }))}
                  />
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ScadenzeTab({ rows }) {
  return (
    <div className="tab-content">
      <div className="section-title">
        <h2>Scadenze</h2>
        <ClipboardList size={18} />
      </div>
      {rows.length === 0 && <div className="empty-state">Nessuna scadenza generata.</div>}
      {rows.length > 0 && (
        <div className="table-card">
          <table>
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Descrizione</th>
                <th>Data Scadenza</th>
                <th>Giorni Residui</th>
                <th>Stato</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.tipo_scadenza}</td>
                  <td>{row.descrizione}</td>
                  <td>{formatValue(row.data_scadenza)}</td>
                  <td>{row.giorni_residui}</td>
                  <td><span className={`state-pill ${row.stato.toLowerCase()}`}>{formatState(row.stato)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function FutureTab({ icon, title }) {
  return (
    <div className="tab-content">
      <div className="module-placeholder inline-placeholder">
        {icon}
        <h2>{title}</h2>
        <p>Modulo in preparazione</p>
      </div>
    </div>
  );
}

function Metric({ icon, label, value }) {
  return (
    <div className="card metric-card">
      {icon}
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function RecordTab({ icon, record, title }) {
  return (
    <div className="tab-content">
      <div className="section-title">
        <h2>{title}</h2>
        {icon}
      </div>
      {!record && <div className="empty-state">Nessun dato disponibile.</div>}
      {record && <DetailGrid record={record} />}
    </div>
  );
}

function AddressesTab({ addresses }) {
  return (
    <div className="tab-content">
      <div className="section-title">
        <h2>Residenza/Domicilio</h2>
        <MapPin size={18} />
      </div>
      {addresses.length === 0 && <div className="empty-state">Nessun indirizzo disponibile.</div>}
      <div className="imported-groups">
        {addresses.map((address) => (
          <div className="imported-group" key={address.id || address.tipo}>
            <div className="section-title compact">
              <h3>{address.tipo}</h3>
            </div>
            <DetailGrid record={address} />
          </div>
        ))}
      </div>
    </div>
  );
}

function DetailGrid({ record }) {
  return (
    <div className="detail-grid">
      {Object.entries(record)
        .filter(([key]) => !['id', 'dipendente_id'].includes(key))
        .map(([key, value]) => (
          <div className="detail-field" key={key}>
            <span>{labels[key] || key.replace(/_/g, ' ')}</span>
            <strong>{formatValue(value)}</strong>
          </div>
        ))}
    </div>
  );
}

function formatInputValue(value) {
  if (!value) return '';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) return value.slice(0, 10);
  return String(value);
}

function formatValue(value) {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) return new Date(value).toLocaleDateString('it-IT');
  return String(value);
}

function formatState(value) {
  return String(value || '').replace(/_/g, ' ').toUpperCase();
}

export default EmployeeProfilePage;
