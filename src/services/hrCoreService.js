const fs = require('fs');
const csv = require('csv-parser');
const db = require('../db');

const DELIMITER_CANDIDATES = [',', ';', '\t', '|'];

const FIELD_ALIASES = {
  codice_soggetto: ['codice soggetto'],
  matricola: ['matricola'],
  tracciato_paghe: ['tracciato paghe'],
  numero_badge: ['numero badge'],
  alias: ['alias'],
  nome: ['nome'],
  cognome: ['cognome'],
  codice_fiscale: ['codice fiscale', 'cf'],
  sesso: ['sesso'],
  data_nascita: ['data nascita'],
  luogo_nascita: ['luogo nascita'],
  provincia_nascita: ['provincia nascita'],
  cittadinanza: ['cittadinanza'],
  data_assunzione: ['data assunzione'],
  data_licenziamento: ['data licenziamento'],
  data_anzianita: ['data anzianita', 'data anzianità'],
  azienda: ['azienda'],
  unita_locale: ['unita locale', 'unità locale'],
  segmento: ['segmento'],
  ccnl: ['ccnl'],
  livello: ['livello'],
  qualifica: ['qualifica'],
  mansione: ['mansione'],
  ruolo: ['ruolo'],
  tipo_contratto: ['tipo contratto'],
  contratto: ['contratto'],
  termine_contrattuale: ['termine contrattuale'],
  ore_giornaliere: ['ore giornaliere'],
  ore_settimanali: ['ore settimanali'],
  email: ['e mail', 'e-mail', 'email'],
  cellulare: ['cellulare'],
  telefono: ['telefono'],
  pec: ['pec'],
  indirizzo_residenza: ['indirizzo residenza'],
  comune_residenza: ['comune residenza'],
  provincia_residenza: ['provincia residenza'],
  cap_residenza: ['cap residenza'],
  indirizzo_domicilio: ['indirizzo domicilio'],
  comune_domicilio: ['comune domicilio'],
  provincia_domicilio: ['provincia domicilio'],
  cap_domicilio: ['cap domicilio'],
  iban: ['iban'],
  disabilita: ['disabilita', 'disabilità'],
  titolo_studio: ['titolo di studio', 'titolo studio'],
  codice_titolo_studio: ['codice titolo studio'],
  rilascio_titolo_studio: ['rilascio titolo studio'],
  ente_titolo_studio: ['ente titolo studio'],
  prefettura: ['prefettura'],
  rin_decreto: ['rin decreto', 'rin. decreto'],
  scad_decreto: ['scad decreto', 'scad. decreto'],
  nr_libretto_pistola: ['nr libretto pistola', 'nr. libretto pistola'],
  rin_libretto_pistola: ['rin libretto pistola', 'rin. libretto pistola'],
  scad_libretto_pistola: ['scad libretto pistola', 'scad. libretto pistola'],
  rin_licenza_pistola: ['rin licenza pistola', 'rin. licenza pistola'],
  scad_licenza_pistola: ['scad licenza pistola', 'scad. licenza pistola'],
  nr_libretto_fucile: ['nr libretto fucile', 'nr. libretto fucile'],
  rin_libretto_fucile: ['rin libretto fucile', 'rin. libretto fucile'],
  scad_libretto_fucile: ['scad libretto fucile', 'scad. libretto fucile'],
  rin_licenza_fucile: ['rin licenza fucile', 'rin. licenza fucile'],
  scad_licenza_fucile: ['scad licenza fucile', 'scad. licenza fucile'],
  poligono: ['poligono'],
  data_validita_poligono: ['dt validita iscrizione poligono', 'data validita poligono', 'data validità poligono'],
  codice_poligono: ['codice poligono'],
  ril_patentino_1: ['ril patentino 1', 'ril. patentino 1'],
  nr_patentino_1: ['nr patentino 1', 'nr. patentino 1'],
  ril_patentino_2: ['ril patentino 2', 'ril. patentino 2'],
  nr_patentino_2: ['nr patentino 2', 'nr. patentino 2'],
  cod_ci: ['cod ci', 'cod. ci'],
  ril_ci: ['ril ci', 'ril. ci'],
  scad_ci: ['scad ci', 'scad. ci'],
  ente_ci: ['ente ci'],
  luogo_den_arma: ['luogo den arma', 'luogo den. arma'],
  data_den_arma: ['data den arma', 'data den. arma'],
  ente_den_arma: ['ente den arma', 'ente den. arma'],
};

const VIGILANZA_FIELDS = [
  'prefettura', 'rin_decreto', 'scad_decreto', 'nr_libretto_pistola', 'rin_libretto_pistola',
  'scad_libretto_pistola', 'rin_licenza_pistola', 'scad_licenza_pistola', 'nr_libretto_fucile',
  'rin_libretto_fucile', 'scad_libretto_fucile', 'rin_licenza_fucile', 'scad_licenza_fucile',
  'poligono', 'data_validita_poligono', 'codice_poligono', 'ril_patentino_1', 'nr_patentino_1',
  'ril_patentino_2', 'nr_patentino_2', 'cod_ci', 'ril_ci', 'scad_ci', 'ente_ci',
  'luogo_den_arma', 'data_den_arma', 'ente_den_arma',
];

