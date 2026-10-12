// ------------------------------------------------------------------
//  Minimal .xlsx writer (no dependencies): one styled sheet with a title, a sub-title,
//  a header row, the data rows and a Total row. Used by the report downloads.
// ------------------------------------------------------------------

export type XlsxCell = string | number

export interface XlsxSheet {
  sheetName: string
  heading: string // big title on top, e.g. "WeLand Resorts"
  subheading: string // report name under it
  columns: string[]
  rows: XlsxCell[][]
  money: number[] // column indexes shown as ₹ amounts
  total: XlsxCell[] // the Total row: a label in the first cell, numbers in the money columns
}

// ---- styles (indexes into cellXfs below)
const S = {
  title: 1, subtitle: 2, header: 3,
  text: 4, textAlt: 5, money: 6, moneyAlt: 7, date: 8, dateAlt: 9, number: 10, numberAlt: 11,
  totalLabel: 12, totalMoney: 13, totalBlank: 14,
}

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="2">
<numFmt numFmtId="164" formatCode="[&gt;=10000000]&quot;₹&quot;##\\,##\\,##\\,##0;[&gt;=100000]&quot;₹&quot;##\\,##\\,##0;&quot;₹&quot;##,##0"/>
<numFmt numFmtId="165" formatCode="dd\\-mmm\\-yyyy"/>
</numFmts>
<fonts count="5">
<font><sz val="11"/><color rgb="FF1E293B"/><name val="Calibri"/><family val="2"/></font>
<font><b/><sz val="22"/><color rgb="FFFFFFFF"/><name val="Calibri"/><family val="2"/></font>
<font><b/><sz val="14"/><color rgb="FF065F46"/><name val="Calibri"/><family val="2"/></font>
<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/><family val="2"/></font>
<font><b/><sz val="13"/><color rgb="FF064E3B"/><name val="Calibri"/><family val="2"/></font>
</fonts>
<fills count="7">
<fill><patternFill patternType="none"/></fill>
<fill><patternFill patternType="gray125"/></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FF065F46"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFD1FAE5"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FF334155"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFF1F5F9"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFD1FAE5"/><bgColor indexed="64"/></patternFill></fill>
</fills>
<borders count="3">
<border><left/><right/><top/><bottom/><diagonal/></border>
<border><left style="thin"><color rgb="FFCBD5E1"/></left><right style="thin"><color rgb="FFCBD5E1"/></right><top style="thin"><color rgb="FFCBD5E1"/></top><bottom style="thin"><color rgb="FFCBD5E1"/></bottom><diagonal/></border>
<border><left style="thin"><color rgb="FF065F46"/></left><right style="thin"><color rgb="FF065F46"/></right><top style="medium"><color rgb="FF065F46"/></top><bottom style="double"><color rgb="FF065F46"/></bottom><diagonal/></border>
</borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="15">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="0" fontId="2" fillId="3" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="0" fontId="3" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>
<xf numFmtId="0" fontId="0" fillId="5" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>
<xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
<xf numFmtId="164" fontId="0" fillId="5" borderId="1" xfId="0" applyNumberFormat="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
<xf numFmtId="165" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>
<xf numFmtId="165" fontId="0" fillId="5" borderId="1" xfId="0" applyNumberFormat="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
<xf numFmtId="0" fontId="0" fillId="5" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
<xf numFmtId="0" fontId="4" fillId="6" borderId="2" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center" indent="1"/></xf>
<xf numFmtId="164" fontId="4" fillId="6" borderId="2" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
<xf numFmtId="0" fontId="4" fillId="6" borderId="2" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`

const ROOT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`

const WORKBOOK_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`

// ---- helpers
const xmlEsc = (s: string) =>
  s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function colName(i: number): string {
  let n = i + 1
  let s = ''
  while (n > 0) {
    const m = (n - 1) % 26
    s = String.fromCharCode(65 + m) + s
    n = Math.floor((n - 1) / 26)
  }
  return s
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/
/** Excel's day number for a yyyy-mm-dd date. */
function dateSerial(iso: string): number | null {
  const m = ISO_DATE.exec(iso)
  if (!m) return null
  return Math.round((Date.UTC(+m[1], +m[2] - 1, +m[3]) - Date.UTC(1899, 11, 30)) / 86400000)
}

function cellXml(ref: string, value: XlsxCell, style: number): string {
  if (typeof value === 'number') return `<c r="${ref}" s="${style}"><v>${Number.isFinite(value) ? value : 0}</v></c>`
  if (value === '') return `<c r="${ref}" s="${style}"/>`
  return `<c r="${ref}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${xmlEsc(value)}</t></is></c>`
}

