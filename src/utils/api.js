import fetch from "node-fetch";
import fs from "fs";
import mime from "mime";
import FormData from "form-data";
import btoa from "btoa";
import { sleep } from "./extras";

let auth;

const generateToken = async () => {
  const ZUREO_API = process.env.ZUREO_API;
  console.log(`[${new Date().toLocaleString()}]: Call Zureo API to authenticate`, new Date());
  const responseAuth = await fetch(`${ZUREO_API}/sdk/v1/security/login`, {
    method: "POST",
    headers: {
      Cookie: "ASP.NET_SessionId=ees5qyyxsr4nwdzjzoq12iry",
      "Cache-Control": "no-cache",
      "Content-Type": "application/json",
      Authorization: `Basic WkZhY3R1cmEx`,
    },
  });

  if (responseAuth.status != 200) {
    throw new Error(
      `Cannot login to Zureo ${respone.status}, check credentials`
    );
  }

  auth = await responseAuth.json();
};

const refreshToken = async () => {
  const ZUREO_API = process.env.ZUREO_API;
  console.log(`[${new Date().toLocaleString()}]: Call Zureo API to refresh token`, new Date());
  const responseAuth = await fetch(`${ZUREO_API}/sdk/v1/security/refresh`, {
    method: "GET",
    headers: {
      Cookie: "ASP.NET_SessionId=ees5qyyxsr4nwdzjzoq12iry",
      "Cache-Control": "no-cache",
      "Content-Type": "application/json",
      Authorization: `${auth.auth_type} ${auth.token}`,
    },
  });

  if (responseAuth.status != 200) {
    throw new Error(
      `Cannot login to Zureo ${responseAuth.status}, check credentials`
    );
  }

  auth = await responseAuth.json();
};

export const fetchZ = async (route, { method = "GET", params }) => {
  const ZUREO_API = process.env.ZUREO_API;

  if (!auth) {
    await generateToken();
  }

  let path;
  if (ZUREO_API[ZUREO_API.length - 1] === "/" && route[0] !== "/") {
    path = `${ZUREO_API}${route}`;
  } else if (ZUREO_API[ZUREO_API.length - 1] === "/" && route[0] === "/") {
    path = `${ZUREO_API}${route.substring(1, route.length)}`;
  } else if (ZUREO_API[ZUREO_API.length - 1] !== "/" && route[0] !== "/") {
    path = `${ZUREO_API}/${route}`;
  } else {
    path = `${ZUREO_API}${route}`;
  }

  if (method === "GET" && params && Object.keys(params).length > 0) {
    path = `${path}?${new URLSearchParams(params)}`;
  }

  const response = await fetch(path, {
    method,
    headers: {
      Authorization: `${auth.auth_type} ${auth.token}`,
      Cookie: "ASP.NET_SessionId=ees5qyyxsr4nwdzjzoq12iry",
      "Cache-Control": "no-cache",
      "Content-Type": "application/json",
      body: method === "GET" ? null : JSON.stringify(params),
    },
  });

  if (response.status === 401) {
    console.log(`[${new Date().toLocaleString()}]: Failed to auth, checking...`);
    await generateToken();
    await fetchZ(route, { method, params });
  } else if (response.status === 429) {
    console.log(`[${new Date().toLocaleString()}]: Too many request, wait 20 minutes`, new Date());
    await sleep(1300000);
    await fetchZ(route, { method, params });
  } else if (response.status != 200) {
    throw new Error(
      `Cannot fetch to Zureo ${response.status}, verify path ${path}`
    );
  }

  return await response.json();
};

export const fetchW = async (route, { method = "GET", params }) => {
  const WOO_API = process.env.WOO_API;
  let path;
  if (WOO_API[WOO_API.length - 1] === "/" && route[0] !== "/") {
    path = `${WOO_API}${route}`;
  } else if (WOO_API[WOO_API.length - 1] === "/" && route[0] === "/") {
    path = `${WOO_API}${route.substring(1, route.length)}`;
  } else if (WOO_API[WOO_API.length - 1] !== "/" && route[0] !== "/") {
    path = `${WOO_API}/${route}`;
  } else {
    path = `${WOO_API}${route}`;
  }

  const oauth = {
    consumer_key: process.env.WOO_CK,
    consumer_secret: process.env.WOO_CS,
  };

  if (method === "GET" && params && Object.keys(params).length > 0) {
    Object.assign(oauth, params);
  }

  path = `${path}?${new URLSearchParams(oauth)}`;

  const response = await fetch(path, {
    method,
    headers: {
      "Cache-Control": "no-cache",
      "Content-Type": "application/json",
    },
    body: method === "GET" ? null : params ? JSON.stringify(params) : null,
  });

  if (response.status !== 200 && response.status !== 201) {
    throw new Error(
      `Cannot fetch, verify path ${path} and ${method}, Response: ${JSON.stringify(
        response
      )}`
    );
  }

  return await response.json();
};

export const fetchWFile = async (route, { file, filename }) => {
  const WOO_API = process.env.WOO_API;
  let path;
  if (WOO_API[WOO_API.length - 1] === "/" && route[0] !== "/") {
    path = `${WOO_API}${route}`;
  } else if (WOO_API[WOO_API.length - 1] === "/" && route[0] === "/") {
    path = `${WOO_API}${route.substring(1, route.length)}`;
  } else if (WOO_API[WOO_API.length - 1] !== "/" && route[0] !== "/") {
    path = `${WOO_API}/${route}`;
  } else {
    path = `${WOO_API}${route}`;
  }

  const body = new FormData();
  body.append("file", file, {
    contentType: mime.getType(filename),
    filename,
  });

  let data = {};
  Object.assign(
    data,
    {
      "Content-Disposition": `attachment; filename=${filename}`,
      Authorization: `Basic ${btoa(
        `${process.env.WP_ADMIN_USER}:${process.env.WP_ADMIN_PASS}`
      )}`,
    },
    body.getHeaders()
  );

  const response = await fetch(path, {
    method: "POST",
    headers: data,
    body,
  });

  if (response.status !== 200 && response.status !== 201) {
    throw new Error(
      `Cannot fetch, verify path ${path} and POST | Stauts: ${response.status} | ${response.statusText}`
    );
  }

  return await response.json();
};
