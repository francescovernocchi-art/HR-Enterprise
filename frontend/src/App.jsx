import React, { useState } from 'react';
import {
  BarChart3,
  Bell,
  BookOpen,
  Briefcase,
  ClipboardList,
  FileArchive,
  FileText,
  FileUp,
  GraduationCap,
  HeartPulse,
  PackageCheck,
  RefreshCw,
  Settings,
  Users,
} from 'lucide-react';
import HrDashboard from './pages/HrDashboard.jsx';
import HrImportPreviewPage from './pages/HrImportPreviewPage.jsx';
import EmployeeProfilePage from './pages/EmployeeProfilePage.jsx';
import HrScadenzePage from './pages/HrScadenzePage.jsx';

const menuItems = [
  { key: 'dashboard', label: 'Dashboard HR', icon: BarChart3, path: '/hr' },
  { key: 'dipendenti', label: 'Dipendenti', icon: Users, path: '/hr/dipendenti' },
  { key: 'scadenze', label: 'Scadenze', icon: Bell, path: '/hr/scadenze' },
  { key: 'rinnovi', label: 'Rinnovi', icon: RefreshCw, path: '/hr/rinnovi' },
  { key: 'bollettini', label: 'Bollettini', icon: ClipboardList, path: '/hr/bollettini' },
  { key: 'formazione', label: 'Formazione', icon: GraduationCap, path: '/hr/formazione' },
  { key: 'visite', label: 'Visite Mediche', icon: HeartPulse, path: '/hr/visite-mediche' },
  { key: 'dotazioni', label: 'Dotazioni', icon: PackageCheck, path: '/hr/dotazioni' },
  { key: 'documenti', label: 'Documenti', icon: FileArchive, path: '/hr/documenti' },
  { key: 'report', label: 'Report', icon: FileText, path: '/hr/report' },
  { key: 'import', label: 'Importazioni', icon: FileUp, path: '/hr/import' },
  { key: 'impostazioni', label: 'Impostazioni', icon: Settings, path: '/hr/impostazioni' },
];

function getInitialPage() {
  const path = window.location.pathname;
  if (/\/hr\/dipendenti\/(\d+)/.test(path)) return 'employee-profile';
  const item = menuItems.find((entry) => entry.path === path);
  if (item?.key === 'dipendenti') return 'dashboard';
  return item?.key || 'dashboard';
}

function App() {
  const pathEmployeeId = window.location.pathname.match(/\/hr\/dipendenti\/(\d+)/)?.[1] || null;
  const [page, setPage] = useState(getInitialPage());
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(pathEmployeeId);

  function openEmployeeProfile(employeeId) {
    setSelectedEmployeeId(employeeId);
    setPage('employee-profile');
    window.history.pushState({}, '', `/hr/dipendenti/${employeeId}`);
  }

  function navigate(nextPage, path) {
    setPage(nextPage === 'dipendenti' ? 'dashboard' : nextPage);
    window.history.pushState({}, '', path);
  }

  function openRinnovoFromScadenza(scadenza) {
    if (scadenza.rinnovo_context?.path) {
      navigate('rinnovi', scadenza.rinnovo_context.path);
      return;
    }
    const params = new URLSearchParams({
      scadenza_id: String(scadenza.id),
      dipendente_id: String(scadenza.dipendente_id),
      tipo: scadenza.tipo_scadenza || '',
      origine: scadenza.origine || 'vigilanza',
    });
    navigate('rinnovi', `/hr/rinnovi?${params.toString()}`);
  }

  const activeKey = page === 'employee-profile' ? 'dipendenti' : page;

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span>VIS</span>
          <div>
            <strong>Enterprise</strong>
            <p>HR Vigilanza</p>
          </div>
        </div>

        <nav>
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                className={activeKey === item.key ? 'active' : ''}
                key={item.key}
                onClick={() => navigate(item.key, item.path)}
                type="button"
              >
                <Icon size={18} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-status">
          <Briefcase size={18} />
          <span>Modulo HR Enterprise</span>
        </div>
      </aside>

      <section className="page-shell">
        {page === 'dashboard' && (
          <HrDashboard
            onImport={() => navigate('import', '/hr/import')}
            onOpenEmployee={openEmployeeProfile}
            onNavigate={navigate}
          />
        )}
        {page === 'import' && <HrImportPreviewPage onBack={() => navigate('dashboard', '/hr')} />}
        {page === 'scadenze' && (
          <HrScadenzePage
            onOpenEmployee={openEmployeeProfile}
            onOpenRinnovo={openRinnovoFromScadenza}
          />
        )}
        {page === 'employee-profile' && selectedEmployeeId && (
          <EmployeeProfilePage
            employeeId={selectedEmployeeId}
            onBack={() => navigate('dipendenti', '/hr/dipendenti')}
          />
        )}
        {!['dashboard', 'import', 'employee-profile', 'scadenze'].includes(page) && (
          <PlaceholderModule
            item={menuItems.find((entry) => entry.key === page)}
          />
        )}
      </section>
    </main>
  );
}

function PlaceholderModule({ item }) {
  const Icon = item?.icon || BookOpen;
  const params = new URLSearchParams(window.location.search);
  const scadenzaId = params.get('scadenza_id');
  return (
    <>
      <header className="page-header">
        <div>
          <h1>{item?.label || 'Modulo HR'}</h1>
          <p>Area predisposta nel modulo VIS Enterprise HR.</p>
        </div>
      </header>
      <section className="module-placeholder">
        <Icon size={34} />
        <h2>Modulo in preparazione</h2>
        {item?.key === 'rinnovi' && scadenzaId ? (
          <p>
            Rinnovo aperto dalla scadenza #{scadenzaId}. Il contesto e pronto per il modulo Rinnovi/Bollettini esistente.
          </p>
        ) : (
          <p>La sezione e i collegamenti sono pronti per l’estensione enterprise senza interrompere il core HR.</p>
        )}
      </section>
    </>
  );
}

export default App;
