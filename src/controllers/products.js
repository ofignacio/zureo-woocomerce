import express, { Router } from 'express';
import path from 'path'
import { sync, syncList } from '../services/products';

const PATH = '/products';
const router = Router();

router.post(`${PATH}/sync`, (req, res) => {
  sync();
  res.status(200).send();
});

router.post(`${PATH}/list`, (req, res) => {
  syncList(req.query.codes.split(','));
  res.status(200).send();
});

router.get(`${PATH}/sync`, express.static(path.join(__dirname, 'public')))

export default router;
