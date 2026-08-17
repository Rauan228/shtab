import {
  addDays,
  formatDateLong,
  formatMonthYear,
  type TypedReport,
} from './api';

/** Branded .xlsx workbook — Excel opens it without the CSV ######## / skinny-column mess. */

type ColKind = 'text' | 'date' | 'month' | 'money' | 'int' | 'pct';

const BRAND = 'FF127F86';
const BRAND_DEEP = 'FF0B4A58';
const INK = 'FF0C2A32';
const MUTED = 'FF5A7378';
const SOFT = 'FFE6F5F4';
const ZEBRA = 'FFF3F8F8';
const LINE = 'FFD7E4E4';
const FAINT = 'FF7A9094';
const WHITE = 'FFFFFFFF';

export function downloadReportExcel(report: TypedReport): void {
  const { filename, bytes } = buildReportXlsx(report);
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const blob = new Blob([copy], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(a.href);
}

export function buildReportXlsx(report: TypedReport): { filename: string; bytes: Uint8Array } {
  const headers = (report.rows[0] ?? []).map((h) => String(h ?? ''));
  const body = report.rows.slice(1).map((r) => r.map((c) => String(c ?? '')));
  const kinds = classifyColumns(headers, body);
  const colCount = Math.max(headers.length, 2, report.kpis.length ? 2 : 0);
  const widths = columnWidths(headers, body, kinds, colCount, report.kpis);

  const lastInclusive = addDays(report.to, -1);
  const period = `${formatDateLong(report.from)} — ${formatDateLong(lastInclusive)}`;
  const stamped = formatStamp();
  const sheet = sheetName(report.title);

  const b = new SheetWriter(colCount);
  const lastCol = colLetter(colCount - 1);

  b.row(22);
  b.cell(0, 1, 'AMANAI', 'inline');
  b.merge(`A${b.r}:${lastCol}${b.r}`);

  b.row(28);
  b.cell(0, 2, report.title, 'inline');
  b.merge(`A${b.r}:${lastCol}${b.r}`);

  b.row(18);
  b.cell(0, 3, `Период: ${period}    ·    Сформирован ${stamped}`, 'inline');
  b.merge(`A${b.r}:${lastCol}${b.r}`);

  if (report.note) {
    b.row(36);
    b.cell(0, 4, report.note, 'inline');
    b.merge(`A${b.r}:${lastCol}${b.r}`);
  }

  b.row(10);

  if (report.kpis.length) {
    b.row(20);
    b.cell(0, 19, 'Сводка', 'inline');
    b.merge(`A${b.r}:B${b.r}`);

    b.row(20);
    b.cell(0, 7, 'Показатель', 'inline');
    b.cell(1, 7, 'Значение', 'inline');

    for (const k of report.kpis) {
      b.row(20);
      b.cell(0, 8, k.l, 'inline');
      b.cell(1, 8, k.v, 'inline');
    }

    b.row(10);
  }

  let tableHeadRow = 0;
  let firstData = 0;
  let lastData = 0;

  if (headers.length) {
    b.row(20);
    b.cell(0, 19, 'Детализация', 'inline');
    b.merge(`A${b.r}:${lastCol}${b.r}`);

    b.row(28);
    tableHeadRow = b.r;
    headers.forEach((h, i) => b.cell(i, 7, h.replace(/, T$/, ', ₸'), 'inline'));

    if (body.length === 0) {
      b.row(20);
      b.cell(0, 8, 'Нет строк за период', 'inline');
      b.merge(`A${b.r}:${lastCol}${b.r}`);
    } else {
      firstData = b.r + 1;
      body.forEach((row, ri) => {
        b.row(18);
        const alt = ri % 2 === 1;
        row.forEach((raw, i) => writeDataCell(b, i, raw, kinds[i] ?? 'text', alt));
      });
      lastData = b.r;

      const moneyOrInt = kinds
        .map((k, i) => ({ k, i }))
        .filter((x) => x.k === 'money' || x.k === 'int');
      if (moneyOrInt.length && firstData && lastData >= firstData) {
        b.row(20);
        b.cell(0, 20, 'Итого', 'inline');
        for (const { i } of moneyOrInt) {
          const col = colLetter(i);
          const formula = `SUBTOTAL(109,${col}${firstData}:${col}${lastData})`;
          const sum = body.reduce((acc, row) => acc + (parsePlainNumber(row[i] ?? '') ?? 0), 0);
          b.formula(i, 21, formula, Math.round(sum));
        }
      }
    }
  }

  b.row(14);
  b.row(16);
  b.cell(
    0,
    18,
    'AmanAI · цифры из броней кабинета. Это не банковская выписка и не налоговый документ.',
    'inline',
  );
  b.merge(`A${b.r}:${lastCol}${b.r}`);

  const filterEnd = lastData || tableHeadRow;
  const autoFilter =
    tableHeadRow && filterEnd >= tableHeadRow
      ? `${colLetter(0)}${tableHeadRow}:${colLetter(Math.max(headers.length - 1, 0))}${filterEnd}`
      : null;
  const freeze = tableHeadRow || 0;

  const files = packXlsx({
    title: report.title,
    sheet,
    sheetXml: b.toSheetXml({
      widths,
      autoFilter,
      freeze,
      lastCol: colLetter(colCount - 1),
      lastRow: b.r,
    }),
  });

  const fromDot = isoToDots(report.from);
  const toDot = isoToDots(lastInclusive);
  const filename = `AmanAI ${safeFile(report.title)} ${fromDot}–${toDot}.xlsx`;
  return { filename, bytes: zipStore(files) };
}

function writeDataCell(b: SheetWriter, col: number, raw: string, kind: ColKind, alt: boolean): void {
  const s = String(raw ?? '');
  if (kind === 'date') {
    const iso = s.match(/^\d{4}-\d{2}-\d{2}$/)?.[0];
    if (iso) {
      b.cell(col, alt ? 13 : 12, excelSerial(iso), 'n');
      return;
    }
  }
  if (kind === 'month' && /^\d{4}-\d{2}$/.test(s)) {
    b.cell(col, alt ? 9 : 8, formatMonthYear(`${s}-01`), 'inline');
    return;
  }
  if (kind === 'money' || kind === 'int') {
    const n = parsePlainNumber(s);
    if (n !== null) {
      const style = kind === 'money' ? (alt ? 15 : 14) : alt ? 11 : 10;
      b.cell(col, style, n, 'n');
      return;
    }
  }
  if (kind === 'pct') {
    const n = parsePlainNumber(s.replace(/%/g, ''));
    if (n !== null) {
      b.cell(col, alt ? 17 : 16, n, 'n');
      return;
    }
  }
  b.cell(col, alt ? 9 : 8, prettyText(s), 'inline');
}

function classifyColumns(headers: string[], body: string[][]): ColKind[] {
  return headers.map((h, i) => {
    const name = h.toLowerCase();
    if (/^(дата|заезд|выезд)\b/.test(name)) return 'date';
    if (/^месяц\b/.test(name)) return 'month';
    if (/%|загрузк|доля/.test(name)) return 'pct';
    if (/₸|счёт|счет|сумм|остат|adr|revpar|проживан|уборк|итого|оплач|выстав|фаз/.test(name)) {
      return 'money';
    }
    const samples = body.map((r) => r[i] ?? '').filter(Boolean).slice(0, 30);
    if (samples.length && samples.every((v) => /^\d{4}-\d{2}-\d{2}$/.test(v))) return 'date';
    if (samples.length && samples.every((v) => parsePlainNumber(v) !== null)) return 'int';
    return 'text';
  });
}

function columnWidths(
  headers: string[],
  body: string[][],
  kinds: ColKind[],
  colCount: number,
  kpis: { l: string; v: string }[],
): number[] {
  const widths: number[] = [];
  for (let i = 0; i < colCount; i++) {
    const kind = kinds[i] ?? 'text';
    const header = headers[i] ?? (i === 0 ? 'Показатель' : i === 1 ? 'Значение' : '');
    let w = textWidth(header) + 3;
    if (kind === 'date') w = Math.max(w, 14);
    if (kind === 'month') w = Math.max(w, 16);
    if (kind === 'money') w = Math.max(w, 15);
    if (kind === 'pct') w = Math.max(w, 12);
    if (kind === 'int') w = Math.max(w, 12);
    if (i === 0) {
      w = Math.max(w, 24);
      for (const k of kpis) w = Math.max(w, Math.min(textWidth(k.l) + 2, 42));
    }
    if (i === 1) {
      w = Math.max(w, 18);
      for (const k of kpis) w = Math.max(w, Math.min(textWidth(k.v) + 2, 28));
    }
    for (const row of body.slice(0, 50)) {
      const cell = prettyText(row[i] ?? '');
      if (kind === 'text' || kind === 'month') w = Math.max(w, Math.min(textWidth(cell) + 2, 38));
    }
    widths.push(Math.min(44, Math.max(12, Math.ceil(w))));
  }
  return widths;
}

function prettyText(s: string): string {
  return s.replace(/\d{4}-\d{2}-\d{2}/g, isoToDots).replace(/, T\b/g, ', ₸');
}

function isoToDots(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}.${m[2]}.${m[1]}` : iso;
}

function excelSerial(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(1899, 11, 30)) / 86_400_000);
}

function parsePlainNumber(s: string): number | null {
  const t = String(s ?? '')
    .trim()
    .replace(/\s/g, '')
    .replace(',', '.');
  if (!/^-?\d+(\.\d+)?$/.test(t)) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function textWidth(s: string): number {
  let w = 0;
  for (const ch of s) w += ch.charCodeAt(0) > 127 ? 1.15 : 1;
  return w;
}

function formatStamp(): string {
  return new Intl.DateTimeFormat('ru-RU', {
    timeZone: 'Asia/Almaty',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date());
}

function sheetName(title: string): string {
  const clean = title.replace(/[:\\/?*[\]]/g, ' ').replace(/\s+/g, ' ').trim();
  return (clean || 'Отчёт').slice(0, 31);
}

function safeFile(title: string): string {
  return title.replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim() || 'otchet';
}

function colLetter(i: number): string {
  let n = i;
  let s = '';
  while (n >= 0) {
    s = String.fromCharCode((n % 26) + 65) + s;
    n = Math.floor(n / 26) - 1;
  }
  return s;
}

function xml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function xmlText(s: string): string {
  return xml(s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
}

class SheetWriter {
  r = 0;
  private rows: string[] = [];
  private merges: string[] = [];
  constructor(readonly colCount: number) {}

  row(height: number): void {
    if (this.pending) this.flush();
    this.r += 1;
    this.pending = { height, cells: [] };
  }

  cell(col: number, style: number, value: string | number, kind: 'inline' | 'n'): void {
    this.ensureRow().cells.push({ col, style, value, kind });
  }

  formula(col: number, style: number, formula: string, cached: number): void {
    this.ensureRow().cells.push({ col, style, value: cached, kind: 'f', formula });
  }

  merge(ref: string): void {
    this.merges.push(ref);
  }

  toSheetXml(opts: {
    widths: number[];
    autoFilter: string | null;
    freeze: number;
    lastCol: string;
    lastRow: number;
  }): string {
    if (this.pending) this.flush();
    const cols = opts.widths
      .map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`)
      .join('');
    const pane = opts.freeze
      ? `<pane ySplit="${opts.freeze}" topLeftCell="A${opts.freeze + 1}" activePane="bottomLeft" state="frozen"/>`
      : '';
    const filter = opts.autoFilter ? `<autoFilter ref="${opts.autoFilter}"/>` : '';
    const merges = this.merges.length
      ? `<mergeCells count="${this.merges.length}">${this.merges
          .map((m) => `<mergeCell ref="${m}"/>`)
          .join('')}</mergeCells>`
      : '';
    return (
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"` +
      ` xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"` +
      ` xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"` +
      ` mc:Ignorable="x14ac"` +
      ` xmlns:x14ac="http://schemas.microsoft.com/office/spreadsheetml/2009/9/ac">` +
      `<sheetPr><tabColor rgb="${BRAND}"/></sheetPr>` +
      `<dimension ref="A1:${opts.lastCol}${Math.max(opts.lastRow, 1)}"/>` +
      `<sheetViews><sheetView workbookViewId="0" showGridLines="1">${pane}</sheetView></sheetViews>` +
      `<sheetFormatPr defaultRowHeight="16" x14ac:dyDescent="0.25"/>` +
      `<cols>${cols}</cols>` +
      `<sheetData>${this.rows.join('')}</sheetData>` +
      filter +
      merges +
      `<printOptions horizontalCentered="1"/>` +
      `<pageMargins left="0.45" right="0.45" top="0.6" bottom="0.5" header="0.28" footer="0.28"/>` +
      `<pageSetup paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="0" horizontalDpi="200" verticalDpi="200"/>` +
      `<headerFooter>` +
      `<oddHeader>&amp;L&amp;K127F86AmanAI&amp;C&amp;A&amp;R&amp;D</oddHeader>` +
      `<oddFooter>&amp;LНе банковская выписка&amp;Rстр. &amp;P / &amp;N</oddFooter>` +
      `</headerFooter>` +
      `</worksheet>`
    );
  }

  private pending: {
    height: number;
    cells: {
      col: number;
      style: number;
      value: string | number;
      kind: 'inline' | 'n' | 'f';
      formula?: string;
    }[];
  } | null = null;

  private ensureRow(): NonNullable<SheetWriter['pending']> {
    if (!this.pending) this.row(16);
    return this.pending as NonNullable<SheetWriter['pending']>;
  }

  private flush(): void {
    const row = this.pending;
    this.pending = null;
    if (!row) return;
    const cells = row.cells
      .sort((a, b) => a.col - b.col)
      .map((c) => {
        const ref = `${colLetter(c.col)}${this.r}`;
        if (c.kind === 'n') return `<c r="${ref}" s="${c.style}" t="n"><v>${c.value}</v></c>`;
        if (c.kind === 'f') {
          return `<c r="${ref}" s="${c.style}" t="n"><f>${xml(c.formula ?? '')}</f><v>${c.value}</v></c>`;
        }
        const t = xmlText(String(c.value));
        const space = /^\s|\s$/.test(String(c.value)) ? ' xml:space="preserve"' : '';
        return `<c r="${ref}" s="${c.style}" t="inlineStr"><is><t${space}>${t}</t></is></c>`;
      })
      .join('');
    this.rows.push(
      `<row r="${this.r}" ht="${row.height}" customHeight="1" spans="1:${this.colCount}">${cells}</row>`,
    );
  }
}

