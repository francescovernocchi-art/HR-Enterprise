const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const db = require('../db');

const CORE_FIELDS = [
  'matricola',
  'nome',
  'cognome',
  'codice_fiscale',
  'email',
  'cellulare',
  'telefono',
];
const ANALYSIS_FIELDS = ['ccnl', 'contratto', 'data_licenziamento'];
const MAPPING_FIELDS = [...CORE_FIELDS, ...ANALYSIS_FIELDS];

const REQUIRED_FIELDS = [];
const PREVIEW_LIMIT = 50;
const DELIMITER_CANDIDATES = [',', ';', '\t', '|'];
const PROGRESS_UPDATE_INTERVAL = 10;
const importSessionErrors = new Map();

const CORE_FIELD_LABELS = {
  matricola: 'Matricola',
  nome: 'Nome',
  cognome: 'Cognome',
  codice_fiscale: 'Codice fiscale',
  email: 'Email',
  cellulare: 'Cellulare',
  telefono: 'Telefono',
  ccnl: 'CCNL',
  contratto: 'Contratto',
  data_licenziamento: 'Data licenziamento',
};

const CORE_FIELD_ALIASES = {
  matricola: ['matricola', 'employee id', 'employee number', 'codice dipendente', 'numero badge'],
  nome: ['nome', 'name', 'first name', 'firstname', 'cognome nome', 'nominativo'],
  cognome: ['cognome', 'surname', 'last name', 'lastname', 'cognome nome', 'nominativo'],
  codice_fiscale: ['codice fiscale', 'cod fiscale', 'cod fiscale', 'cod fisc', 'cod fiscale', 'cod fiscale', 'cod fiscale', 'cod fiscale', 'codice_fiscale', 'cod fiscale', 'cod fiscale dipendente', 'cod fiscale soggetto', 'cf', 'c f', 'fiscal code', 'tax code'],
  email: ['email', 'e mail', 'e-mail', 'mail', 'indirizzo email'],
  cellulare: ['cellulare', 'mobile', 'cell', 'telefono cellulare', 'tel cellulare'],
  telefono: ['telefono', 'phone', 'telephone', 'tel', 'recapito telefonico'],
  ccnl: ['ccnl'],
  contratto: ['contratto'],
  data_licenziamento: ['data licenziamento', 'data cessazione'],
};

