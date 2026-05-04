const express = require('express');

const app = express();
const PORT = process.env.PORT || 3001;

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`API rodando na porta ${PORT}`);
});