function packXlsx(opts: { title: string; sheet: string; sheetXml: string }): { name: string; data: Uint8Array }[] {
  const now = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
  const styles = stylesXml();
  return [
    { name: '[Content_Types].xml', data: utf8(contentTypesXml()) },
    { name: '_rels/.rels', data: utf8(relsRootXml()) },
    { name: 'docProps/app.xml', data: utf8(appXml(opts.sheet)) },
    { name: 'docProps/core.xml', data: utf8(coreXml(opts.title, now)) },
    { name: 'xl/workbook.xml', data: utf8(workbookXml(opts.sheet)) },
    { name: 'xl/_rels/workbook.xml.rels', data: utf8(workbookRelsXml()) },
    { name: 'xl/styles.xml', data: utf8(styles) },
    { name: 'xl/worksheets/sheet1.xml', data: utf8(opts.sheetXml) },
  ];
}

function contentTypesXml(): string {
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
    `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
    `<Default Extension="xml" ContentType="application/xml"/>` +
    `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
    `<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>` +
    `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>` +
    `<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>` +
    `<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>` +
    `</Types>`
  );
}

function relsRootXml(): string {
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>` +
    `<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>` +
    `<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>` +
    `</Relationships>`
  );
}

function workbookRelsXml(): string {
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>` +
    `<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
    `</Relationships>`
  );
}

function workbookXml(sheet: string): string {
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"` +
    ` xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
    `<bookViews><workbookView xWindow="0" yWindow="0" windowWidth="24000" windowHeight="14000"/></bookViews>` +
    `<sheets><sheet name="${xml(sheet)}" sheetId="1" r:id="rId1"/></sheets>` +
    `<calcPr calcId="0" fullCalcOnLoad="1"/>` +
    `</workbook>`
  );
}

function coreXml(title: string, now: string): string {
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"` +
    ` xmlns:dc="http://purl.org/dc/elements/1.1/"` +
    ` xmlns:dcterms="http://purl.org/dc/terms/"` +
    ` xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">` +
    `<dc:title>${xml(title)}</dc:title>` +
    `<dc:creator>AmanAI</dc:creator>` +
    `<cp:lastModifiedBy>AmanAI</cp:lastModifiedBy>` +
    `<dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created>` +
    `<dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified>` +
    `</cp:coreProperties>`
  );
}