function sheetXml(sh: XlsxSheet): string {
  const nCols = sh.columns.length
  const last = colName(nCols - 1)
  const HEADER_ROW = 4
  const firstData = HEADER_ROW + 1
  const totalRow = firstData + sh.rows.length
  const rowsXml: string[] = []

  const blanks = (row: number, style: number, from: number) =>
    Array.from({ length: nCols - from }, (_, k) => `<c r="${colName(from + k)}${row}" s="${style}"/>`).join('')

  // title, sub-title, spacer
  rowsXml.push(`<row r="1" ht="40" customHeight="1">${cellXml('A1', sh.heading, S.title)}${blanks(1, S.title, 1)}</row>`)
  rowsXml.push(`<row r="2" ht="26" customHeight="1">${cellXml('A2', sh.subheading, S.subtitle)}${blanks(2, S.subtitle, 1)}</row>`)
  rowsXml.push(`<row r="3" ht="8" customHeight="1"/>`)

  // header
  rowsXml.push(`<row r="${HEADER_ROW}" ht="24" customHeight="1">${sh.columns.map((c, i) => cellXml(`${colName(i)}${HEADER_ROW}`, c, S.header)).join('')}</row>`)

  // data (alternate rows get a light background)
  sh.rows.forEach((r, ri) => {
    const row = firstData + ri
    const alt = ri % 2 === 1
    const cells = sh.columns.map((_, ci) => {
      const v = r[ci] ?? ''
      const ref = `${colName(ci)}${row}`
      if (typeof v === 'number') return cellXml(ref, v, sh.money.includes(ci) ? (alt ? S.moneyAlt : S.money) : alt ? S.numberAlt : S.number)
      const serial = dateSerial(v)
      if (serial !== null) return cellXml(ref, serial, alt ? S.dateAlt : S.date)
      return cellXml(ref, v, alt ? S.textAlt : S.text)
    })
    rowsXml.push(`<row r="${row}" ht="20" customHeight="1">${cells.join('')}</row>`)
  })

  // total row: label merged across the columns before the first amount
  const firstAmount = sh.total.findIndex((v, i) => i > 0 && typeof v === 'number')
  const labelEnd = firstAmount > 0 ? firstAmount - 1 : 0
  const totalCells = sh.columns.map((_, ci) => {
    const v = sh.total[ci] ?? ''
    const ref = `${colName(ci)}${totalRow}`
    if (ci === 0) return cellXml(ref, String(v), S.totalLabel)
    if (ci <= labelEnd) return `<c r="${ref}" s="${S.totalLabel}"/>`
    if (typeof v === 'number') return cellXml(ref, v, S.totalMoney)
    return `<c r="${ref}" s="${S.totalBlank}"/>`
  })
  rowsXml.push(`<row r="${totalRow}" ht="28" customHeight="1">${totalCells.join('')}</row>`)

  // column widths from the content (so dates and amounts never show as ####)
  const widths = sh.columns.map((c, ci) => {
    let w = c.length + 4
    for (const r of sh.rows) {
      const v = r[ci]
      const len = typeof v === 'number' ? (sh.money.includes(ci) ? String(Math.round(v)).length + Math.floor(String(Math.round(v)).length / 2) + 3 : String(v).length + 2) : ISO_DATE.test(String(v ?? '')) ? 13 : String(v ?? '').length + 2
      if (len > w) w = len
    }
    const tv = sh.total[ci]
    if (typeof tv === 'number') w = Math.max(w, String(Math.round(tv)).length + Math.floor(String(Math.round(tv)).length / 2) + 5)
    return Math.min(Math.max(w, 11), 44)
  })
  const cols = widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')

  const merges = [`A1:${last}1`, `A2:${last}2`]
  if (labelEnd > 0) merges.push(`A${totalRow}:${colName(labelEnd)}${totalRow}`)
  const lastDataRow = firstData + sh.rows.length - 1

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>
<dimension ref="A1:${last}${totalRow}"/>
<sheetViews><sheetView showGridLines="0" workbookViewId="0"><pane ySplit="${HEADER_ROW}" topLeftCell="A${firstData}" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A${firstData}" sqref="A${firstData}"/></sheetView></sheetViews>
<sheetFormatPr defaultRowHeight="18"/>
<cols>${cols}</cols>
<sheetData>${rowsXml.join('')}</sheetData>
${sh.rows.length > 0 ? `<autoFilter ref="A${HEADER_ROW}:${last}${lastDataRow}"/>` : ''}
<mergeCells count="${merges.length}">${merges.map((m) => `<mergeCell ref="${m}"/>`).join('')}</mergeCells>
<pageMargins left="0.5" right="0.5" top="0.6" bottom="0.6" header="0.3" footer="0.3"/>
<pageSetup orientation="landscape" fitToWidth="1" fitToHeight="0"/>
</worksheet>`
}

function workbookXml(sheetName: string): string {
  const name = xmlEsc(sheetName.replace(/[\\/?*[\]:]/g, ' ').slice(0, 31) || 'Report')
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets><sheet name="${name}" sheetId="1" r:id="rId1"/></sheets>
</workbook>`
}

