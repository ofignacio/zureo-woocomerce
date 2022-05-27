import express, { Router } from "express";
import { request } from "http";
import path from "path";

const PATH = "/";
const router = Router();

router.get(`${PATH}`, express.static(path.join(__dirname, "../public")));

router.get(`/logs`, (req, res) => {
  res.download("/var/log/apache2/error_log");
});

export default router;
