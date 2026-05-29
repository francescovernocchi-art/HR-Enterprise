const db = require('../db');

const CATEGORY_RULES = [
  { category: 'Anagrafica', patterns: ['nome', 'cognome', 'codice fiscale', 'sesso', 'nascita', 'cittadinanza'] },
  { category: 'Contratto', patterns: ['contratto', 'ccnl', 'livello', 'qualifica', 'mansione', 'assunzione', 'licenziamento'] },
  { category: 'Contatti', patterns: ['email', 'e mail', 'cellulare', 'telefono', 'pec'] },
  { category: 'Residenza', patterns: ['residenza', 'domicilio', 'indirizzo', 'comune', 'provincia', 'cap'] },
  { category: 'Economico', patterns: ['iban', 'ore', 'buoni pasto', 'paga', 'retribuzione'] },
  { category: 'Documenti', patterns: ['ci', 'documento', 'patentino', 'libretto', 'licenza', 'decreto'] },
  { category: 'Formazione', patterns: ['titolo studio', 'studio', 'corso', 'formazione'] },
  { category: 'Scadenze', patterns: ['scad', 'validita', 'termine'] },
  { category: 'Dotazioni', patterns: ['arma', 'pistola', 'fucile', 'poligono'] },
];

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function getCategory(fieldName) {
  const normalized = normalizeText(fieldName);
  const rule = CATEGORY_RULES.find((item) =>
    item.patterns.some((pattern) => normalized.includes(normalizeText(pattern)))
  );

  return rule?.category || 'Altri dati';
}

function groupDynamicFields(rows) {
  return rows.reduce((groups, row) => {
    const category = getCategory(row.campo);

    if (!groups[category]) {
      groups[category] = [];
    }

    groups[category].push(row);
    return groups;
  }, {});
}

async function tableExists(schema, table) {
  const result = await db.query(
    `
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = $1
          AND table_name = $2
      ) AS exists
    `,
    [schema, table]
  );

  return Boolean(result.rows[0]?.exists);
}

async function tableHasColumn(schema, table, column) {
  const result = await db.query(
    `
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = $1
          AND table_name = $2
          AND column_name = $3
      ) AS exists
    `,
    [schema, table, column]
  );

  return Boolean(result.rows[0]?.exists);
}

async function getOptionalTableRows(tableName, dipendenteId) {
  const available = await tableExists('hr', tableName);
  const hasDipendenteId = available && await tableHasColumn('hr', tableName, 'dipendente_id');

  if (!available || !hasDipendenteId) {
    return [];
  }

  const result = await db.query(
    `SELECT * FROM hr.${tableName} WHERE dipendente_id = $1 ORDER BY id DESC`,
    [dipendenteId]
  );

  return result.rows;
}

async function getEmployeeCore(id) {
  const result = await db.query(
    'SELECT * FROM core.dipendenti WHERE id = $1',
    [id]
  );

  if (result.rowCount === 0) {
    const error = new Error('Employee not found');
    error.status = 404;
    throw error;
  }

  return result.rows[0];
}

async function getDynamicFields(id) {
  if (!(await tableExists('hr', 'dipendenti_dati'))) {
    return [];
  }

  const result = await db.query(
    `
      SELECT id, dipendente_id, campo, valore, import_id, created_at
      FROM hr.dipendenti_dati
      WHERE dipendente_id = $1
      ORDER BY campo ASC
    `,
    [id]
  );

  return result.rows;
}

async function getEmployeeProfile(id) {
  const employee = await getEmployeeCore(id);
  const dynamicFields = await getDynamicFields(id);
  const [contracts, deadlines] = await Promise.all([
    getOptionalTableRows('contratti', id),
    getOptionalTableRows('scadenze', id),
  ]);

  return {
    employee,
    dynamicFields,
    dynamicFieldsByCategory: groupDynamicFields(dynamicFields),
    contracts,
    deadlines,
  };
}

async function getEmployeeDynamicData(id) {
  await getEmployeeCore(id);
  const dynamicFields = await getDynamicFields(id);

  return {
    dipendente_id: Number(id),
    fields: dynamicFields,
    grouped: groupDynamicFields(dynamicFields),
  };
}

module.exports = {
  getEmployeeDynamicData,
  getEmployeeProfile,
};