const DATE_FIELD_HINTS = [
  'data',
  'dt ',
  'date',
  'scad',
  'ril ',
  'validita',
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

function normalizeValue(value) {
  if (value === undefined || value === null) {
    return null;
  }

  let normalized = String(value).trim();

  if (normalized.length >= 3 && normalized.startsWith('="') && normalized.endsWith('"')) {
    normalized = normalized.slice(2, -1);
  }

  if (normalized.length >= 2 && normalized.startsWith('"') && normalized.endsWith('"')) {
    normalized = normalized.slice(1, -1);
  }

  normalized = normalized.trim().replace(/\s+/g, ' ');
  return normalized === '' ? null : normalized;
}

function detectDelimiter(filePath) {
  const sample = fs.readFileSync(filePath, 'utf8').slice(0, 8192);
  const firstLine = sample.split(/\r?\n/).find((line) => line.trim()) || '';

  return DELIMITER_CANDIDATES.reduce(
    (best, delimiter) => {
      const count = firstLine.split(delimiter).length - 1;
      return count > best.count ? { delimiter, count } : best;
    },
    { delimiter: ',', count: 0 }
  ).delimiter;
}

function parseCsv(filePath) {
  return new Promise((resolve, reject) => {
    const delimiter = detectDelimiter(filePath);
    const headers = [];
    const rows = [];

    fs.createReadStream(filePath, { encoding: 'utf8' })
      .pipe(
        csv({
          separator: delimiter,
          mapHeaders: ({ header }) => {
            const originalHeader = String(header || '').replace(/^\uFEFF/, '').trim();
            headers.push(originalHeader);
            return originalHeader;
          },
        })
      )
      .on('data', (row) => rows.push(row))
      .on('error', reject)
      .on('end', () => resolve({ delimiter, headers, rows }));
  });
}

function buildCoreFieldMapping(headers, overrides = {}) {
  const mapping = {};
  const normalizedHeaders = headers.map((header) => ({
    original: header,
    normalized: normalizeText(header),
  }));

  for (const field of MAPPING_FIELDS) {
    if (overrides[field] && headers.includes(overrides[field])) {
      mapping[field] = overrides[field];
      continue;
    }

    const aliases = (CORE_FIELD_ALIASES[field] || []).map(normalizeText);
    const exactMatch = normalizedHeaders.find((header) => aliases.includes(header.normalized));
    const partialMatch = normalizedHeaders.find((header) =>
      aliases.some((alias) => alias && header.normalized.includes(alias))
    );
    const match = exactMatch || partialMatch;

    if (match) {
      mapping[field] = match.original;
    }
  }

  return mapping;
}

function splitFullName(value) {
  const normalized = normalizeValue(value);

  if (!normalized) {
    return { nome: null, cognome: null };
  }

  const parts = normalized.split(' ').filter(Boolean);

  if (parts.length <= 1) {
    return { nome: normalized, cognome: null };
  }

  return {
    cognome: parts[0],
    nome: parts.slice(1).join(' '),
  };
}

function getCoreEmployee(row, mapping) {
  const employee = CORE_FIELDS.reduce((record, field) => {
    const header = mapping[field];
    record[field] = header ? normalizeValue(row[header]) : null;
    return record;
  }, {});

  if (mapping.nome && mapping.nome === mapping.cognome) {
    const fullName = splitFullName(row[mapping.nome]);
    employee.nome = employee.nome || fullName.nome;
    employee.cognome = employee.cognome || fullName.cognome;
  }

  return employee;
}

function isLikelyDateHeader(header) {
  const normalized = ` ${normalizeText(header)} `;
  return DATE_FIELD_HINTS.some((hint) => normalized.includes(` ${hint.trim()} `));
}

function isValidDateValue(value) {
  const normalized = normalizeValue(value);

  if (!normalized) {
    return true;
  }

  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(normalized)) {
    const [day, month, year] = normalized.split('/').map(Number);
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  }

  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(normalized)) {
    return !Number.isNaN(Date.parse(normalized));
  }

  return Number.isNaN(Number(normalized)) && !Number.isNaN(Date.parse(normalized));
}

function getFileDuplicateCodes(rows, mapping) {
  const counts = new Map();

  for (const row of rows) {
    const code = normalizeValue(row[mapping.codice_fiscale]);
    if (code) {
      counts.set(code, (counts.get(code) || 0) + 1);
    }
  }

  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([codiceFiscale, count]) => ({ codice_fiscale: codiceFiscale, count }));
}

async function getDatabaseDuplicateCodes(codes) {
  const uniqueCodes = [...new Set(codes.filter(Boolean))];

  if (uniqueCodes.length === 0) {
    return [];
  }

  const result = await db.query(
    'SELECT codice_fiscale FROM core.dipendenti WHERE codice_fiscale = ANY($1)',
    [uniqueCodes]
  );

  return result.rows.map((row) => row.codice_fiscale);
}

function validateRows(rows, headers, mapping, databaseDuplicates = []) {
  const dbDuplicateSet = new Set(databaseDuplicates);
  const fileDuplicateSet = new Set(getFileDuplicateCodes(rows, mapping).map((item) => item.codice_fiscale));
  const errors = [];
  const warnings = [];

  if (!mapping.codice_fiscale && !mapping.matricola) {
    errors.push({
      row: null,
      field: 'codice_fiscale',
      message: 'Codice fiscale or matricola must be mapped',
    });
  }

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const employee = getCoreEmployee(row, mapping);

    if (!employee.codice_fiscale && !employee.matricola) {
      errors.push({
        row: rowNumber,
        field: 'codice_fiscale',
        message: 'Codice fiscale or matricola is required',
      });
    }

    if (employee.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(employee.email)) {
      errors.push({
        row: rowNumber,
        field: 'email',
        message: 'Email format is invalid',
      });
    }

    if (employee.codice_fiscale && fileDuplicateSet.has(employee.codice_fiscale)) {
      warnings.push({
        row: rowNumber,
        field: 'codice_fiscale',
        message: 'Duplicate codice_fiscale in uploaded file',
      });
    }

    if (employee.codice_fiscale && dbDuplicateSet.has(employee.codice_fiscale)) {
      warnings.push({
        row: rowNumber,
        field: 'codice_fiscale',
        message: 'Employee already exists and will be updated',
      });
    }

    for (const header of headers) {
      if (isLikelyDateHeader(header) && !isValidDateValue(row[header])) {
        errors.push({
          row: rowNumber,
          field: header,
          message: `Date format is invalid for ${header}`,
        });
      }
    }
  });

  return { errors, warnings };
}

