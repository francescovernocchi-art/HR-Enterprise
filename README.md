# VIS Enterprise HR

Modulo HR integrato per VIS Enterprise, pensato per istituti di vigilanza privata.

## Funzionalita principali

- Backend Node.js / Express
- Database PostgreSQL
- Frontend React / Vite
- Import CSV da gestionale paghe
- Anagrafiche dipendenti
- Scheda dipendente enterprise
- Dati contrattuali, contatti, indirizzi e amministrativi
- Dati vigilanza: decreti, libretti, licenze, poligono, patentini, carta identita e denuncia arma
- Scadenzario automatico con stati `regolare`, `in_scadenza`, `scaduto`
- Collegamento scadenze al flusso Rinnovi/Bollettini tramite contesto rinnovo

## Struttura

```text
src/                  Backend Express
frontend/             Frontend React
scripts/              Script di avvio locale
uploads/              Upload CSV temporanei
```

## Avvio locale

1. Configurare `.env` partendo da `.env.example`.
2. Installare le dipendenze backend:

```bash
npm install
```

3. Installare le dipendenze frontend:

```bash
cd frontend
npm install
```

4. Avviare tutto con:

```bash
npm run start:hr
```

In alternativa su Windows usare:

```text
start-vis-enterprise-hr.bat
```

## API principali

- `POST /api/hr/import-csv`
- `GET /api/hr/dipendenti`
- `GET /api/hr/dipendenti/:id`
- `PUT /api/hr/dipendenti/:id`
- `GET /api/hr/dipendenti/:id/vigilanza`
- `PUT /api/hr/dipendenti/:id/vigilanza`
- `GET /api/hr/scadenze`
- `POST /api/hr/scadenze/rigenera`
- `GET /api/hr/dashboard/scadenze`

## Note sicurezza

Non versionare `.env`, password, `node_modules`, build o file temporanei.
