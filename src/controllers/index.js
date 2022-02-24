import express, { Router } from 'express';
import path from 'path'

const PATH = '/';
const router = Router();

router.get(`${PATH}`, express.static(path.join(__dirname, '../public')))

export default router;