function getPreviewFile(previewId) {
  const safePreviewId = path.basename(String(previewId || ''));
  const previewPath = path.join(__dirname, '../../uploads/imports', safePreviewId);

  if (!safePreviewId || !fs.existsSync(previewPath)) {
    const error = new Error('Import preview not found or expired');
    error.status = 404;
    throw error;
  }

  return previewPath;
}

async function ensureDynamicImportTable(client) {
  await client.query('CREATE SCHEMA IF NOT EXISTS hr');
  await client.query(`
    CREATE TABLE IF NOT EXISTS hr.import_log (
      id BIGSERIAL PRIMARY KEY,
      file_name TEXT,
      total_rows INTEGER NOT NULL DEFAULT 0,
      inserted_rows INTEGER NOT NULL DEFAULT 0,
      updated_rows INTEGER NOT NULL DEFAULT 0,
      failed_rows INTEGER NOT NULL DEFAULT 0,
      errors JSONB NOT NULL DEFAULT '[]'::jsonb,
      imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await client.query(`
    CREATE TABLE IF NOT EXISTS hr.dipendenti_dati (
      id BIGSERIAL PRIMARY KEY,
      dipendente_id BIGINT NOT NULL REFERENCES core.dipendenti(id) ON DELETE CASCADE,
      campo TEXT NOT NULL,
      valore TEXT,
      import_id BIGINT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await client.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS uq_dipendenti_dati_dipendente_campo
    ON hr.dipendenti_dati (dipendente_id, campo)
  `);
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_dipendenti_dati_import_id
    ON hr.dipendenti_dati (import_id)
  `);
}

async function ensureImportSessionTable() {
  await db.query('CREATE SCHEMA IF NOT EXISTS hr');
  await db.query(`
    CREATE TABLE IF NOT EXISTS hr.import_sessions (
      id BIGSERIAL PRIMARY KEY,
      stato TEXT NOT NULL,
      totale_righe INTEGER NOT NULL DEFAULT 0,
      righe_processate INTEGER NOT NULL DEFAULT 0,
      inseriti INTEGER NOT NULL DEFAULT 0,
      aggiornati INTEGER NOT NULL DEFAULT 0,
      errori INTEGER NOT NULL DEFAULT 0,
      percentuale INTEGER NOT NULL DEFAULT 0,
      messaggio TEXT,
      started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      completed_at TIMESTAMPTZ
    )
  `);
}

function getProgressPercent(processed, total) {
  if (!total) {
    return 0;
  }

  return Math.min(100, Math.round((processed / total) * 100));
}

async function createImportSession(totalRows = 0, message = 'Uploading CSV') {
  await ensureImportSessionTable();

  const result = await db.query(
    `
      INSERT INTO hr.import_sessions (
        stato,
        totale_righe,
        righe_processate,
        inseriti,
        aggiornati,
        errori,
        percentuale,
        messaggio,
        started_at
      )
      VALUES ('uploading', $1, 0, 0, 0, 0, 0, $2, NOW())
      RETURNING id
    `,
    [totalRows, message]
  );

  return result.rows[0].id;
}

async function updateImportSession(sessionId, patch) {
  if (!sessionId) {
    return;
  }

  const current = await db.query(
    'SELECT * FROM hr.import_sessions WHERE id = $1',
    [sessionId]
  );

  if (!current.rowCount) {
    return;
  }

  const row = current.rows[0];
  const total = patch.totale_righe ?? row.totale_righe;
  const processed = patch.righe_processate ?? row.righe_processate;
  const percent = patch.percentuale ?? getProgressPercent(processed, total);

  await db.query(
    `
      UPDATE hr.import_sessions
      SET
        stato = $2,
        totale_righe = $3,
        righe_processate = $4,
        inseriti = $5,
        aggiornati = $6,
        errori = $7,
        percentuale = $8,
        messaggio = $9,
        completed_at = CASE
          WHEN $2 IN ('completed', 'failed') THEN COALESCE(completed_at, NOW())
          ELSE completed_at
        END
      WHERE id = $1
    `,
    [
      sessionId,
      patch.stato ?? row.stato,
      total,
      processed,
      patch.inseriti ?? row.inseriti,
      patch.aggiornati ?? row.aggiornati,
      patch.errori ?? row.errori,
      percent,
      patch.messaggio ?? row.messaggio,
    ]
  );
}

async function getImportSessionStatus(sessionId) {
  await ensureImportSessionTable();

  const result = await db.query(
    `
      SELECT
        id,
        stato,
        totale_righe,
        righe_processate,
        inseriti,
        aggiornati,
        errori,
        percentuale,
        messaggio,
        started_at,
        completed_at
      FROM hr.import_sessions
      WHERE id = $1
    `,
    [sessionId]
  );

  if (!result.rowCount) {
    const error = new Error('Import session not found');
    error.status = 404;
    throw error;
  }

  const row = result.rows[0];

  return {
    id: row.id,
    percentuale: row.percentuale,
    processate: row.righe_processate,
    totale: row.totale_righe,
    inseriti: row.inseriti,
    aggiornati: row.aggiornati,
    errori: row.errori,
    stato: row.stato,
    messaggio: row.messaggio,
    started_at: row.started_at,
    completed_at: row.completed_at,
    failedRows: importSessionErrors.get(Number(sessionId)) || [],
  };
}

async function upsertEmployee(client, employee) {
  const existing = await client.query(
    'SELECT id FROM core.dipendenti WHERE codice_fiscale = $1 LIMIT 1',
    [employee.codice_fiscale]
  );

  const values = CORE_FIELDS.map((field) => employee[field]);

  if (existing.rowCount > 0) {
    await client.query(
      `
        UPDATE core.dipendenti
        SET
          matricola = COALESCE($1, matricola),
          nome = COALESCE($2, nome),
          cognome = COALESCE($3, cognome),
          email = COALESCE($5, email),
          cellulare = COALESCE($6, cellulare),
          telefono = COALESCE($7, telefono)
        WHERE codice_fiscale = $4
      `,
      values
    );

    return { action: 'updated', dipendenteId: existing.rows[0].id };
  }

  const inserted = await client.query(
    `
      INSERT INTO core.dipendenti (
        matricola,
        nome,
        cognome,
        codice_fiscale,
        email,
        cellulare,
        telefono
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `,
    values
  );

  return { action: 'inserted', dipendenteId: inserted.rows[0].id };
}

async function upsertDynamicFields(client, dipendenteId, importId, row) {
  for (const [campo, rawValue] of Object.entries(row)) {
    await client.query(
      `
        INSERT INTO hr.dipendenti_dati (
          dipendente_id,
          campo,
          valore,
          import_id
        )
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (dipendente_id, campo)
        DO UPDATE SET
          valore = EXCLUDED.valore,
          import_id = EXCLUDED.import_id,
          created_at = NOW()
      `,
      [dipendenteId, campo, normalizeValue(rawValue), importId]
    );
  }
}

async function createImportLog(client, fileName, stats, metadata) {
  const result = await client.query(
    `
      INSERT INTO hr.import_log (
        file_name,
        total_rows,
        inserted_rows,
        updated_rows,
        failed_rows,
        errors,
        imported_at
      )
      VALUES ($1, $2, $3, $4, $5, $6::jsonb, NOW())
      RETURNING id
    `,
    [
      fileName,
      stats.totalRows,
      stats.inserted,
      stats.updated,
      stats.failed,
      JSON.stringify(metadata),
    ]
  );

  return result.rows[0]?.id || null;
}

async function updateImportLog(client, importId, stats, metadata) {
  await client.query(
    `
      UPDATE hr.import_log
      SET
        inserted_rows = $1,
        updated_rows = $2,
        failed_rows = $3,
        errors = $4::jsonb
      WHERE id = $5
    `,
    [
      stats.inserted,
      stats.updated,
      stats.failed,
      JSON.stringify(metadata),
      importId,
    ]
  );
}

async function createPreview(file, overrides = {}) {
  const parsed = await parseCsv(file.path);
  const mapping = buildCoreFieldMapping(parsed.headers, overrides);
  const fiscalCodes = mapping.codice_fiscale
    ? parsed.rows.map((row) => normalizeValue(row[mapping.codice_fiscale]))
    : [];
  const databaseDuplicates = await getDatabaseDuplicateCodes(fiscalCodes);
  const fileDuplicates = getFileDuplicateCodes(parsed.rows, mapping);
  const validation = validateRows(parsed.rows, parsed.headers, mapping, databaseDuplicates);
  const previewId = `${crypto.randomUUID()}-${path.basename(file.filename)}`;

  fs.renameSync(file.path, path.join(path.dirname(file.path), previewId));

  return {
    previewId,
    fileName: file.originalname,
    delimiter: parsed.delimiter,
    encoding: 'utf-8',
    totalRows: parsed.rows.length,
    headers: parsed.headers,
    coreFields: CORE_FIELDS.map((field) => ({
      key: field,
      label: CORE_FIELD_LABELS[field],
      required: REQUIRED_FIELDS.includes(field),
    })),
    mapping,
    previewRows: parsed.rows.slice(0, PREVIEW_LIMIT),
    fileDuplicates,
    databaseDuplicates,
    validation,
  };
}

async function validatePreview(previewId, overrides = {}) {
  const previewPath = getPreviewFile(previewId);
  const parsed = await parseCsv(previewPath);
  const mapping = buildCoreFieldMapping(parsed.headers, overrides);
  const fiscalCodes = mapping.codice_fiscale
    ? parsed.rows.map((row) => normalizeValue(row[mapping.codice_fiscale]))
    : [];
  const databaseDuplicates = await getDatabaseDuplicateCodes(fiscalCodes);
  const fileDuplicates = getFileDuplicateCodes(parsed.rows, mapping);
  const validation = validateRows(parsed.rows, parsed.headers, mapping, databaseDuplicates);

  return {
    previewId,
    delimiter: parsed.delimiter,
    totalRows: parsed.rows.length,
    headers: parsed.headers,
    mapping,
    fileDuplicates,
    databaseDuplicates,
    validation,
  };
}

async function importFromPreview(previewId, overrides = {}, fileName = 'preview-import.csv', options = {}) {
  const { sessionId } = options;
  const previewPath = getPreviewFile(previewId);
  await updateImportSession(sessionId, {
    stato: 'analyzing',
    messaggio: 'Analisi CSV',
    percentuale: 2,
  });
  const parsed = await parseCsv(previewPath);
  const mapping = buildCoreFieldMapping(parsed.headers, overrides);
  const fiscalCodes = mapping.codice_fiscale
    ? parsed.rows.map((row) => normalizeValue(row[mapping.codice_fiscale]))
    : [];
  const databaseDuplicates = await getDatabaseDuplicateCodes(fiscalCodes);
  const validation = validateRows(parsed.rows, parsed.headers, mapping, databaseDuplicates);

  if (validation.errors.length > 0) {
    importSessionErrors.set(Number(sessionId), validation.errors.slice(0, 100));
    await updateImportSession(sessionId, {
      stato: 'failed',
      totale_righe: parsed.rows.length,
      errori: validation.errors.length,
      messaggio: 'Import validation failed',
    });
    const error = new Error('Import validation failed');
    error.status = 422;
    error.details = validation;
    throw error;
  }

  const client = await db.getClient();
  const stats = {
    totalRows: parsed.rows.length,
    inserted: 0,
    updated: 0,
    failed: 0,
    dynamicFieldsImported: 0,
    delimiter: parsed.delimiter,
    headers: parsed.headers,
    coreFieldMapping: mapping,
    errors: [],
  };

  try {
    await client.query('BEGIN');
    await ensureDynamicImportTable(client);
    await updateImportSession(sessionId, {
      stato: 'importing',
      totale_righe: parsed.rows.length,
      messaggio: 'Importazione dipendenti',
    });

    const importId = await createImportLog(client, fileName, stats, {
      delimiter: parsed.delimiter,
      headers: parsed.headers,
      coreFieldMapping: mapping,
      validation,
      status: 'started',
    });

    for (const [index, row] of parsed.rows.entries()) {
      const rowNumber = index + 2;
      const employee = getCoreEmployee(row, mapping);

      try {
        const { action, dipendenteId } = await upsertEmployee(client, employee);
        await upsertDynamicFields(client, dipendenteId, importId, row);
        stats[action] += 1;
        stats.dynamicFieldsImported += Object.keys(row).length;
      } catch (error) {
        stats.failed += 1;
        stats.errors.push({
          row: rowNumber,
          codice_fiscale: employee.codice_fiscale,
          message: error.message,
        });
      }

      const processed = index + 1;

      if (processed === 1 || processed % PROGRESS_UPDATE_INTERVAL === 0 || processed === parsed.rows.length) {
        await updateImportSession(sessionId, {
          stato: 'saving_dynamic_data',
          righe_processate: processed,
          inseriti: stats.inserted,
          aggiornati: stats.updated,
          errori: stats.failed,
          messaggio: 'Salvataggio dati dinamici',
        });
      }
    }

    await updateImportSession(sessionId, {
      stato: 'finalizing',
      righe_processate: parsed.rows.length,
      inseriti: stats.inserted,
      aggiornati: stats.updated,
      errori: stats.failed,
      messaggio: 'Finalizzazione',
      percentuale: 98,
    });

    await updateImportLog(client, importId, stats, {
      delimiter: parsed.delimiter,
      headers: parsed.headers,
      coreFieldMapping: mapping,
      dynamicFieldsImported: stats.dynamicFieldsImported,
      validation,
      errors: stats.errors,
      status: 'completed',
    });

    await client.query('COMMIT');
    importSessionErrors.set(Number(sessionId), stats.errors.slice(0, 100));
    await updateImportSession(sessionId, {
      stato: 'completed',
      righe_processate: parsed.rows.length,
      inseriti: stats.inserted,
      aggiornati: stats.updated,
      errori: stats.failed,
      percentuale: 100,
      messaggio: 'Completato',
    });
    fs.unlink(previewPath, () => {});

    return { importId, ...stats };
  } catch (error) {
    await client.query('ROLLBACK');
    await updateImportSession(sessionId, {
      stato: 'failed',
      errori: stats.failed || 1,
      messaggio: error.message,
    });
    throw error;
  } finally {
    client.release();
  }
}

async function importFromCsv(file) {
  const preview = await createPreview(file);
  return importFromPreview(preview.previewId, preview.mapping, preview.fileName);
}

async function startImportFromCsv(file) {
  const sessionId = await createImportSession(0, 'Uploading CSV');
  const sourcePath = file.path;
  const asyncFile = {
    ...file,
    path: sourcePath,
  };

  setImmediate(async () => {
    try {
      const preview = await createPreview(asyncFile);
      await importFromPreview(preview.previewId, preview.mapping, preview.fileName, { sessionId });
    } catch (error) {
      await updateImportSession(sessionId, {
        stato: 'failed',
        messaggio: error.message,
        errori: 1,
      });
      fs.unlink(sourcePath, () => {});
    }
  });

  return {
    sessionId,
    stato: 'uploading',
    messaggio: 'Uploading CSV',
  };
}

async function startImportFromPreview(previewId, mapping = {}, fileName = 'preview-import.csv') {
  const sessionId = await createImportSession(0, 'Analisi CSV');

  setImmediate(async () => {
    try {
      await importFromPreview(previewId, mapping, fileName, { sessionId });
    } catch (error) {
      await updateImportSession(sessionId, {
        stato: 'failed',
        messaggio: error.message,
        errori: 1,
      });
    }
  });

  return {
    sessionId,
    stato: 'analyzing',
    messaggio: 'Analisi CSV',
  };
}

module.exports = {
  CORE_FIELDS,
  createPreview,
  getImportSessionStatus,
  validatePreview,
  importFromCsv,
  importFromPreview,
  startImportFromCsv,
  startImportFromPreview,
};