function appXml(sheet: string): string {
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"` +
    ` xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">` +
    `<Application>AmanAI</Application>` +
    `<DocSecurity>0</DocSecurity>` +
    `<HeadingPairs><vt:vector size="2" baseType="variant">` +
    `<vt:variant><vt:lpstr>Worksheets</vt:lpstr></vt:variant>` +
    `<vt:variant><vt:i4>1</vt:i4></vt:variant>` +
    `</vt:vector></HeadingPairs>` +
    `<TitlesOfParts><vt:vector size="1" baseType="lpstr">` +
    `<vt:lpstr>${xml(sheet)}</vt:lpstr>` +
    `</vt:vector></TitlesOfParts>` +
    `</Properties>`
  );
}

function stylesXml(): string {
  const fonts = [
    font(11, INK, false, false),
    font(11, WHITE, true, false),
    font(18, BRAND_DEEP, true, false),
    font(11, MUTED, false, false),
    font(10, MUTED, false, true),
    font(10, MUTED, false, false),
    font(13, BRAND_DEEP, true, false),
    font(10, WHITE, true, false),
    font(9, FAINT, false, true),
    font(12, BRAND_DEEP, true, false),
    font(11, BRAND_DEEP, true, false),
  ];
  const fills = [
    `<fill><patternFill patternType="none"/></fill>`,
    `<fill><patternFill patternType="gray125"/></fill>`,
    fill(BRAND),
    fill(SOFT),
    fill(ZEBRA),
  ];
  const borders = [
    `<border><left/><right/><top/><bottom/><diagonal/></border>`,
    border(LINE),
  ];

  // 0 base, 1 brand, 2 title, 3 subtitle, 4 note,
  // 5 unused (kept for stability), 6 unused,
  // 7 tableHead / kpi head, 8 text, 9 textAlt,
  // 10 int, 11 intAlt, 12 date, 13 dateAlt,
  // 14 money, 15 moneyAlt, 16 pct, 17 pctAlt,
  // 18 footer, 19 section, 20 totalText, 21 totalNum
  const xfs = [
    xf(0, 0, 0, 0, false, 'left', false), // 0
    xf(0, 1, 2, 0, false, 'left', false), // 1 brand
    xf(0, 2, 0, 0, false, 'left', false), // 2 title
    xf(0, 3, 0, 0, false, 'left', false), // 3 subtitle
    xf(0, 4, 0, 0, false, 'left', true), // 4 note
    xf(0, 5, 3, 1, false, 'left', true), // 5 kpi label spare
    xf(0, 6, 3, 1, false, 'left', false), // 6 kpi value spare
    xf(0, 7, 2, 1, false, 'center', true), // 7 head
    xf(0, 0, 0, 1, false, 'left', true), // 8 text
    xf(0, 0, 4, 1, false, 'left', true), // 9 textAlt
    xf(3, 0, 0, 1, true, 'right', false), // 10 int #,##0
    xf(3, 0, 4, 1, true, 'right', false), // 11 intAlt
    xf(164, 0, 0, 1, true, 'center', false), // 12 date
    xf(164, 0, 4, 1, true, 'center', false), // 13 dateAlt
    xf(3, 0, 0, 1, true, 'right', false), // 14 money
    xf(3, 0, 4, 1, true, 'right', false), // 15 moneyAlt
    xf(165, 0, 0, 1, true, 'right', false), // 16 pct
    xf(165, 0, 4, 1, true, 'right', false), // 17 pctAlt
    xf(0, 8, 0, 0, false, 'left', true), // 18 footer
    xf(0, 9, 0, 0, false, 'left', false), // 19 section
    xf(0, 10, 3, 1, false, 'left', false), // 20 total text
    xf(3, 10, 3, 1, true, 'right', false), // 21 total num
  ];

  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
    `<numFmts count="2">` +
    `<numFmt numFmtId="164" formatCode="dd.mm.yyyy"/>` +
    `<numFmt numFmtId="165" formatCode="0&quot;%&quot;"/>` +
    `</numFmts>` +
    `<fonts count="${fonts.length}">${fonts.join('')}</fonts>` +
    `<fills count="${fills.length}">${fills.join('')}</fills>` +
    `<borders count="${borders.length}">${borders.join('')}</borders>` +
    `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>` +
    `<cellXfs count="${xfs.length}">${xfs.join('')}</cellXfs>` +
    `<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>` +
    `</styleSheet>`
  );
}

