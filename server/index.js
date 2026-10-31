import app from './app.js';
import { PORT, HOST } from './config.js';

app.listen(PORT, HOST, () => {
  console.log(`Sayt ishga tushdi: http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
});
