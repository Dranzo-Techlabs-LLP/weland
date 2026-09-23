<?php
// COPY this file to config.php and fill in DB_PASS + INSTALL_KEY on the server.

// ------------------------------------------------------------------
//  Weland API — settings
//  This file lives SERVER-SIDE only and is never part of a release:
//  it holds the DB password, so it stays put when you deploy. It has
//  settings only; the code is in lib.php, which ships every time.
// ------------------------------------------------------------------
declare(strict_types=1);

// ---- MySQL credentials (edit these on the server) ----
const DB_HOST = 'localhost';
const DB_NAME = 'weland';
const DB_USER = 'weland_app';
const DB_PASS = '__SET_DB_PASSWORD__';        // weland_app@localhost — scoped to the weland schema
const DB_CHARSET = 'utf8mb4';

// ---- Guards install.php in the browser. (Terminal `php install.php` needs no key.) ----
const INSTALL_KEY = '__SET_INSTALL_KEY__';

// ---- Website enquiry form (POST /api/enquiry) ----
//  Where enquiries from the website are emailed. While this is empty the form
//  asks guests to call or WhatsApp instead (the details still go to the PHP
//  error log, so nothing is lost).
const ENQUIRY_TO_EMAIL = '';
//  Sender address. Use a mailbox on this domain so the mail isn't marked spam.
const ENQUIRY_FROM_EMAIL = 'enquiry@welandresort.com';
//  Local development only: write enquiries to the error log instead of mailing.
const ENQUIRY_LOG_ONLY = false;

// ---- Origins allowed to call this API from a browser ----
//  (In production the website, the admin SPA and the API share one origin, so
//   CORS is not even needed there; the localhost entries are only for dev:
//   5173 = admin `npm run dev`, 3050 = website `npm run dev:site`.)
const ALLOWED_ORIGINS = [
  'https://welandresort.com',
  'https://www.welandresort.com',
  'http://localhost:5173',
  'http://localhost:5199',
  'http://localhost:3050',
];