function font(sz: number, color: string, bold: boolean, italic: boolean): string {
  return (
    `<font>` +
    (bold ? `<b/>` : '') +
    (italic ? `<i/>` : '') +
    `<sz val="${sz}"/>` +
    `<color rgb="${color}"/>` +
    `<name val="Calibri"/>` +
    `<family val="2"/>` +
    `<charset val="204"/>` +
    `</font>`
  );
}

function fill(rgb: string): string {
  return `<fill><patternFill patternType="solid"><fgColor rgb="${rgb}"/><bgColor indexed="64"/></patternFill></fill>`;
}

function border(rgb: string): string {
  const s = `<color rgb="${rgb}"/>`;
  return (
    `<border>` +
    `<left style="thin">${s}</left>` +
    `<right style="thin">${s}</right>` +
    `<top style="thin">${s}</top>` +
    `<bottom style="thin">${s}</bottom>` +
    `<diagonal/>` +
    `</border>`
  );
}

function xf(
  numFmtId: number,
  fontId: number,
  fillId: number,
  borderId: number,
  applyNum: boolean,
  horiz: 'left' | 'center' | 'right',
  wrap: boolean,
): string {
  return (
    `<xf numFmtId="${numFmtId}" fontId="${fontId}" fillId="${fillId}" borderId="${borderId}" xfId="0"` +
    ` applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"` +
    (applyNum ? ` applyNumberFormat="1"` : '') +
    `>` +
    `<alignment horizontal="${horiz}" vertical="center"${wrap ? ' wrapText="1"' : ''}/>` +
    `</xf>`
  );
}

