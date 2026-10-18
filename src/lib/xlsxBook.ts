// ------------------------------------------------------------------
//  Multi-sheet .xlsx writer (no dependencies), used by the Management Report:
//  shared cell styles, merged cells, formulas with their values cached (so every
//  viewer shows the numbers, and Excel recalculates them on open), frozen panes,
//  autofilters, data bars, print setup and a logo image on each sheet.
//  The zip and XML helpers come from xlsx.ts.
// ------------------------------------------------------------------
import { colName, xmlEsc, zip } from './xlsx'

export type NumFmt = 'inr' | 'inrNegK' | 'inrNegL' | 'inrNegC' | 'date' | 'month' | 'pct' | 'int'

export interface BorderSide {
  style: 'thin' | 'medium' | 'double' | 'hair'
  color: string // RRGGBB
}

/** A cell's look. Colours are RRGGBB. Equal styles share one entry in styles.xml. */
export interface CellStyle {
  bold?: boolean
  italic?: boolean
  size?: number // points (default 10.5)
  color?: string // font colour
  fill?: string // background
  top?: BorderSide
  bottom?: BorderSide
  left?: BorderSide
  right?: BorderSide
  h?: 'left' | 'center' | 'right'
  v?: 'top' | 'center' | 'bottom'
  wrap?: boolean
  indent?: number
  fmt?: NumFmt
}

export type CellValue = string | number | null

interface Cell {
  v: CellValue // the value, or a formula's cached result
  s: number // style index
  f?: string // formula, without the leading "="
}

// ₹ amounts with Indian digit grouping (₹1,23,45,678), the same code as the single-sheet exports.
// That code has no section for negative numbers (they would show without their minus sign), so a
// negative amount gets a plain two-section format sized to it: thousands, lakhs or crores.
const FORMATS: Record<NumFmt, { id: number; code?: string }> = {
  inr: { id: 164, code: '[>=10000000]"₹"##\\,##\\,##\\,##0;[>=100000]"₹"##\\,##\\,##0;"₹"##,##0' },
  inrNegK: { id: 168, code: '"₹"#,##0;-"₹"#,##0' },
  inrNegL: { id: 169, code: '"₹"##\\,##\\,##0;-"₹"##\\,##\\,##0' },
  inrNegC: { id: 170, code: '"₹"##\\,##\\,##\\,##0;-"₹"##\\,##\\,##\\,##0' },
  date: { id: 165, code: 'dd\\-mmm\\-yyyy' },
  month: { id: 166, code: 'mmm yyyy' },
  pct: { id: 167, code: '0.0%' },
  int: { id: 3 }, // built-in "#,##0"
}

/** The ₹ format for an amount: Indian grouping, with the minus sign kept on negative amounts. */
export function inrFmt(v: number): NumFmt {
  if (v >= 0) return 'inr'
  if (v > -100000) return 'inrNegK'
  return v > -10000000 ? 'inrNegL' : 'inrNegC'
}

const DEFAULT_FONT = { size: 10.5, color: '1E293B' }

class StyleTable {
  private fonts: string[] = [fontXml({})]
  private fills: string[] = ['<fill><patternFill patternType="none"/></fill>', '<fill><patternFill patternType="gray125"/></fill>']
  private borders: string[] = ['<border><left/><right/><top/><bottom/><diagonal/></border>']
  private xfs: string[] = ['<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>']
  private byKey = new Map<string, number>()

  private static indexOf(list: string[], xml: string): number {
    const i = list.indexOf(xml)
    if (i >= 0) return i
    list.push(xml)
    return list.length - 1
  }

