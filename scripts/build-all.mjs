// Builds the website and the admin app and assembles dist/, a folder laid out
// exactly like public_html on the server:
//
//   dist/            website (static export of website/)   → served at /
//   dist/admin/      admin app (vite build, base /admin/)   → served at /admin
//   dist/api/        the PHP API's runtime files            → served at /api
//   dist/.htaccess   from deploy/.htaccess
//
// Usage: npm run build:all   (npm run release also zips it for upload)
import { execSync } from 'node:child_process'
import { copyFileSync, cpSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const website = join(root, 'website')
const dist = join(root, 'dist')

// Only these API files are deployed. Deliberately a list, not a filter:
//  - config.php holds the database password and lives only on the server
//    (settings only: the code it needs is in lib.php, which ships);
//  - install.php is a one-time setup script that can wipe the database.
const API_FILES = ['index.php', 'lib.php', '.htaccess']

function run(cmd, cwd = root) {
  console.log(`\n> ${cmd}${cwd === root ? '' : `   (in ${relative(root, cwd)}/)`}`)
  execSync(cmd, { cwd, stdio: 'inherit' })
}

rmSync(dist, { recursive: true, force: true })

// 1. Website → website/out → dist/
if (!existsSync(join(website, 'node_modules'))) run('npm ci', website)
run('npm run build', website)
cpSync(join(website, 'out'), dist, { recursive: true })

// 2. Admin → dist/admin (outDir and base are set in vite.config.ts)
if (!existsSync(join(root, 'node_modules'))) run('npm ci')
run('npm run build')

// 3. API → dist/api
mkdirSync(join(dist, 'api'), { recursive: true })
for (const file of API_FILES) {
  copyFileSync(join(root, 'server', 'api', file), join(dist, 'api', file))
}

// 4. Root routing rules
copyFileSync(join(root, 'deploy', '.htaccess'), join(dist, '.htaccess'))

console.log('\nBuilt dist/. Run `npm run package` to zip it for cPanel (see DEPLOY.md).')
