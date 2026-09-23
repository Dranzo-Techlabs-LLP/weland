// Builds the website and the admin app and assembles dist/, a folder laid out
// exactly like public_html on the server:
//
//   dist/            website (static export of website/)       → served at /
//   dist/admin/      admin app (vite build, base /admin/)       → served at /admin
//   dist/api/        PHP API from server/api, minus config.php  → served at /api
//   dist/.htaccess   from deploy/.htaccess
//
// Usage: npm run build:all
import { execSync } from 'node:child_process'
import { copyFileSync, cpSync, existsSync, rmSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const website = join(root, 'website')
const dist = join(root, 'dist')

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

// 3. API → dist/api. config.php holds the DB password and stays on the server.
cpSync(join(root, 'server', 'api'), join(dist, 'api'), {
  recursive: true,
  filter: (src) => !/[\/]config\.php$/.test(src),
})

// 4. Root routing rules
copyFileSync(join(root, 'deploy', '.htaccess'), join(dist, '.htaccess'))

console.log('\nBuilt dist/ — upload its contents to public_html. See README → Deploying.')