  id(s: CellStyle): number {
    const key = JSON.stringify(s)
    const known = this.byKey.get(key)
    if (known !== undefined) return known
    const fontId = StyleTable.indexOf(this.fonts, fontXml(s))
    const fillId = s.fill
      ? StyleTable.indexOf(this.fills, `<fill><patternFill patternType="solid"><fgColor rgb="FF${s.fill}"/><bgColor indexed="64"/></patternFill></fill>`)
      : 0
    const side = (name: string, b?: BorderSide) => (b ? `<${name} style="${b.style}"><color rgb="FF${b.color}"/></${name}>` : `<${name}/>`)
    const borderId = s.top || s.bottom || s.left || s.right
      ? StyleTable.indexOf(this.borders, `<border>${side('left', s.left)}${side('right', s.right)}${side('top', s.top)}${side('bottom', s.bottom)}<diagonal/></border>`)
      : 0
    const numFmtId = s.fmt ? FORMATS[s.fmt].id : 0
    const align = [
      s.h ? ` horizontal="${s.h}"` : '',
      ` vertical="${s.v ?? 'center'}"`,
      s.wrap ? ' wrapText="1"' : '',
      s.indent ? ` indent="${s.indent}"` : '',
    ].join('')
    const xf = `<xf numFmtId="${numFmtId}" fontId="${fontId}" fillId="${fillId}" borderId="${borderId}" xfId="0"`
      + `${numFmtId ? ' applyNumberFormat="1"' : ''} applyFont="1"${fillId ? ' applyFill="1"' : ''}${borderId ? ' applyBorder="1"' : ''} applyAlignment="1">`
      + `<alignment${align}/></xf>`
    this.xfs.push(xf)
    const id = this.xfs.length - 1
    this.byKey.set(key, id)
    return id
  }

  xml(): string {
    const custom = Object.values(FORMATS).filter((f) => f.code)
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="${custom.length}">${custom.map((f) => `<numFmt numFmtId="${f.id}" formatCode="${xmlEsc(f.code as string)}"/>`).join('')}</numFmts>
<fonts count="${this.fonts.length}">${this.fonts.join('')}</fonts>
<fills count="${this.fills.length}">${this.fills.join('')}</fills>
<borders count="${this.borders.length}">${this.borders.join('')}</borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="${this.xfs.length}">${this.xfs.join('')}</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`
  }
}

function fontXml(s: CellStyle): string {
  return `<font>${s.bold ? '<b/>' : ''}${s.italic ? '<i/>' : ''}<sz val="${s.size ?? DEFAULT_FONT.size}"/>`
    + `<color rgb="FF${s.color ?? DEFAULT_FONT.color}"/><name val="Calibri"/><family val="2"/></font>`
}

/** One worksheet. Rows are numbered from 1 (as in Excel), columns from 0 (A = 0). */
export class Sheet {
  readonly cells = new Map<number, Map<number, Cell>>()
  readonly heights = new Map<number, number>()
  readonly merges: string[] = []
  readonly dataBars: { ref: string; color: string }[] = []
  widths: number[] = []
  /** Rows / columns that stay in view while scrolling (above / left of the split). */
  freeze?: { rows: number; cols: number }
  autoFilter?: string
  tabColor?: string
  landscape = true
  /** Print on one page (short statements) rather than one page wide. */
  fitPage = false
  paper: 'A4' | 'A3' = 'A4'
  /** Rows repeated on every printed page, e.g. [7, 7]. */
  printTitles?: [number, number]
  /** The logo, placed over the top-left cells (sizes in pixels). */
  logo?: { col: number; row: number; x: number; y: number; size: number }
  footer = ''

  constructor(readonly name: string) {}

  set(row: number, col: number, v: CellValue, s: number, f?: string): void {
    let r = this.cells.get(row)
    if (!r) this.cells.set(row, (r = new Map()))
    r.set(col, f ? { v, s, f } : { v, s })
  }

  merge(r1: number, c1: number, r2: number, c2: number): void {
    if (r1 === r2 && c1 === c2) return
    this.merges.push(`${colName(c1)}${r1}:${colName(c2)}${r2}`)
  }

  height(row: number, points: number): void {
    this.heights.set(row, points)
  }

  xml(index: number, hasLogo: boolean): string {
    const rowNums = [...new Set([...this.cells.keys(), ...this.heights.keys()])].sort((a, b) => a - b)
    let maxCol = Math.max(0, this.widths.length - 1)
    for (const r of this.cells.values()) for (const c of r.keys()) if (c > maxCol) maxCol = c
    const maxRow = rowNums.length ? rowNums[rowNums.length - 1] : 1

    const rowsXml = rowNums.map((rn) => {
      const ht = this.heights.get(rn)
      const cells = [...(this.cells.get(rn) ?? new Map<number, Cell>()).entries()].sort((a, b) => a[0] - b[0])
      const attrs = ht ? ` ht="${ht}" customHeight="1"` : ''
      return `<row r="${rn}"${attrs}>${cells.map(([c, cell]) => cellXml(`${colName(c)}${rn}`, cell)).join('')}</row>`
    })

    const fr = this.freeze
    let pane = ''
    if (fr && (fr.rows || fr.cols)) {
      const tl = `${colName(fr.cols)}${fr.rows + 1}`
      if (fr.rows && fr.cols) {
        pane = `<pane xSplit="${fr.cols}" ySplit="${fr.rows}" topLeftCell="${tl}" activePane="bottomRight" state="frozen"/>`
          + `<selection pane="topRight"/><selection pane="bottomLeft"/><selection pane="bottomRight" activeCell="${tl}" sqref="${tl}"/>`
      } else if (fr.rows) {
        pane = `<pane ySplit="${fr.rows}" topLeftCell="${tl}" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="${tl}" sqref="${tl}"/>`
      } else {
        pane = `<pane xSplit="${fr.cols}" topLeftCell="${tl}" activePane="topRight" state="frozen"/><selection pane="topRight" activeCell="${tl}" sqref="${tl}"/>`
      }
    } else {
      pane = '<selection activeCell="B7" sqref="B7"/>'
    }

    const cols = this.widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')
    const bars = this.dataBars.map((d, i) =>
      `<conditionalFormatting sqref="${d.ref}"><cfRule type="dataBar" priority="${i + 1}"><dataBar><cfvo type="num" val="0"/><cfvo type="num" val="1"/><color rgb="FF${d.color}"/></dataBar></cfRule></conditionalFormatting>`,
    ).join('')

    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheetPr>${this.tabColor ? `<tabColor rgb="FF${this.tabColor}"/>` : ''}<pageSetUpPr fitToPage="1"/></sheetPr>
<dimension ref="A1:${colName(maxCol)}${maxRow}"/>
<sheetViews><sheetView showGridLines="0"${index === 0 ? ' tabSelected="1"' : ''} workbookViewId="0">${pane}</sheetView></sheetViews>
<sheetFormatPr defaultRowHeight="18"/>
${cols ? `<cols>${cols}</cols>` : ''}
<sheetData>${rowsXml.join('')}</sheetData>
${this.autoFilter ? `<autoFilter ref="${this.autoFilter}"/>` : ''}
${this.merges.length ? `<mergeCells count="${this.merges.length}">${this.merges.map((m) => `<mergeCell ref="${m}"/>`).join('')}</mergeCells>` : ''}
${bars}
<printOptions horizontalCentered="1"/>
<pageMargins left="0.4" right="0.4" top="0.5" bottom="0.6" header="0.25" footer="0.3"/>
<pageSetup paperSize="${this.paper === 'A3' ? 8 : 9}" orientation="${this.landscape ? 'landscape' : 'portrait'}" fitToWidth="1" fitToHeight="${this.fitPage ? 1 : 0}"/>
${this.footer ? `<headerFooter><oddFooter>${xmlEsc(this.footer)}</oddFooter></headerFooter>` : ''}
${hasLogo && this.logo ? '<drawing r:id="rId1"/>' : ''}
</worksheet>`
  }
}