// ---- zip (stored, no compression)
const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

function crc32(data: Uint8Array): number {
  let c = 0xffffffff
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function zip(files: { name: string; data: Uint8Array }[]): Uint8Array {
  const enc = new TextEncoder()
  const now = new Date()
  const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1)
  const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()
  const parts: Uint8Array[] = []
  const central: Uint8Array[] = []
  let offset = 0
  for (const f of files) {
    const name = enc.encode(f.name)
    const crc = crc32(f.data)
    const local = new Uint8Array(30 + name.length)
    const lv = new DataView(local.buffer)
    lv.setUint32(0, 0x04034b50, true)
    lv.setUint16(4, 20, true)
    lv.setUint16(6, 0x0800, true) // UTF-8 names
    lv.setUint16(8, 0, true) // stored
    lv.setUint16(10, dosTime, true)
    lv.setUint16(12, dosDate, true)
    lv.setUint32(14, crc, true)
    lv.setUint32(18, f.data.length, true)
    lv.setUint32(22, f.data.length, true)
    lv.setUint16(26, name.length, true)
    lv.setUint16(28, 0, true)
    local.set(name, 30)
    parts.push(local, f.data)

    const cd = new Uint8Array(46 + name.length)
    const cv = new DataView(cd.buffer)
    cv.setUint32(0, 0x02014b50, true)
    cv.setUint16(4, 20, true)
    cv.setUint16(6, 20, true)
    cv.setUint16(8, 0x0800, true)
    cv.setUint16(10, 0, true)
    cv.setUint16(12, dosTime, true)
    cv.setUint16(14, dosDate, true)
    cv.setUint32(16, crc, true)
    cv.setUint32(20, f.data.length, true)
    cv.setUint32(24, f.data.length, true)
    cv.setUint16(28, name.length, true)
    cv.setUint32(42, offset, true)
    cd.set(name, 46)
    central.push(cd)
    offset += local.length + f.data.length
  }
  const cdSize = central.reduce((s, c) => s + c.length, 0)
  const end = new Uint8Array(22)
  const ev = new DataView(end.buffer)
  ev.setUint32(0, 0x06054b50, true)
  ev.setUint16(8, files.length, true)
  ev.setUint16(10, files.length, true)
  ev.setUint32(12, cdSize, true)
  ev.setUint32(16, offset, true)
  const all = [...parts, ...central, end]
  const out = new Uint8Array(all.reduce((s, p) => s + p.length, 0))
  let pos = 0
  for (const p of all) {
    out.set(p, pos)
    pos += p.length
  }
  return out
}

/** The finished .xlsx file as bytes. */
export function buildXlsx(sheet: XlsxSheet): Uint8Array {
  const enc = new TextEncoder()
  return zip([
    { name: '[Content_Types].xml', data: enc.encode(CONTENT_TYPES) },
    { name: '_rels/.rels', data: enc.encode(ROOT_RELS) },
    { name: 'xl/workbook.xml', data: enc.encode(workbookXml(sheet.sheetName)) },
    { name: 'xl/_rels/workbook.xml.rels', data: enc.encode(WORKBOOK_RELS) },
    { name: 'xl/styles.xml', data: enc.encode(STYLES) },
    { name: 'xl/worksheets/sheet1.xml', data: enc.encode(sheetXml(sheet)) },
  ])
}
