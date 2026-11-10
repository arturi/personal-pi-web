#!/usr/bin/env node
import { effectivePiWebConfig, maxUploadBytes } from "../config.js";
import { buildApp } from "./app.js";

const { config } = effectivePiWebConfig();
const configuredClientDist = process.env["PI_WEB_CLIENT_DIST"];
const app = await buildApp({
  bodyLimit: maxUploadBytes(process.env, config),
  ...(configuredClientDist === undefined || configuredClientDist === "" ? {} : { clientDist: configuredClientDist }),
});
await app.listen({ port: config.port ?? 8504, host: config.host ?? "127.0.0.1" });
