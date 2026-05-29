require('dotenv').config();

const express = require('express');
const cors = require('cors');
const dipendentiRoutes = require('./routes/dipendenti');
const hrImportRoutes = require('./routes/hrImport');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.json({
    status: 'VIS Enterprise API online',
  });
});

app.use('/api/dipendenti', dipendentiRoutes);
app.use('/api/hr', hrImportRoutes);

app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
  });
});

app.use((error, req, res, next) => {
  console.error(error);

  const status = error.status || (error.name === 'MulterError' ? 400 : 500);

  res.status(status).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : error.message,
    details: process.env.NODE_ENV === 'production' ? undefined : error.details,
  });
});

app.listen(port, () => {
  console.log(`VIS Enterprise API listening on port ${port}`);
});