function utf8(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = (c & 1 ? 0xedb88320 : 0) ^ (c >>> 1);
    t[i] = c >>> 0;
  }
  return t;
})();

function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function u16(n: number): Uint8Array {
  const b = new Uint8Array(2);
  b[0] = n & 0xff;
  b[1] = (n >>> 8) & 0xff;
  return b;
}

function u32(n: number): Uint8Array {
  const b = new Uint8Array(4);
  b[0] = n & 0xff;
  b[1] = (n >>> 8) & 0xff;
  b[2] = (n >>> 16) & 0xff;
  b[3] = (n >>> 24) & 0xff;
  return b;
}

function concat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((s, p) => s + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

function zipStore(files: { name: string; data: Uint8Array }[]): Uint8Array {
  const now = new Date();
  const time = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
  const date = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;
  for (const f of files) {
    const name = utf8(f.name);
    const crc = crc32(f.data);
    const local = concat([
      u32(0x04034b50),
      u16(20),
      u16(0x0800),
      u16(0),
      u16(time),
      u16(date),
      u32(crc),
      u32(f.data.length),
      u32(f.data.length),
      u16(name.length),
      u16(0),
      name,
      f.data,
    ]);
    locals.push(local);
    centrals.push(
      concat([
        u32(0x02014b50),
        u16(20),
        u16(20),
        u16(0x0800),
        u16(0),
        u16(time),
        u16(date),
        u32(crc),
        u32(f.data.length),
        u32(f.data.length),
        u16(name.length),
        u16(0),
        u16(0),
        u16(0),
        u16(0),
        u32(0),
        u32(offset),
        name,
      ]),
    );
    offset += local.length;
  }
  const central = concat(centrals);
  return concat([
    ...locals,
    central,
    u32(0x06054b50),
    u16(0),
    u16(0),
    u16(files.length),
    u16(files.length),
    u32(central.length),
    u32(offset),
    u16(0),
  ]);
}
