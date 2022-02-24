import cron from 'cron';
import { sync as syncProducts } from '../services/products';

const CronJob = cron.CronJob;

export default new CronJob(
  `0 */${process.env.CHECK_HOURS || 4} * * *`,
  async () => {
    syncProducts();
  },
  null,
  true,
  process.env.ZONE_TIME || 'America/Montevideo'
);