const VIGILANZA_DATE_FIELDS = new Set([
  'rin_decreto', 'scad_decreto', 'rin_libretto_pistola', 'scad_libretto_pistola',
  'rin_licenza_pistola', 'scad_licenza_pistola', 'rin_libretto_fucile', 'scad_libretto_fucile',
  'rin_licenza_fucile', 'scad_licenza_fucile', 'data_validita_poligono', 'ril_patentino_1',
  'ril_patentino_2', 'ril_ci', 'scad_ci', 'data_den_arma',
]);

const SCADENZA_SOURCES = [
  { tipo: 'DECRETO', field: 'scad_decreto', descrizione: 'Scadenza decreto prefettizio' },
  { tipo: 'LIBRETTO_PISTOLA', field: 'scad_libretto_pistola', descrizione: 'Scadenza libretto pistola' },
  { tipo: 'LICENZA_PISTOLA', field: 'scad_licenza_pistola', descrizione: 'Scadenza licenza pistola' },
  { tipo: 'LIBRETTO_FUCILE', field: 'scad_libretto_fucile', descrizione: 'Scadenza libretto fucile' },
  { tipo: 'LICENZA_FUCILE', field: 'scad_licenza_fucile', descrizione: 'Scadenza licenza fucile' },
  { tipo: 'POLIGONO', field: 'data_validita_poligono', descrizione: 'Scadenza iscrizione poligono' },
  { tipo: 'PATENTINO_1', field: 'ril_patentino_1', descrizione: 'Rilascio patentino 1' },
  { tipo: 'PATENTINO_2', field: 'ril_patentino_2', descrizione: 'Rilascio patentino 2' },
  { tipo: 'CARTA_IDENTITA', field: 'scad_ci', descrizione: 'Scadenza carta identita' },
];

function normalizeScadenzaStato(value) {
  const normalized = normalizeHeader(value).replace(/\s+/g, '_');
  if (normalized === 'scaduto') return 'scaduto';
  if (normalized === 'in_scadenza') return 'in_scadenza';
  if (normalized === 'regolare') return 'regolare';
  return null;
}

function normalizeScadenzaTipo(value) {
  return String(value || '').trim().replace(/\s+/g, '_').toUpperCase();
}

function normalizeHeader(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function cleanValue(value) {
  if (value === undefined || value === null) return null;
  let normalized = String(value).trim();
  if (normalized.startsWith('="') && normalized.endsWith('"')) normalized = normalized.slice(2, -1);
  if (normalized.startsWith('"') && normalized.endsWith('"')) normalized = normalized.slice(1, -1);
  normalized = normalized.trim().replace(/\s+/g, ' ');
  return normalized || null;
}

function parseItalianDate(value) {
  const normalized = cleanValue(value);
  if (!normalized) return null;

  const italian = normalized.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (italian) {
    const [, day, month, year] = italian;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(normalized)) return normalized;
  return null;
}

function parseNumber(value) {
  const normalized = cleanValue(value);
  if (!normalized) return null;
  const number = Number(normalized.replace(',', '.'));
  return Number.isFinite(number) ? number : null;
}

function detectDelimiter(filePath) {
  const sample = fs.readFileSync(filePath, 'utf8').slice(0, 8192);
  const firstLine = sample.split(/\r?\n/).find((line) => line.trim()) || '';
  return DELIMITER_CANDIDATES.reduce((best, delimiter) => {
    const count = firstLine.split(delimiter).length - 1;
    return count > best.count ? { delimiter, count } : best;
  }, { delimiter: ';', count: 0 }).delimiter;
}

function parseCsv(filePath) {
  return new Promise((resolve, reject) => {
    const delimiter = detectDelimiter(filePath);
    const headers = [];
    const rows = [];

    fs.createReadStream(filePath, { encoding: 'utf8' })
      .pipe(csv({
        separator: delimiter,
        mapHeaders: ({ header }) => {
          const cleanHeader = String(header || '').replace(/^\uFEFF/, '').trim();
          headers.push(cleanHeader);
          return cleanHeader;
        },
      }))
      .on('data', (row) => rows.push(row))
      .on('error', reject)
      .on('end', () => resolve({ delimiter, headers, rows }));
  });
}

function buildMapping(headers) {
  const normalizedHeaders = headers.map((header) => ({ header, normalized: normalizeHeader(header) }));
  const mapping = {};

  for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
    const normalizedAliases = aliases.map(normalizeHeader);
    const match = normalizedHeaders.find((item) => normalizedAliases.includes(item.normalized));
    if (match) mapping[field] = match.header;
  }

  return mapping;
}

