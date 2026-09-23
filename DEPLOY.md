# Deploying to welandresort.com (cPanel)

What goes where after this deploy:

| Address | Serves |
| --- | --- |
| `https://welandresort.com/` | the website |
| `https://welandresort.com/admin` | the admin app (staff sign in here) |
| `https://welandresort.com/api` | the PHP API (unchanged database) |

`www.welandresort.com` forwards to `welandresort.com`, and old admin links
such as `/login` or `/bookings/KV-00012` forward to the same page under `/admin`.

## Make the zip

```bash
npm run release
```

This builds the website and the admin and writes
`release/welandresort-deploy-YYYYMMDD-HHMM.zip`. The zip holds only what
`public_html` needs. It never contains `api/config.php` (your database
password) or `api/install.php` (the one-time installer, which can wipe the
database); the build refuses to package either.

## First deploy (replacing the old admin-only site)

Before: `public_html` holds the old admin build at its root
(`index.html`, `assets/`, `favicon.png`, `weland-logo.png`, `weland.svg`,
`.htaccess`) plus `api/`, `.well-known/`, `cgi-bin/` and `error_log`.

0. **Check the folder.** cPanel → **Domains**: the document root of
   `welandresort.com` should be `/public_html`. If it's another folder, use that
   folder wherever this guide says `public_html`.

1. **Back up the current site.** File Manager → `public_html` → tick
   `.htaccess`, `index.html`, `favicon.png`, `weland-logo.png`, `weland.svg`,
   `assets` and `api` → **Compress** → Zip Archive. Change the archive path to
   `/backup-before-website.zip` so it's saved in your home folder, **not** in
   `public_html` (it contains `api/config.php` with the database password).

2. **Upload the new zip.** In `public_html` → **Upload** →
   `welandresort-deploy-….zip`. Wait for 100%, then **Go Back**.

3. **Remove the old admin files from the root.** Tick and **Delete**:
   `assets`, `index.html`, `favicon.png`, `weland-logo.png`, `weland.svg`,
   `.htaccess`.
   Do **not** touch `.well-known`, `api`, `cgi-bin` or `error_log`.
   (Do step 4 straight away; the site is offline between these two steps.)

4. **Extract.** Right-click the zip → **Extract** → into `/public_html` →
   **Extract File(s)** → **Reload**. You should now see `admin`, `api`,
   `images`, `_next`, `index.html`, `404.html`, `robots.txt` and `.htaccess`.
   In `api/`, `index.php`, `lib.php` and `.htaccess` were updated; `config.php`
   was left exactly as it was.

5. **Delete the uploaded zip** from `public_html` (otherwise anyone could
   download it).

6. **Tidy `api/`.** If `api/install.php` is still there, delete it: it's the
   one-time installer, and it can drop every table. `api/config.example.php`
   can go too. Keep `config.php`, `index.php`, `lib.php` and `.htaccess`.

7. **Turn on enquiry emails.**
   - Open `api/config.php` → **Edit**. Below the line that starts with
     `const INSTALL_KEY`, add:

     ```php
     const ENQUIRY_TO_EMAIL   = 'reservations@example.com';  // who receives website enquiries
     const ENQUIRY_FROM_EMAIL = 'enquiry@welandresort.com';  // the sender mailbox below
     ```

     Put in the real inbox, then **Save Changes**.
   - cPanel → **Email Accounts** → create `enquiry@welandresort.com`.
   - cPanel → **Email Deliverability** → `welandresort.com` should show SPF and
     DKIM as valid (use **Repair** if not), so enquiries don't land in spam.

   Until step 7 is done, the form tells guests to call or WhatsApp instead,
   and each enquiry is written to `api/error_log`, which is blocked from the web.

8. **HTTPS.** cPanel → **SSL/TLS Status**: `welandresort.com` and
   `www.welandresort.com` should both have valid certificates (**Run AutoSSL**
   if not). Then cPanel → **Domains** → `welandresort.com` → switch on
   **Force HTTPS Redirect**.

9. **Check it.**

   | Open | Expect |
   | --- | --- |
   | `https://welandresort.com` | the website |
   | `https://www.welandresort.com` | ends up on `https://welandresort.com` |
   | `https://welandresort.com/admin` | admin sign-in; signing in works |
   | `https://welandresort.com/login` | ends up on `/admin/login` |
   | The website's enquiry form | "Enquiry sent", and the email arrives |
   | `https://welandresort.com/error_log` | Forbidden |

**If something goes wrong:** extract `/backup-before-website.zip` (from your
home folder) into `/public_html`. That restores the old `index.html`,
`.htaccess` and API, and the old admin is back at the root.

## Later deploys

Run `npm run release`, upload the new zip to `public_html`, **Extract** it
(overwriting), and delete the zip. `config.php` stays as it is. To clear out
old build files first, delete `_next` and `admin/assets` before extracting.

If the release adds database columns, first run `weland-migrate.sql` in
phpMyAdmin (`weland` → **SQL**). It only adds what's missing, so it's safe
to run again.
