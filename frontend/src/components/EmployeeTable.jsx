import React from 'react';

function EmployeeTable({ employees, loading, onOpenEmployee }) {
  if (loading) {
    return <div className="empty-state">Caricamento dipendenti...</div>;
  }

  if (!employees.length) {
    return <div className="empty-state">Nessun dipendente disponibile.</div>;
  }

  return (
    <div className="table-card">
      <table>
        <thead>
          <tr>
            <th>Matricola</th>
            <th>Cognome</th>
            <th>Nome</th>
            <th>Codice fiscale</th>
            <th>Email</th>
            <th>Cellulare</th>
            <th>Telefono</th>
            <th>Azione</th>
          </tr>
        </thead>
        <tbody>
          {employees.map((employee) => (
            <tr key={employee.id || employee.codice_fiscale}>
              <td>{employee.matricola || '-'}</td>
              <td>{employee.cognome || '-'}</td>
              <td>{employee.nome || '-'}</td>
              <td>
                <span className="code-badge">{employee.codice_fiscale || '-'}</span>
              </td>
              <td>{employee.email || '-'}</td>
              <td>{employee.cellulare || '-'}</td>
              <td>{employee.telefono || '-'}</td>
              <td>
                <button
                  className="small-button"
                  disabled={!employee.id}
                  onClick={() => onOpenEmployee(employee.id)}
                  type="button"
                >
                  Apri Scheda
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default EmployeeTable;
