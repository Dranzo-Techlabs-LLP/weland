// Zips dist/ into release/welandresort-deploy-YYYYMMDD-HHMM.zip, ready to be
// uploaded to public_html in cPanel and extracted there (see DEPLOY.md).
//
//   npm run release    builds everything, then zips it
//   npm run package    zips the dist/ you already built
//
// No dependencies: a small ZIP writer on top of node:zlib. Entry names use "/"
// and files get Unix mode 0644 (folders 0755), which is what cPanel expects.
import zlib from 'node:zlib'
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'dist')

function fail(message) {
  console.error(`\n${message}`)
  process.exit(1)
}

if (!existsSync(join(dist, 'index.html'))) fail('dist/ is missing. Run `npm run build:all` first.')

// Every file and folder under dist/, named with "/" separators.
function walk(dir, out = []) {
  for (const name of readdirSync(dir).sort()) {
    const abs = join(dir, name)
    const rel = relative(dist, abs).split(sep).join('/')
    if (statSync(abs).isDirectory()) {
      out.push({ abs, rel: `${rel}/`, dir: true })
      walk(abs, out)
    } else {
      out.push({ abs, rel, dir: false })
    }
  }
  return out
}
const entries = walk(dist)

// Refuse outright to package anything that must never be uploaded.
const FORBIDDEN = [/(^|\/)config\.php$/i, /(^|\/)install\.php$/i, /(^|\/)\.env(\.|$)/i, /(^|\/)error_log$/i]
const forbidden = entries.filter((e) => FORBIDDEN.some((re) => re.test(e.rel)))
if (forbidden.length) {
  fail(`Refusing to package. These must never be deployed:\n  ${forbidden.map((e) => e.rel).join('\n  ')}\nRebuild with \`npm run build:all\`.`)
}
for (const required of ['index.html', '.htaccess', 'admin/index.html', 'admin/.htaccess', 'api/index.php', 'api/lib.php', 'api/.htaccess']) {
  if (!entries.some((e) => e.rel === required)) fail(`dist/ has no ${required}. Rebuild with \`npm run build:all\`.`)
}

// CRC-32: zlib.crc32 exists from Node 20.15 / 22.2; table fallback for older versions.
let crcTable
function crc32(buf) {
  if (typeof zlib.crc32 === 'function') return zlib.crc32(buf) >>> 0
  if (!crcTable) {
    crcTable = new Uint32Array(256)
    for (let n = 0; n < 256; n++) {
      let c = n
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      crcTable[n] = c >>> 0
    }
  }
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

const now = new Date()
const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2)
const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()

const parts = []
const central = []
let offset = 0
for (const e of entries) {
  const name = Buffer.from(e.rel, 'utf8')
  const data = e.dir ? Buffer.alloc(0) : readFileSync(e.abs)
  const packed = e.dir ? data : zlib.deflateRawSync(data, { level: 9 })
  const stored = e.dir || packed.length >= data.length // JPEGs don't shrink; store them
  const body = stored ? data : packed
  const method = stored ? 0 : 8
  const crc = e.dir ? 0 : crc32(data)
  const mode = e.dir ? 0o40755 : 0o100644

  const header = Buffer.alloc(30)
  header.writeUInt32LE(0x04034b50, 0) // local file header
  header.writeUInt16LE(20, 4) //         version needed (2.0)
  header.writeUInt16LE(0x0800, 6) //     UTF-8 names
  header.writeUInt16LE(method, 8)
  header.writeUInt16LE(dosTime, 10)
  header.writeUInt16LE(dosDate, 12)
  header.writeUInt32LE(crc, 14)
  header.writeUInt32LE(body.length, 18)
  header.writeUInt32LE(data.length, 22)
  header.writeUInt16LE(name.length, 26)
  header.writeUInt16LE(0, 28) //         no extra field
  parts.push(header, name, body)

  const record = Buffer.alloc(46)
  record.writeUInt32LE(0x02014b50, 0) // central directory header
  record.writeUInt16LE((3 << 8) | 20, 4) // made by Unix, so the modes below apply
  record.writeUInt16LE(20, 6)
  record.writeUInt16LE(0x0800, 8)
  record.writeUInt16LE(method, 10)
  record.writeUInt16LE(dosTime, 12)
  record.writeUInt16LE(dosDate, 14)
  record.writeUInt32LE(crc, 16)
  record.writeUInt32LE(body.length, 20)
  record.writeUInt32LE(data.length, 24)
  record.writeUInt16LE(name.length, 28)
  // bytes 30–37: extra length, comment length, disk number, internal attributes (all 0)
  record.writeUInt32LE(((mode << 16) | (e.dir ? 0x10 : 0)) >>> 0, 38)
  record.writeUInt32LE(offset, 42)
  central.push(record, name)

  offset += header.length + name.length + body.length
}

const centralSize = central.reduce((n, b) => n + b.length, 0)
if (entries.length > 0xffff || offset + centralSize > 0xffffffff) fail('Too big for a plain ZIP (needs ZIP64).')

const end = Buffer.alloc(22)
end.writeUInt32LE(0x06054b50, 0) // end of central directory
end.writeUInt16LE(entries.length, 8)
end.writeUInt16LE(entries.length, 10)
end.writeUInt32LE(centralSize, 12)
end.writeUInt32LE(offset, 16)

const pad = (n) => String(n).padStart(2, '0')
const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`
const outDir = join(root, 'release')
mkdirSync(outDir, { recursive: true })
const outFile = join(outDir, `welandresort-deploy-${stamp}.zip`)
const zip = Buffer.concat([...parts, ...central, end])
writeFileSync(outFile, zip)

const files = entries.filter((e) => !e.dir).length
console.log(`\n${relative(root, outFile)}  —  ${files} files, ${(zip.length / 1048576).toFixed(1)} MB`)
console.log('Upload it to public_html in cPanel and extract it there. See DEPLOY.md.')
