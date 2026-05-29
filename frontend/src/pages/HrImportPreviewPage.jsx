import React, { useMemo, useState } from 'react';
import axios from 'axios';
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileUp,
  ShieldCheck,
  UploadCloud,
  X,
} from 'lucide-react';

const API_BASE = 'http://127.0.0.1:3000';

const steps = ['Caricamento file', 'Analisi dati', 'Validazione', 'Conferma importazione'];

function HrImportPreviewPage({ onBack }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [activeStep, setActiveStep] = useState(0);
  const [processState, setProcessState] = useState('idle');
  const [progress, setProgress] = useState({ label: 'In attesa', processed: 0, total: 0, percent: 0 });
  const [importResult, setImportResult] = useState(null);
  const [error, setError] = useState('');

  const analysis = useMemo(() => buildAnalysis(preview), [preview]);
  const validation = useMemo(() => buildValidation(preview), [preview]);
  const tableHeaders = (preview?.headers || []).slice(0, 8);

  async function analyzeCsv(selectedFile) {
    setFile(selectedFile);
    setPreview(null);
    setImportResult(null);
    setError('');
    setActiveStep(0);
    setProcessState('uploading');
    setProgress({ label: 'Caricamento CSV', processed: 0, total: 100, percent: 10 });

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      setProgress({ label: 'Analisi CSV', processed: 0, total: 100, percent: 35 });
      setProcessState('parsing');
      const response = await axios.post(`${API_BASE}/api/dipendenti/import/preview`, formData);
      const data = response.data.data;
      setPreview(data);
      setProcessState('validating');
      setProgress({ label: 'Validazione dati HR', processed: data.totalRows, total: data.totalRows, percent: 75 });
      window.setTimeout(() => {
        setProcessState('idle');
        setProgress({ label: 'Analisi completata', processed: data.totalRows, total: data.totalRows, percent: 100 });
        setActiveStep(1);
      }, 250);
    } catch (requestError) {
      setProcessState('error');
      setError(requestError.response?.data?.error || 'Errore durante l’analisi del CSV.');
      setProgress({ label: 'Errore analisi', processed: 0, total: 0, percent: 0 });
    }
  }

  async function confirmImport() {
    if (!file || !preview) return;

    setProcessState('importing');
    setError('');
    setActiveStep(3);
    setProgress({ label: 'Importazione dipendenti', processed: 0, total: preview.totalRows, percent: 5 });

    const progressTimer = window.setInterval(() => {
      setProgress((current) => {
        if (current.percent >= 92) return current;
        const nextPercent = Math.min(92, current.percent + 8);
        return {
          label: 'Importazione dipendenti',
          processed: Math.round((preview.totalRows * nextPercent) / 100),
          total: preview.totalRows,
          percent: nextPercent,
        };
      });
    }, 350);

    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await axios.post(`${API_BASE}/api/hr/import-csv`, formData);
      window.clearInterval(progressTimer);
      const result = {
        stato: 'completed',
        inseriti: response.data.dipendenti_creati,
        aggiornati: response.data.dipendenti_aggiornati,
        errori: response.data.errori?.length || 0,
        righe_saltate: response.data.righe_saltate,
        righe_lette: response.data.righe_lette,
        failedRows: (response.data.errori || []).map((item) => ({ row: item.riga, message: item.messaggio })),
      };
      setImportResult(result);
      setProcessState('completed');
      setProgress({ label: 'Importazione completata', processed: response.data.righe_lette, total: response.data.righe_lette, percent: 100 });
    } catch (requestError) {
      window.clearInterval(progressTimer);
      setProcessState('error');
      setError(requestError.response?.data?.error || 'Errore durante importazione CSV.');
    }
  }

  function resetImport() {
    setFile(null);
    setPreview(null);
    setImportResult(null);
    setError('');
    setActiveStep(0);
    setProcessState('idle');
    setProgress({ label: 'In attesa', processed: 0, total: 0, percent: 0 });
  }

  function downloadErrorReport() {
    const rows = [
      ['tipo', 'riga', 'campo', 'messaggio'],
      ...validation.items.flatMap((group) => group.rows.map((row) => [group.title, row.row || '', row.field || '', row.message])),
      ...(importResult?.failedRows || []).map((row) => ['Importazione', row.row || '', '', row.message]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `report-errori-hr-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const canImport = preview && validation.errorCount === 0 && processState !== 'importing';

  return (
    <>
      <header className="page-header">
        <div>
          <h1>Importazione HR guidata</h1>
          <p>Flusso controllato per acquisire dipendenti, contratti e dati amministrativi dal gestionale paghe.</p>
        </div>
        <button className="secondary-button" onClick={onBack} type="button">
          Dashboard HR
        </button>
      </header>

      {error && <div className="alert error">{error}</div>}

      <section className="wizard-steps">
        {steps.map((step, index) => (
          <button className={index === activeStep ? 'active' : index < activeStep ? 'done' : ''} key={step} onClick={() => preview && setActiveStep(index)} type="button">
            <span>{index + 1}</span>
            {step}
          </button>
        ))}
      </section>

      <ProgressPanel progress={progress} state={processState} />

      {activeStep === 0 && (
        <section className="card upload-card enterprise-upload">
          <div>
            <FileSpreadsheet size={34} />
            <h2>Caricamento file paghe</h2>
            <p>Seleziona il CSV esportato dal gestionale paghe. Il sistema rileva delimitatore, righe, colonne e mapping HR.</p>
            {file && <strong className="file-summary">{file.name} - {formatBytes(file.size)}</strong>}
          </div>
          <div className="header-actions">
            <label className="file-button">
              <UploadCloud size={18} />
              Seleziona CSV
              <input accept=".csv,text/csv" hidden onChange={(event) => event.target.files?.[0] && setFile(event.target.files[0])} type="file" />
            </label>
            <button disabled={!file || ['uploading', 'parsing', 'validating'].includes(processState)} onClick={() => analyzeCsv(file)} type="button">
              <ShieldCheck size={18} />
              Analizza CSV
            </button>
          </div>
        </section>
      )}

      {preview && activeStep === 0 && <FileFacts file={file} preview={preview} />}

      {preview && activeStep === 1 && (
        <>
          <section className="kpi-grid">
            <Kpi label="Dipendenti rilevati" value={analysis.totalEmployees} />
            <Kpi label="Nuovi dipendenti" value={analysis.newEmployees} />
            <Kpi label="Da aggiornare" value={analysis.updateEmployees} />
            <Kpi label="Cessati rilevati" value={analysis.terminated} />
            <Kpi label="Errori" value={validation.errorCount} tone={validation.errorCount ? 'danger' : 'success'} />
            <Kpi label="Warning" value={validation.warningCount} tone={validation.warningCount ? 'warning' : 'success'} />
          </section>
          <TechnicalPreview preview={preview} tableHeaders={tableHeaders} />
        </>
      )}

      {preview && activeStep === 2 && (
        <section className="validation-layout">
          {validation.items.map((group) => (
            <ValidationCard group={group} key={group.title} />
          ))}
        </section>
      )}

      {preview && activeStep === 3 && (
        <section className="card confirm-card">
          <div>
            <h2>Conferma importazione HR</h2>
            <p>Verranno aggiornate le tabelle HR Core mantenendo collegamenti tramite dipendente_id.</p>
            <div className="summary-grid">
              <Kpi label="Righe lette" value={importResult?.righe_lette ?? preview.totalRows} />
              <Kpi label="Creati" value={importResult?.inseriti ?? analysis.newEmployees} />
              <Kpi label="Aggiornati" value={importResult?.aggiornati ?? analysis.updateEmployees} />
              <Kpi label="Saltati" value={importResult?.righe_saltate ?? 0} tone="warning" />
              <Kpi label="Errori" value={importResult?.errori ?? validation.errorCount} tone={validation.errorCount ? 'danger' : 'success'} />
            </div>
          </div>
          <div className="confirm-actions">
            <button className="secondary-button" onClick={resetImport} type="button">
              <X size={16} />
              Annulla
            </button>
            <button className="secondary-button" onClick={downloadErrorReport} type="button">
              <Download size={16} />
              Scarica report errori
            </button>
            <button disabled={!canImport} onClick={confirmImport} type="button">
              <FileUp size={16} />
              Conferma Importazione
            </button>
          </div>
        </section>
      )}

      {preview && activeStep < 3 && (
        <section className="wizard-footer">
          <button className="secondary-button" onClick={resetImport} type="button">
            <Ban size={16} />
            Annulla
          </button>
          <button disabled={activeStep === 0 && !preview} onClick={() => setActiveStep(Math.min(3, activeStep + 1))} type="button">
            Prosegui
          </button>
        </section>
      )}
    </>
  );
}

function buildAnalysis(preview) {
  if (!preview) return {};
  const rows = preview.previewRows || [];
  const mapping = preview.mapping || {};
  const terminated = rows.filter((row) => row[mapping.data_licenziamento]).length;

  return {
    totalEmployees: preview.totalRows || 0,
    newEmployees: Math.max(0, (preview.totalRows || 0) - (preview.databaseDuplicates?.length || 0)),
    updateEmployees: preview.databaseDuplicates?.length || 0,
    terminated,
  };
}

function buildValidation(preview) {
  const errors = preview?.validation?.errors || [];
  const warnings = preview?.validation?.warnings || [];
  const rows = preview?.previewRows || [];
  const mapping = preview?.mapping || {};

  const missingFiscal = errors.filter((item) => item.field === 'codice_fiscale');
  const invalidDates = errors.filter((item) => String(item.message || '').toLowerCase().includes('date'));
  const requiredMissing = errors.filter((item) => String(item.message || '').toLowerCase().includes('required') || String(item.message || '').toLowerCase().includes('obblig'));
  const duplicateMatricole = getDuplicates(rows, mapping.matricola, 'matricola');
  const withoutContract = rows
    .map((row, index) => ({ row: index + 2, message: 'Dipendente senza contratto valorizzato', field: 'contratto', value: row[mapping.contratto] }))
    .filter((item) => !item.value);
  const withoutCcnl = rows
    .map((row, index) => ({ row: index + 2, message: 'CCNL non indicato', field: 'ccnl', value: row[mapping.ccnl] }))
    .filter((item) => !item.value);

  const items = [
    { title: 'Codici fiscali mancanti', rows: missingFiscal, tone: missingFiscal.length ? 'danger' : 'success' },
    { title: 'Matricole duplicate', rows: duplicateMatricole, tone: duplicateMatricole.length ? 'warning' : 'success' },
    { title: 'Date non valide', rows: invalidDates, tone: invalidDates.length ? 'danger' : 'success' },
    { title: 'Campi obbligatori mancanti', rows: requiredMissing, tone: requiredMissing.length ? 'danger' : 'success' },
    { title: 'Dipendenti senza contratto', rows: withoutContract, tone: withoutContract.length ? 'warning' : 'success' },
    { title: 'Dipendenti senza CCNL', rows: withoutCcnl, tone: withoutCcnl.length ? 'warning' : 'success' },
  ];

  return {
    items,
    errorCount: errors.length,
    warningCount: warnings.length + duplicateMatricole.length + withoutContract.length + withoutCcnl.length,
  };
}

function getDuplicates(rows, header, field) {
  if (!header) return [];
  const counts = new Map();
  rows.forEach((row) => {
    const value = row[header];
    if (value) counts.set(value, (counts.get(value) || 0) + 1);
  });
  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([value, count]) => ({ row: null, field, message: `${value} presente ${count} volte` }));
}

function ProgressPanel({ progress, state }) {
  return (
    <section className="progress-panel">
      <div>
        <span className={`status-dot ${state}`}>{state}</span>
        <strong>{progress.label}</strong>
        <p>{progress.processed || 0} / {progress.total || 0} righe elaborate</p>
      </div>
      <div className="progress-bar-shell">
        <div className="progress-bar-fill" style={{ width: `${progress.percent || 0}%` }} />
      </div>
      <strong>{progress.percent || 0}%</strong>
    </section>
  );
}

function FileFacts({ file, preview }) {
  return (
    <section className="kpi-grid">
      <Kpi label="Nome file" value={file?.name || preview.fileName} />
      <Kpi label="Dimensione file" value={formatBytes(file?.size || 0)} />
      <Kpi label="Delimiter rilevato" value={preview.delimiter === '\t' ? 'TAB' : preview.delimiter} />
      <Kpi label="Righe totali" value={preview.totalRows} />
      <Kpi label="Colonne rilevate" value={preview.headers.length} />
    </section>
  );
}

function TechnicalPreview({ preview, tableHeaders }) {
  return (
    <section className="card technical-preview">
      <details>
        <summary>Dettaglio tecnico CSV: mapping, headers e prime righe</summary>
        <div className="mapping-grid">
          {Object.entries(preview.mapping || {}).map(([field, header]) => (
            <div className="mapping-chip" key={field}>
              <span>{field}</span>
              <strong>{header}</strong>
            </div>
          ))}
        </div>
        <div className="chips">
          {preview.headers.map((header) => <span key={header}>{header}</span>)}
        </div>
        <div className="table-card">
          <table>
            <thead>
              <tr>
                <th>#</th>
                {tableHeaders.map((header) => <th key={header}>{header}</th>)}
              </tr>
            </thead>
            <tbody>
              {preview.previewRows.map((row, index) => (
                <tr key={`${index}-${row[tableHeaders[0]] || ''}`}>
                  <td>{index + 1}</td>
                  {tableHeaders.map((header) => <td key={header}>{row[header] || '-'}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}

function ValidationCard({ group }) {
  const ok = group.rows.length === 0;
  return (
    <div className="card validation-card">
      <div className="section-title">
        <h2>{group.title}</h2>
        <span className={`badge ${ok ? 'success' : group.tone}`}>{group.rows.length}</span>
      </div>
      {ok && <div className="success-state"><CheckCircle2 size={18} />Nessuna anomalia rilevata.</div>}
      {!ok && (
        <div className="issue-list">
          {group.rows.slice(0, 20).map((item, index) => (
            <div className={`issue ${group.tone}`} key={`${group.title}-${index}`}>
              <AlertTriangle size={16} />
              <span>{item.row ? `Riga ${item.row}` : item.field}</span>
              <strong>{item.message}</strong>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Kpi({ label, tone = '', value }) {
  return (
    <div className={`enterprise-kpi ${tone ? `${tone}-kpi` : ''}`}>
      <span>{label}</span>
      <strong>{value ?? '-'}</strong>
    </div>
  );
}

function formatBytes(bytes) {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default HrImportPreviewPage;