function pick(row, mapping, field) {
  return cleanValue(row[mapping[field]]);
}

function normalizeRow(row, mapping) {
  return {
    dipendente: {
      codice_soggetto: pick(row, mapping, 'codice_soggetto'),
      matricola: pick(row, mapping, 'matricola'),
      tracciato_paghe: pick(row, mapping, 'tracciato_paghe'),
      numero_badge: pick(row, mapping, 'numero_badge'),
      alias: pick(row, mapping, 'alias'),
      nome: pick(row, mapping, 'nome'),
      cognome: pick(row, mapping, 'cognome'),
      codice_fiscale: pick(row, mapping, 'codice_fiscale'),
      sesso: pick(row, mapping, 'sesso'),
      data_nascita: parseItalianDate(row[mapping.data_nascita]),
      luogo_nascita: pick(row, mapping, 'luogo_nascita'),
      provincia_nascita: pick(row, mapping, 'provincia_nascita'),
      cittadinanza: pick(row, mapping, 'cittadinanza'),
      azienda: pick(row, mapping, 'azienda'),
      unita_locale: pick(row, mapping, 'unita_locale'),
      segmento: pick(row, mapping, 'segmento'),
      stato: pick(row, mapping, 'data_licenziamento') ? 'cessato' : 'attivo',
    },
    contratto: {
      data_assunzione: parseItalianDate(row[mapping.data_assunzione]),
      data_licenziamento: parseItalianDate(row[mapping.data_licenziamento]),
      data_anzianita: parseItalianDate(row[mapping.data_anzianita]),
      ccnl: pick(row, mapping, 'ccnl'),
      livello: pick(row, mapping, 'livello'),
      qualifica: pick(row, mapping, 'qualifica'),
      mansione: pick(row, mapping, 'mansione'),
      ruolo: pick(row, mapping, 'ruolo'),
      tipo_contratto: pick(row, mapping, 'tipo_contratto'),
      contratto: pick(row, mapping, 'contratto'),
      termine_contrattuale: parseItalianDate(row[mapping.termine_contrattuale]),
      ore_giornaliere: parseNumber(row[mapping.ore_giornaliere]),
      ore_settimanali: parseNumber(row[mapping.ore_settimanali]),
      variazione_contrattuale: null,
    },
    contatti: {
      email: pick(row, mapping, 'email'),
      cellulare: pick(row, mapping, 'cellulare'),
      telefono: pick(row, mapping, 'telefono'),
      pec: pick(row, mapping, 'pec'),
    },
    indirizzi: [
      {
        tipo: 'residenza',
        indirizzo: pick(row, mapping, 'indirizzo_residenza'),
        comune: pick(row, mapping, 'comune_residenza'),
        provincia: pick(row, mapping, 'provincia_residenza'),
        cap: pick(row, mapping, 'cap_residenza'),
      },
      {
        tipo: 'domicilio',
        indirizzo: pick(row, mapping, 'indirizzo_domicilio'),
        comune: pick(row, mapping, 'comune_domicilio'),
        provincia: pick(row, mapping, 'provincia_domicilio'),
        cap: pick(row, mapping, 'cap_domicilio'),
      },
    ],
    amministrativi: {
      iban: pick(row, mapping, 'iban'),
      disabilita: pick(row, mapping, 'disabilita'),
      titolo_studio: pick(row, mapping, 'titolo_studio'),
      codice_titolo_studio: pick(row, mapping, 'codice_titolo_studio'),
      rilascio_titolo_studio: parseItalianDate(row[mapping.rilascio_titolo_studio]),
      ente_titolo_studio: pick(row, mapping, 'ente_titolo_studio'),
    },
    vigilanza: normalizeVigilanza(row, mapping),
  };
}

function normalizeVigilanza(row, mapping) {
  return VIGILANZA_FIELDS.reduce((record, field) => {
    record[field] = VIGILANZA_DATE_FIELDS.has(field)
      ? parseItalianDate(row[mapping[field]])
      : pick(row, mapping, field);
    return record;
  }, {});
}