function num(v: number): string {
  return Number.isFinite(v) ? String(Math.round(v * 1e6) / 1e6) : '0'
}

function cellXml(ref: string, cell: Cell): string {
  const { v, s, f } = cell
  if (f) {
    const cached = v === null ? '' : `<v>${typeof v === 'number' ? num(v) : xmlEsc(v)}</v>`
    return `<c r="${ref}" s="${s}"${typeof v === 'string' ? ' t="str"' : ''}><f>${xmlEsc(f)}</f>${cached}</c>`
  }
  if (v === null || v === '') return `<c r="${ref}" s="${s}"/>`
  if (typeof v === 'number') return `<c r="${ref}" s="${s}"><v>${num(v)}</v></c>`
  return `<c r="${ref}" s="${s}" t="inlineStr"><is><t xml:space="preserve">${xmlEsc(v)}</t></is></c>`
}

function drawingXml(l: NonNullable<Sheet['logo']>): string {
  const emu = (px: number) => Math.round(px * 9525)
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<xdr:oneCellAnchor><xdr:from><xdr:col>${l.col}</xdr:col><xdr:colOff>${emu(l.x)}</xdr:colOff><xdr:row>${l.row}</xdr:row><xdr:rowOff>${emu(l.y)}</xdr:rowOff></xdr:from>
<xdr:ext cx="${emu(l.size)}" cy="${emu(l.size)}"/>
<xdr:pic><xdr:nvPicPr><xdr:cNvPr id="2" name="Logo" descr="Logo"/><xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr></xdr:nvPicPr>
<xdr:blipFill><a:blip r:embed="rId1"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill>
<xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${emu(l.size)}" cy="${emu(l.size)}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic>
<xdr:clientData/></xdr:oneCellAnchor>
</xdr:wsDr>`
}

const REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'

/** A workbook: add sheets, register styles, then build the .xlsx bytes. */
export class Workbook {
  readonly sheets: Sheet[] = []
  private styles = new StyleTable()

  constructor(private meta: { title: string; author: string; created: Date; logo?: Uint8Array }) {}

  sheet(name: string): Sheet {
    const sh = new Sheet(name.replace(/[\\/?*[\]:]/g, ' ').slice(0, 31))
    this.sheets.push(sh)
    return sh
  }

  style(s: CellStyle): number {
    return this.styles.id(s)
  }

  build(): Uint8Array {
    const enc = new TextEncoder()
    const logo = this.meta.logo
    const files: { name: string; data: Uint8Array }[] = []
    const add = (name: string, xml: string) => files.push({ name, data: enc.encode(xml) })
    const quoted = (n: string) => `'${n.replace(/'/g, "''")}'`
    const withLogo = this.sheets.map((s) => !!(logo && s.logo))

    let drawings = 0
    const drawingOf = this.sheets.map((_, i) => (withLogo[i] ? ++drawings : 0))

    add('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
${logo ? '<Default Extension="png" ContentType="image/png"/>' : ''}
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
${this.sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('\n')}
${drawingOf.filter(Boolean).map((d) => `<Override PartName="/xl/drawings/drawing${d}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>`).join('\n')}
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
</Types>`)

    add('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="${REL}/officeDocument" Target="xl/workbook.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
</Relationships>`)

    const stamp = this.meta.created.toISOString().replace(/\.\d{3}Z$/, 'Z')
    add('docProps/core.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
<dc:title>${xmlEsc(this.meta.title)}</dc:title><dc:creator>${xmlEsc(this.meta.author)}</dc:creator><cp:lastModifiedBy>${xmlEsc(this.meta.author)}</cp:lastModifiedBy>
<dcterms:created xsi:type="dcterms:W3CDTF">${stamp}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${stamp}</dcterms:modified>
</cp:coreProperties>`)

    const printTitles = this.sheets
      .map((s, i) => (s.printTitles ? `<definedName name="_xlnm.Print_Titles" localSheetId="${i}">${xmlEsc(`${quoted(s.name)}!$${s.printTitles[0]}:$${s.printTitles[1]}`)}</definedName>` : ''))
      .filter(Boolean)
    add('xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="${REL}">
<bookViews><workbookView xWindow="0" yWindow="0" windowWidth="28800" windowHeight="17000" activeTab="0"/></bookViews>
<sheets>${this.sheets.map((s, i) => `<sheet name="${xmlEsc(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets>
${printTitles.length ? `<definedNames>${printTitles.join('')}</definedNames>` : ''}
<calcPr calcId="191029" fullCalcOnLoad="1"/>
</workbook>`)

    add('xl/_rels/workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
${this.sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="${REL}/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('\n')}
<Relationship Id="rId${this.sheets.length + 1}" Type="${REL}/styles" Target="styles.xml"/>
</Relationships>`)

    this.sheets.forEach((s, i) => {
      add(`xl/worksheets/sheet${i + 1}.xml`, s.xml(i, withLogo[i]))
      const d = drawingOf[i]
      if (d && s.logo) {
        add(`xl/worksheets/_rels/sheet${i + 1}.xml.rels`, `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${REL}/drawing" Target="../drawings/drawing${d}.xml"/></Relationships>`)
        add(`xl/drawings/drawing${d}.xml`, drawingXml(s.logo))
        add(`xl/drawings/_rels/drawing${d}.xml.rels`, `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${REL}/image" Target="../media/logo.png"/></Relationships>`)
      }
    })
    add('xl/styles.xml', this.styles.xml())
    if (logo && drawings) files.push({ name: 'xl/media/logo.png', data: logo })
    return zip(files)
  }
}
