import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import syncProducts from './src/cron/products.js';
import products from './src/controllers/products';
import root from './src/controllers';

dotenv.config();
const app = express();

app.use(cors());
app.use(root);
app.use(products);

syncProducts.start();

const port = process.env.PORT || 80;
app.listen(port, () => {
  console.log(`SERVER START ON PORT: ${port}`);
});