async function ensureHrCoreTables(client = db) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS hr_dipendenti (
      id BIGSERIAL PRIMARY KEY,
      codice_soggetto TEXT,
      matricola TEXT UNIQUE,
      tracciato_paghe TEXT,
      numero_badge TEXT,
      alias TEXT,
      nome TEXT,
      cognome TEXT,
      codice_fiscale TEXT UNIQUE,
      sesso TEXT,
      data_nascita DATE,
      luogo_nascita TEXT,
      provincia_nascita TEXT,
      cittadinanza TEXT,
      azienda TEXT,
      unita_locale TEXT,
      segmento TEXT,
      stato TEXT NOT NULL DEFAULT 'attivo' CHECK (stato IN ('attivo', 'cessato')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await client.query(`
    CREATE TABLE IF NOT EXISTS hr_contratti (
      id BIGSERIAL PRIMARY KEY,
      dipendente_id BIGINT NOT NULL REFERENCES hr_dipendenti(id) ON DELETE CASCADE,
      data_assunzione DATE,
      data_licenziamento DATE,
      data_anzianita DATE,
      ccnl TEXT,
      livello TEXT,
      qualifica TEXT,
      mansione TEXT,
      ruolo TEXT,
      tipo_contratto TEXT,
      contratto TEXT,
      termine_contrattuale DATE,
      ore_giornaliere NUMERIC(6,2),
      ore_settimanali NUMERIC(6,2),
      variazione_contrattuale TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await client.query(`
    CREATE TABLE IF NOT EXISTS hr_contatti (
      id BIGSERIAL PRIMARY KEY,
      dipendente_id BIGINT NOT NULL UNIQUE REFERENCES hr_dipendenti(id) ON DELETE CASCADE,
      email TEXT,
      cellulare TEXT,
      telefono TEXT,
      pec TEXT
    )
  `);
  await client.query(`
    CREATE TABLE IF NOT EXISTS hr_indirizzi (
      id BIGSERIAL PRIMARY KEY,
      dipendente_id BIGINT NOT NULL REFERENCES hr_dipendenti(id) ON DELETE CASCADE,
      tipo TEXT NOT NULL CHECK (tipo IN ('residenza', 'domicilio')),
      indirizzo TEXT,
      comune TEXT,
      provincia TEXT,
      cap TEXT,
      UNIQUE (dipendente_id, tipo)
    )
  `);
  await client.query(`
    CREATE TABLE IF NOT EXISTS hr_dati_amministrativi (
      id BIGSERIAL PRIMARY KEY,
      dipendente_id BIGINT NOT NULL UNIQUE REFERENCES hr_dipendenti(id) ON DELETE CASCADE,
      iban TEXT,
      disabilita TEXT,
      titolo_studio TEXT,
      codice_titolo_studio TEXT,
      rilascio_titolo_studio DATE,
      ente_titolo_studio TEXT
    )
  `);
  await client.query(`
    CREATE TABLE IF NOT EXISTS hr_vigilanza (
      id BIGSERIAL PRIMARY KEY,
      dipendente_id BIGINT NOT NULL UNIQUE REFERENCES hr_dipendenti(id) ON DELETE CASCADE,
      prefettura TEXT,
      rin_decreto DATE,
      scad_decreto DATE,
      nr_libretto_pistola TEXT,
      rin_libretto_pistola DATE,
      scad_libretto_pistola DATE,
      rin_licenza_pistola DATE,
      scad_licenza_pistola DATE,
      nr_libretto_fucile TEXT,
      rin_libretto_fucile DATE,
      scad_libretto_fucile DATE,
      rin_licenza_fucile DATE,
      scad_licenza_fucile DATE,
      poligono TEXT,
      data_validita_poligono DATE,
      codice_poligono TEXT,
      ril_patentino_1 DATE,
      nr_patentino_1 TEXT,
      ril_patentino_2 DATE,
      nr_patentino_2 TEXT,
      cod_ci TEXT,
      ril_ci DATE,
      scad_ci DATE,
      ente_ci TEXT,
      luogo_den_arma TEXT,
      data_den_arma DATE,
      ente_den_arma TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await client.query(`
    CREATE TABLE IF NOT EXISTS hr_scadenze (
      id BIGSERIAL PRIMARY KEY,
      dipendente_id BIGINT NOT NULL REFERENCES hr_dipendenti(id) ON DELETE CASCADE,
      tipo_scadenza TEXT NOT NULL,
      descrizione TEXT,
      data_scadenza DATE NOT NULL,
      stato TEXT NOT NULL,
      giorni_residui INTEGER NOT NULL,
      origine TEXT,
      riferimento_tabella TEXT,
      riferimento_id BIGINT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (dipendente_id, tipo_scadenza)
    )
  `);
  await client.query(`
    ALTER TABLE hr_scadenze
    DROP CONSTRAINT IF EXISTS hr_scadenze_stato_check
  `);
  await client.query(`
    UPDATE hr_scadenze
    SET
      stato = LOWER(stato),
      origine = LOWER(origine)
  `);
  await client.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'hr_scadenze_stato_check'
          AND conrelid = 'hr_scadenze'::regclass
      ) THEN
        ALTER TABLE hr_scadenze
        ADD CONSTRAINT hr_scadenze_stato_check
        CHECK (stato IN ('regolare', 'in_scadenza', 'scaduto'));
      END IF;
    END $$;
  `);
  await client.query(`
    ALTER TABLE hr_scadenze
    DROP CONSTRAINT IF EXISTS hr_scadenze_dipendente_id_tipo_scadenza_key
  `);
  await client.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS uq_hr_scadenze_dip_tipo_origine_ref
    ON hr_scadenze (dipendente_id, tipo_scadenza, origine, riferimento_tabella)
  `);
}

async function upsertRecord(client, table, uniqueColumn, uniqueValue, dipendenteId, data) {
  const columns = Object.keys(data);
  const values = columns.map((column) => data[column]);
  await client.query(
    `
      INSERT INTO ${table} (dipendente_id, ${uniqueColumn ? `${uniqueColumn}, ` : ''}${columns.join(', ')})
      VALUES ($1, ${uniqueColumn ? '$2, ' : ''}${columns.map((_, index) => `$${index + (uniqueColumn ? 3 : 2)}`).join(', ')})
      ON CONFLICT (dipendente_id${uniqueColumn ? `, ${uniqueColumn}` : ''})
      DO UPDATE SET ${columns.map((column) => `${column} = EXCLUDED.${column}`).join(', ')}
    `,
    [dipendenteId, ...(uniqueColumn ? [uniqueValue] : []), ...values]
  );
}

async function upsertDipendente(client, data) {
  const lookup = await client.query(
    `
      SELECT id FROM hr_dipendenti
      WHERE ($1::text IS NOT NULL AND codice_fiscale = $1)
         OR ($2::text IS NOT NULL AND matricola = $2)
      LIMIT 1
    `,
    [data.codice_fiscale, data.matricola]
  );
  const columns = Object.keys(data);
  const values = columns.map((column) => data[column]);

  if (lookup.rowCount) {
    await client.query(
      `
        UPDATE hr_dipendenti
        SET ${columns.map((column, index) => `${column} = COALESCE($${index + 2}, ${column})`).join(', ')},
            updated_at = NOW()
        WHERE id = $1
      `,
      [lookup.rows[0].id, ...values]
    );
    return { id: lookup.rows[0].id, action: 'updated' };
  }

  const inserted = await client.query(
    `
      INSERT INTO hr_dipendenti (${columns.join(', ')})
      VALUES (${columns.map((_, index) => `$${index + 1}`).join(', ')})
      RETURNING id
    `,
    values
  );
  return { id: inserted.rows[0].id, action: 'created' };
}

async function importCsv(file) {
  const parsed = await parseCsv(file.path);
  const mapping = buildMapping(parsed.headers);
  const report = {
    righe_lette: parsed.rows.length,
    dipendenti_creati: 0,
    dipendenti_aggiornati: 0,
    errori: [],
    righe_saltate: 0,
    delimiter: parsed.delimiter,
  };
  const client = await db.getClient();

  try {
    await client.query('BEGIN');
    await ensureHrCoreTables(client);

    for (const [index, row] of parsed.rows.entries()) {
      const rowNumber = index + 2;
      const normalized = normalizeRow(row, mapping);

      if (!normalized.dipendente.codice_fiscale && !normalized.dipendente.matricola) {
        report.righe_saltate += 1;
        report.errori.push({ riga: rowNumber, messaggio: 'Codice fiscale o matricola obbligatori per riconoscere il dipendente.' });
        continue;
      }

      try {
        const employee = await upsertDipendente(client, normalized.dipendente);
        if (employee.action === 'created') report.dipendenti_creati += 1;
        if (employee.action === 'updated') report.dipendenti_aggiornati += 1;

        await upsertRecord(client, 'hr_contatti', null, null, employee.id, normalized.contatti);
        await upsertRecord(client, 'hr_dati_amministrativi', null, null, employee.id, normalized.amministrativi);
        const vigilanza = await upsertVigilanza(client, employee.id, normalized.vigilanza);
        if (vigilanza) await rigeneraScadenzeDipendente(client, employee.id);

        if (Object.values(normalized.contratto).some((value) => value !== null)) {
          await client.query(
            `
              INSERT INTO hr_contratti (dipendente_id, ${Object.keys(normalized.contratto).join(', ')})
              VALUES ($1, ${Object.keys(normalized.contratto).map((_, i) => `$${i + 2}`).join(', ')})
            `,
            [employee.id, ...Object.values(normalized.contratto)]
          );
        }

        for (const address of normalized.indirizzi) {
          await upsertRecord(client, 'hr_indirizzi', 'tipo', address.tipo, employee.id, {
            indirizzo: address.indirizzo,
            comune: address.comune,
            provincia: address.provincia,
            cap: address.cap,
          });
        }
      } catch (error) {
        report.righe_saltate += 1;
        report.errori.push({ riga: rowNumber, messaggio: error.message });
      }
    }

    await client.query('COMMIT');
    return report;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    fs.unlink(file.path, () => {});
  }
}

async function listDipendenti(search = '') {
  await ensureHrCoreTables();
  const result = await db.query(
    `
      SELECT d.*, c.email, c.cellulare, c.telefono
      FROM hr_dipendenti d
      LEFT JOIN hr_contatti c ON c.dipendente_id = d.id
      WHERE $1 = ''
         OR d.nome ILIKE $2
         OR d.cognome ILIKE $2
         OR d.codice_fiscale ILIKE $2
         OR d.matricola ILIKE $2
      ORDER BY d.cognome ASC NULLS LAST, d.nome ASC NULLS LAST
    `,
    [search, `%${search}%`]
  );
  return result.rows;
}

async function getDashboard() {
  await ensureHrCoreTables();

  const result = await db.query(`
    SELECT
      COUNT(*) FILTER (WHERE d.stato = 'attivo')::int AS dipendenti_attivi,
      COUNT(*) FILTER (WHERE d.stato = 'cessato')::int AS dipendenti_cessati,
      COUNT(*) FILTER (WHERE d.stato = 'attivo' AND (LOWER(COALESCE(c.ccnl, '')) LIKE '%vigilanza%' OR LOWER(COALESCE(c.qualifica, '')) LIKE '%gpg%' OR LOWER(COALESCE(c.mansione, '')) LIKE '%guardia%'))::int AS gpg,
      COUNT(*) FILTER (WHERE d.stato = 'attivo' AND (LOWER(COALESCE(c.ccnl, '')) LIKE '%fiduciari%' OR LOWER(COALESCE(c.qualifica, '')) LIKE '%fiduciari%' OR LOWER(COALESCE(c.mansione, '')) LIKE '%fiduciari%'))::int AS servizi_fiduciari,
      COUNT(*) FILTER (WHERE c.data_assunzione >= date_trunc('month', CURRENT_DATE))::int AS nuove_assunzioni_mese,
      COUNT(*) FILTER (WHERE c.data_licenziamento >= date_trunc('month', CURRENT_DATE))::int AS cessazioni_mese,
      (SELECT COUNT(*) FROM hr_scadenze s WHERE s.stato = 'in_scadenza')::int AS scadenze_entro_60,
      (SELECT COUNT(*) FROM hr_scadenze s WHERE s.stato = 'scaduto')::int AS scadenze_scadute
    FROM hr_dipendenti d
    LEFT JOIN LATERAL (
      SELECT *
      FROM hr_contratti hc
      WHERE hc.dipendente_id = d.id
      ORDER BY hc.created_at DESC, hc.id DESC
      LIMIT 1
    ) c ON true
  `);

  const ccnl = await db.query(`
    SELECT COALESCE(NULLIF(c.ccnl, ''), 'Non indicato') AS label, COUNT(*)::int AS value
    FROM hr_dipendenti d
    LEFT JOIN LATERAL (
      SELECT * FROM hr_contratti hc WHERE hc.dipendente_id = d.id ORDER BY hc.created_at DESC, hc.id DESC LIMIT 1
    ) c ON true
    GROUP BY label
    ORDER BY value DESC
    LIMIT 8
  `);

  const livelli = await db.query(`
    SELECT COALESCE(NULLIF(c.livello, ''), 'Non indicato') AS label, COUNT(*)::int AS value
    FROM hr_dipendenti d
    LEFT JOIN LATERAL (
      SELECT * FROM hr_contratti hc WHERE hc.dipendente_id = d.id ORDER BY hc.created_at DESC, hc.id DESC LIMIT 1
    ) c ON true
    GROUP BY label
    ORDER BY value DESC
    LIMIT 8
  `);

  const contratti = await db.query(`
    SELECT
      CASE
        WHEN COALESCE(c.ore_settimanali, 0) >= 38 THEN 'Full time'
        WHEN c.ore_settimanali IS NULL THEN 'Non indicato'
        ELSE 'Part time'
      END AS label,
      COUNT(*)::int AS value
    FROM hr_dipendenti d
    LEFT JOIN LATERAL (
      SELECT * FROM hr_contratti hc WHERE hc.dipendente_id = d.id ORDER BY hc.created_at DESC, hc.id DESC LIMIT 1
    ) c ON true
    GROUP BY label
    ORDER BY value DESC
  `);

  return {
    kpi: {
      dipendenti_attivi: result.rows[0]?.dipendenti_attivi || 0,
      dipendenti_cessati: result.rows[0]?.dipendenti_cessati || 0,
      gpg: result.rows[0]?.gpg || 0,
      servizi_fiduciari: result.rows[0]?.servizi_fiduciari || 0,
      scadenze_entro_30: result.rows[0]?.scadenze_entro_60 || 0,
      scadenze_scadute: result.rows[0]?.scadenze_scadute || 0,
      nuove_assunzioni_mese: result.rows[0]?.nuove_assunzioni_mese || 0,
      cessazioni_mese: result.rows[0]?.cessazioni_mese || 0,
    },
    charts: {
      ccnl: ccnl.rows,
      livelli: livelli.rows,
      contratti: contratti.rows,
      scadenze_tipologia: await getScadenzeTipologiaRows(),
      top_scadenze: await getScadenze({ limit: 10 }),
    },
  };
}

async function getScadenzeTipologiaRows() {
  await ensureHrCoreTables();
  const result = await db.query(`
    SELECT tipo_scadenza AS label, COUNT(*)::int AS value
    FROM hr_scadenze
    GROUP BY tipo_scadenza
    ORDER BY value DESC, label ASC
  `);
  return result.rows;
}

async function getDipendente(id) {
  await ensureHrCoreTables();
  const employee = await db.query('SELECT * FROM hr_dipendenti WHERE id = $1', [id]);
  if (!employee.rowCount) {
    const error = new Error('Dipendente non trovato');
    error.status = 404;
    throw error;
  }
  const [contratto, contatti, indirizzi, amministrativo, vigilanza, scadenze] = await Promise.all([
    getContratto(id),
    getContatti(id),
    getIndirizzi(id),
    getAmministrativo(id),
    getVigilanza(id),
    getScadenze({ dipendente_id: id }),
  ]);
  return { dipendente: employee.rows[0], contratto, contatti, indirizzi, amministrativo, vigilanza, scadenze };
}

async function updateDipendente(id, payload) {
  await ensureHrCoreTables();
  const allowed = [
    'codice_soggetto', 'matricola', 'tracciato_paghe', 'numero_badge', 'alias', 'nome', 'cognome',
    'codice_fiscale', 'sesso', 'data_nascita', 'luogo_nascita', 'provincia_nascita',
    'cittadinanza', 'azienda', 'unita_locale', 'segmento', 'stato',
  ];
  const entries = allowed.filter((field) => Object.prototype.hasOwnProperty.call(payload, field));
  if (!entries.length) return getDipendente(id);
  const values = entries.map((field) => field.startsWith('data_') ? parseItalianDate(payload[field]) || payload[field] || null : cleanValue(payload[field]));
  await db.query(
    `
      UPDATE hr_dipendenti
      SET ${entries.map((field, index) => `${field} = $${index + 2}`).join(', ')}, updated_at = NOW()
      WHERE id = $1
    `,
    [id, ...values]
  );
  return getDipendente(id);
}

async function getContratto(id) {
  await ensureHrCoreTables();
  const result = await db.query('SELECT * FROM hr_contratti WHERE dipendente_id = $1 ORDER BY created_at DESC, id DESC LIMIT 1', [id]);
  return result.rows[0] || null;
}

async function getContatti(id) {
  await ensureHrCoreTables();
  const result = await db.query('SELECT * FROM hr_contatti WHERE dipendente_id = $1', [id]);
  return result.rows[0] || null;
}

async function getIndirizzi(id) {
  await ensureHrCoreTables();
  const result = await db.query('SELECT * FROM hr_indirizzi WHERE dipendente_id = $1 ORDER BY tipo DESC', [id]);
  return result.rows;
}

async function getAmministrativo(id) {
  await ensureHrCoreTables();
  const result = await db.query('SELECT * FROM hr_dati_amministrativi WHERE dipendente_id = $1', [id]);
  return result.rows[0] || null;
}

async function upsertVigilanza(client, dipendenteId, data) {
  const cleanData = {};
  for (const field of VIGILANZA_FIELDS) cleanData[field] = data?.[field] ?? null;
  if (!Object.values(cleanData).some((value) => value !== null && value !== '')) return null;
  const columns = Object.keys(cleanData);
  const result = await client.query(
    `
      INSERT INTO hr_vigilanza (dipendente_id, ${columns.join(', ')})
      VALUES ($1, ${columns.map((_, index) => `$${index + 2}`).join(', ')})
      ON CONFLICT (dipendente_id)
      DO UPDATE SET ${columns.map((column) => `${column} = EXCLUDED.${column}`).join(', ')}, updated_at = NOW()
      RETURNING *
    `,
    [dipendenteId, ...Object.values(cleanData)]
  );
  return result.rows[0];
}

async function getVigilanza(id) {
  await ensureHrCoreTables();
  const result = await db.query('SELECT * FROM hr_vigilanza WHERE dipendente_id = $1', [id]);
  return result.rows[0] || null;
}

async function updateVigilanza(id, payload) {
  await ensureHrCoreTables();
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const data = VIGILANZA_FIELDS.reduce((record, field) => {
      const value = payload?.[field];
      record[field] = VIGILANZA_DATE_FIELDS.has(field) ? parseItalianDate(value) || value || null : cleanValue(value);
      return record;
    }, {});
    const vigilanza = await upsertVigilanza(client, id, data);
    await rigeneraScadenzeDipendente(client, id);
    await client.query('COMMIT');
    return vigilanza || getVigilanza(id);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

function getScadenzaState(dateValue) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(dateValue);
  date.setHours(0, 0, 0, 0);
  const giorni = Math.ceil((date - today) / (1000 * 60 * 60 * 24));
  return {
    giorni,
    stato: giorni < 0 ? 'scaduto' : giorni <= 60 ? 'in_scadenza' : 'regolare',
  };
}

async function rigeneraScadenzeDipendente(client, dipendenteId) {
  const vigilanzaResult = await client.query('SELECT * FROM hr_vigilanza WHERE dipendente_id = $1', [dipendenteId]);
  const vigilanza = vigilanzaResult.rows[0];
  if (!vigilanza) return 0;
  let count = 0;
  for (const source of SCADENZA_SOURCES) {
    const date = vigilanza[source.field];
    if (!date) continue;
    const state = getScadenzaState(date);
    await client.query(
      `
        INSERT INTO hr_scadenze (
          dipendente_id, tipo_scadenza, descrizione, data_scadenza, stato, giorni_residui,
          origine, riferimento_tabella, riferimento_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, 'vigilanza', 'hr_vigilanza', $7)
        ON CONFLICT (dipendente_id, tipo_scadenza, origine, riferimento_tabella)
        DO UPDATE SET
          descrizione = EXCLUDED.descrizione,
          data_scadenza = EXCLUDED.data_scadenza,
          stato = EXCLUDED.stato,
          giorni_residui = EXCLUDED.giorni_residui,
          origine = EXCLUDED.origine,
          riferimento_tabella = EXCLUDED.riferimento_tabella,
          riferimento_id = EXCLUDED.riferimento_id,
          updated_at = NOW()
      `,
      [dipendenteId, source.tipo, source.descrizione, date, state.stato, state.giorni, vigilanza.id]
    );
    count += 1;
  }
  return count;
}

async function rigeneraScadenze() {
  await ensureHrCoreTables();
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const ids = await client.query('SELECT dipendente_id FROM hr_vigilanza');
    let generate = 0;
    for (const row of ids.rows) generate += await rigeneraScadenzeDipendente(client, row.dipendente_id);
    await client.query('COMMIT');
    return { dipendenti: ids.rowCount, scadenze_generate: generate };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function getScadenze(filters = {}) {
  await ensureHrCoreTables();
  const where = [];
  const values = [];
  function add(condition, value) {
    values.push(value);
    where.push(condition.replace('?', `$${values.length}`));
  }
  if (filters.stato) add('s.stato = ?', normalizeScadenzaStato(filters.stato) || filters.stato);
  if (filters.tipo) add('s.tipo_scadenza = ?', normalizeScadenzaTipo(filters.tipo));
  if (filters.origine) add('s.origine = ?', normalizeHeader(filters.origine));
  if (filters.dipendente_id) add('s.dipendente_id = ?', filters.dipendente_id);
  if (filters.dipendente) {
    values.push(`%${filters.dipendente}%`, `%${filters.dipendente}%`);
    where.push(`(d.nome ILIKE $${values.length - 1} OR d.cognome ILIKE $${values.length})`);
  }
  if (filters.matricola) add('d.matricola ILIKE ?', `%${filters.matricola}%`);
  if (filters.data_da) add('s.data_scadenza >= ?', filters.data_da);
  if (filters.data_a) add('s.data_scadenza <= ?', filters.data_a);
  const limit = Number(filters.limit || 500);
  const result = await db.query(
    `
      SELECT s.*, d.nome, d.cognome, d.matricola, d.codice_fiscale
      FROM hr_scadenze s
      JOIN hr_dipendenti d ON d.id = s.dipendente_id
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY s.data_scadenza ASC, s.giorni_residui ASC
      LIMIT ${Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 1000) : 500}
    `,
    values
  );
  return result.rows.map((row) => ({
    ...row,
    rinnovo_context: {
      scadenza_id: row.id,
      dipendente_id: row.dipendente_id,
      tipo_scadenza: row.tipo_scadenza,
      origine: row.origine,
      path: `/hr/rinnovi?scadenza_id=${row.id}&dipendente_id=${row.dipendente_id}&tipo=${encodeURIComponent(row.tipo_scadenza)}&origine=${encodeURIComponent(row.origine || 'vigilanza')}`,
    },
  }));
}

async function getDashboardScadenze() {
  await ensureHrCoreTables();
  const [counts, prossime, tipologia] = await Promise.all([
    db.query(`
      SELECT
        COUNT(*) FILTER (WHERE stato = 'scaduto')::int AS scadute,
        COUNT(*) FILTER (WHERE stato = 'in_scadenza')::int AS in_scadenza,
        COUNT(*) FILTER (WHERE stato = 'regolare')::int AS regolari,
        COUNT(*)::int AS totale
      FROM hr_scadenze
    `),
    getScadenze({ limit: 20 }),
    getScadenzeTipologiaRows(),
  ]);
  return { ...counts.rows[0], prossime, tipologia };
}

module.exports = {
  ensureHrCoreTables,
  getAmministrativo,
  getContatti,
  getContratto,
  getDipendente,
  getIndirizzi,
  getDashboard,
  getDashboardScadenze,
  getScadenze,
  getVigilanza,
  importCsv,
  listDipendenti,
  rigeneraScadenze,
  updateVigilanza,
  updateDipendente,
};
