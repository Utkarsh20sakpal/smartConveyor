import app from './app.js';
import { connectDB } from './config/db.js';
import { restoreState } from './services/isolationForestService.js';
import logger from './utils/logger.js';
import { restoreRULState } from './services/rulService.js';

const PORT = process.env.PORT || 3001;

connectDB()
  .then(async () => {
    await restoreState();
    await restoreRULState();

    app.listen(PORT, () => {
      logger.info(`Shield backend running on port ${PORT}`);
    });
  })
  .catch((err) => {
    logger.error('Failed to connect to MongoDB', err);
    process.exit(1);
  });