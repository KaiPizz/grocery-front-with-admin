#!/usr/bin/env node

import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const DEFAULT_INPUT = 'docs/asiandeligo-owner-image-review-queue-folder02-20260709.csv';
const DEFAULT_OUTPUT = 'docs/asiandeligo-owner-review-folder02-20260709.html';
const DEFAULT_ASSETS_DIR = 'docs/asiandeligo-owner-review-folder02-assets';
const DEFAULT_TITLE = 'Asia Deli Go Owner Review - Folder 02';
const DEFAULT_STORAGE_KEY = 'asiandeligo-owner-review-folder02-v1';
const DEFAULT_SUBTITLE = 'Folder 02 · review uncertain owner-stock products before creating SKUs or assigning images';
const DEFAULT_DOWNLOAD_NAME = 'asiandeligo-folder02-owner-decisions.csv';

function parseArgs(argv) {
  const args = {
    input: DEFAULT_INPUT,
    output: DEFAULT_OUTPUT,
    assetsDir: DEFAULT_ASSETS_DIR,
    title: DEFAULT_TITLE,
    storageKey: DEFAULT_STORAGE_KEY,
    subtitle: DEFAULT_SUBTITLE,
    downloadName: DEFAULT_DOWNLOAD_NAME,
    clean: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = () => {
      i += 1;
      if (i >= argv.length) throw new Error(`Missing value for ${arg}`);
      return argv[i];
    };
    if (arg === '--input') args.input = next();
    else if (arg === '--output') args.output = next();
    else if (arg === '--assets-dir') args.assetsDir = next();
    else if (arg === '--title') args.title = next();
    else if (arg === '--storage-key') args.storageKey = next();
    else if (arg === '--subtitle') args.subtitle = next();
    else if (arg === '--download-name') args.downloadName = next();
    else if (arg === '--clean') args.clean = true;
    else if (arg === '--help' || arg === '-h') {
      console.log(`Usage: node scripts/owner-image-review-page.mjs [options]

Options:
  --input <csv>           Review queue CSV path
  --output <html>         Output HTML path
  --assets-dir <dir>      Output asset directory
  --title <text>          Page title
  --storage-key <key>     localStorage key
  --subtitle <text>       Header subtitle
  --download-name <file>  Exported decisions CSV filename
  --clean                 Remove asset dir before regenerating
`);
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return args;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];

    if (quoted) {
      if (ch === '"' && next === '"') {
        field += '"';
        i += 1;
      } else if (ch === '"') {
        quoted = false;
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      quoted = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (ch !== '\r') {
      field += ch;
    }
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }

  const [headers, ...records] = rows.filter((candidate) => candidate.some((value) => value !== ''));
  return records.map((record) => Object.fromEntries(headers.map((header, index) => [header, record[index] ?? ''])));
}

function splitList(value) {
  return String(value || '')
    .split(';')
    .map((item) => item.trim())
    .filter(Boolean);
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[ch]));
}

function fileBase(filePath) {
  return path.basename(filePath).replace(/\.[^.]+$/, '');
}

function thumbnailImage(inputPath, outputPath) {
  const result = spawnSync('ffmpeg', [
    '-hide_banner',
    '-loglevel',
    'error',
    '-y',
    '-i',
    inputPath,
    '-vf',
    "scale='min(1100,iw)':-2",
    '-q:v',
    '5',
    outputPath,
  ], { encoding: 'utf8' });

  if (result.status !== 0) {
    throw new Error(`ffmpeg failed for ${inputPath}: ${result.stderr || result.stdout}`);
  }
}

function suggestedDecision(status) {
  if (status === 'create_new_confirm') return 'create_new';
  if (status === 'ignore_or_supplies') return 'skip';
  return '';
}

function renderHtml({ rows, title, storageKey, subtitle, downloadName }) {
  const data = JSON.stringify({ rows, counts: countBy(rows, 'status') });
  return `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    :root {
      --bg: #f6f7f4;
      --panel: #ffffff;
      --text: #19201c;
      --muted: #5f6c63;
      --line: #dfe5df;
      --brand: #169b45;
      --brand-dark: #0f7a35;
      --warn: #9b5f00;
      --bad: #b42318;
      --blue: #2563eb;
      --shadow: 0 16px 42px rgba(19, 32, 24, .12);
    }
    * { box-sizing: border-box; }
    body { margin: 0; background: var(--bg); color: var(--text); font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    header { position: sticky; top: 0; z-index: 20; background: rgba(246,247,244,.94); backdrop-filter: blur(10px); border-bottom: 1px solid var(--line); }
    .topbar { max-width: 1360px; margin: 0 auto; padding: 14px 20px; display: grid; grid-template-columns: minmax(240px, 1fr) auto; gap: 16px; align-items: center; }
    h1 { margin: 0; font-size: 20px; line-height: 1.2; }
    .sub { margin-top: 3px; color: var(--muted); font-size: 13px; }
    .stats { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 8px; }
    .pill { border: 1px solid var(--line); background: var(--panel); border-radius: 999px; padding: 6px 10px; font-size: 13px; color: var(--muted); white-space: nowrap; }
    main { max-width: 1360px; margin: 0 auto; padding: 18px 20px 36px; }
    .toolbar { display: grid; grid-template-columns: 1fr auto; gap: 12px; margin-bottom: 14px; align-items: center; }
    .filters, .actions { display: flex; flex-wrap: wrap; gap: 8px; }
    button { border: 1px solid var(--line); border-radius: 8px; background: var(--panel); color: var(--text); padding: 9px 12px; font: inherit; font-weight: 650; cursor: pointer; display: inline-flex; align-items: center; gap: 7px; min-height: 38px; }
    button:hover { border-color: #a8b5aa; }
    button.active { background: var(--text); color: white; border-color: var(--text); }
    button.primary { background: var(--brand); color: white; border-color: var(--brand); }
    button.primary:hover { background: var(--brand-dark); }
    .layout { display: grid; grid-template-columns: 340px minmax(0, 1fr); gap: 16px; align-items: start; }
    .list { background: var(--panel); border: 1px solid var(--line); border-radius: 8px; overflow: hidden; max-height: calc(100vh - 156px); position: sticky; top: 92px; }
    .search { width: 100%; border: 0; border-bottom: 1px solid var(--line); padding: 13px 14px; font: inherit; outline: none; }
    .list-scroll { overflow: auto; max-height: calc(100vh - 205px); }
    .row-btn { width: 100%; border: 0; border-bottom: 1px solid var(--line); border-radius: 0; justify-content: flex-start; text-align: left; padding: 12px 14px; background: white; display: grid; grid-template-columns: 44px 1fr auto; gap: 10px; align-items: center; }
    .row-btn.active { background: #eef8f1; color: var(--text); }
    .row-index { width: 34px; height: 34px; border-radius: 50%; background: #eef1ee; display: grid; place-items: center; font-size: 12px; font-weight: 750; color: var(--muted); }
    .row-main { min-width: 0; }
    .row-title { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; font-weight: 750; }
    .row-meta { display: block; margin-top: 3px; color: var(--muted); font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .decision-dot { width: 12px; height: 12px; border-radius: 50%; background: #ccd4ce; }
    .decision-dot.confirm { background: var(--brand); }
    .decision-dot.wrong { background: var(--bad); }
    .decision-dot.create_new { background: var(--blue); }
    .decision-dot.skip { background: #75808a; }
    .card { background: var(--panel); border: 1px solid var(--line); border-radius: 8px; box-shadow: var(--shadow); overflow: hidden; }
    .card-head { padding: 18px 20px; border-bottom: 1px solid var(--line); display: flex; gap: 16px; justify-content: space-between; align-items: flex-start; }
    .card-title { margin: 0; font-size: 22px; line-height: 1.25; }
    .tagline { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 10px; }
    .tag { display: inline-flex; align-items: center; border-radius: 999px; padding: 5px 9px; background: #eff2ef; color: var(--muted); font-size: 12px; font-weight: 700; }
    .tag.blue { background: #e9f0ff; color: var(--blue); }
    .tag.warn { background: #fff4db; color: var(--warn); }
    .tag.bad { background: #ffe8e6; color: var(--bad); }
    .split { display: grid; grid-template-columns: minmax(320px, 55%) minmax(0, 1fr); gap: 0; }
    .images { border-right: 1px solid var(--line); padding: 18px; background: #fbfcfb; }
    .image-grid { display: grid; gap: 12px; }
    .thumb { border: 1px solid var(--line); border-radius: 8px; background: white; padding: 8px; }
    .thumb img { display: block; width: 100%; height: auto; max-height: 540px; object-fit: contain; }
    .thumb-name { margin-top: 7px; color: var(--muted); font-size: 12px; font-weight: 700; }
    .details { padding: 18px 20px 20px; }
    .section { padding: 0 0 18px; margin-bottom: 18px; border-bottom: 1px solid var(--line); }
    .section:last-child { border-bottom: 0; margin-bottom: 0; padding-bottom: 0; }
    .label { color: var(--muted); font-size: 12px; text-transform: uppercase; font-weight: 800; letter-spacing: .06em; margin-bottom: 6px; }
    .value { font-size: 16px; line-height: 1.45; }
    .notes { color: var(--muted); line-height: 1.5; white-space: pre-wrap; }
    .textarea { width: 100%; min-height: 72px; border: 1px solid var(--line); border-radius: 8px; padding: 10px; font: inherit; resize: vertical; }
    .decision-bar { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; padding: 14px 20px; background: #f3f6f3; border-top: 1px solid var(--line); }
    .decision-bar button { justify-content: center; min-width: 0; }
    .decision-bar button[data-decision="confirm"] { border-color: #acdaba; }
    .decision-bar button[data-decision="wrong"] { border-color: #f0b8b4; }
    .decision-bar button[data-decision="create_new"] { border-color: #b8cbff; }
    .decision-bar button.selected[data-decision="confirm"] { background: var(--brand); border-color: var(--brand); color: white; }
    .decision-bar button.selected[data-decision="wrong"] { background: var(--bad); border-color: var(--bad); color: white; }
    .decision-bar button.selected[data-decision="create_new"] { background: var(--blue); border-color: var(--blue); color: white; }
    .decision-bar button.selected[data-decision="skip"] { background: #4b5563; border-color: #4b5563; color: white; }
    .empty { padding: 40px; text-align: center; color: var(--muted); }
    @media (max-width: 980px) {
      .topbar, .toolbar, .layout, .split { grid-template-columns: 1fr; }
      .stats { justify-content: flex-start; }
      .list { position: static; max-height: 320px; }
      .list-scroll { max-height: 265px; }
      .images { border-right: 0; border-bottom: 1px solid var(--line); }
      .decision-bar { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }
  </style>
</head>
<body>
  <header>
    <div class="topbar">
      <div>
        <h1>${escapeHtml(title)}</h1>
        <div class="sub">${escapeHtml(subtitle)}</div>
      </div>
      <div class="stats" id="stats"></div>
    </div>
  </header>
  <main>
    <div class="toolbar">
      <div class="filters">
        <button data-filter="all" class="active">All rows</button>
        <button data-filter="review_high_existing_sku">Existing SKU</button>
        <button data-filter="review_possible_existing_sku">Possible SKU</button>
        <button data-filter="create_new_confirm">Create new / confirm</button>
        <button data-filter="hold_confirm">Hold / confirm</button>
        <button data-filter="ignore_or_supplies">Ignore / supplies</button>
        <button data-filter="undecided">Undecided</button>
      </div>
      <div class="actions">
        <button id="prevBtn">Prev</button>
        <button id="nextBtn">Next</button>
        <button class="primary" id="exportBtn">Export CSV</button>
      </div>
    </div>
    <div class="layout">
      <aside class="list">
        <input id="search" class="search" placeholder="Search file, status, product..." />
        <div class="list-scroll" id="rowList"></div>
      </aside>
      <section class="card" id="card"></section>
    </div>
  </main>
<script>
const REVIEW_DATA = ${data};
const STORAGE_KEY = ${JSON.stringify(storageKey)};
const DOWNLOAD_NAME = ${JSON.stringify(downloadName)};
let rows = REVIEW_DATA.rows;
let decisions = loadState();
let filter = 'all';
let search = '';
let currentId = rows[0]?.id;

function loadState() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
}
function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(decisions)); }
function rowDecision(row) { return decisions[row.id]?.decision || ''; }
function rowNotes(row) { return decisions[row.id]?.notes || ''; }
function filteredRows() {
  const q = search.trim().toLowerCase();
  return rows.filter(row => {
    if (filter === 'undecided' && rowDecision(row)) return false;
    if (filter !== 'all' && filter !== 'undecided' && row.status !== filter) return false;
    if (!q) return true;
    const hay = [row.id, row.source_batch, row.status, row.files, row.visible_product, row.target_sku, row.candidate_product, row.reason, row.next_action].join(' ').toLowerCase();
    return hay.includes(q);
  });
}
function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}
function statusLabel(status) {
  return ({
    create_new_confirm: 'Create new / confirm',
    hold_confirm: 'Hold / confirm',
    ignore_or_supplies: 'Ignore / supplies',
    review_high_existing_sku: 'Existing SKU candidate',
    review_possible_existing_sku: 'Possible SKU candidate',
  })[status] || status || 'Review';
}
function decisionLabel(decision) {
  return ({ confirm: 'Confirmed', wrong: 'Wrong', create_new: 'Create new', skip: 'Skip' })[decision] || 'Open';
}
function updateStats() {
  const total = rows.length;
  const done = rows.filter(row => rowDecision(row)).length;
  const counts = {
    review_high_existing_sku: 0,
    review_possible_existing_sku: 0,
    create_new_confirm: 0,
    hold_confirm: 0,
    ignore_or_supplies: 0,
    confirm: 0,
    wrong: 0,
    create_new: 0,
    skip: 0,
  };
  rows.forEach(row => {
    counts[row.status] = (counts[row.status] || 0) + 1;
    const d = rowDecision(row);
    if (d) counts[d] = (counts[d] || 0) + 1;
  });
  document.getElementById('stats').innerHTML = \`
    <span class="pill">\${done}/\${total} reviewed</span>
    <span class="pill">Existing: \${counts.review_high_existing_sku}</span>
    <span class="pill">Possible: \${counts.review_possible_existing_sku}</span>
    <span class="pill">Create confirm: \${counts.create_new_confirm}</span>
    <span class="pill">Hold: \${counts.hold_confirm}</span>
    <span class="pill">Confirmed: \${counts.confirm}</span>
    <span class="pill">Wrong: \${counts.wrong}</span>
    <span class="pill">Create: \${counts.create_new}</span>
    <span class="pill">Skip: \${counts.skip}</span>\`;
}
function renderList() {
  const list = filteredRows();
  const el = document.getElementById('rowList');
  if (!list.length) { el.innerHTML = '<div class="empty">No rows</div>'; return; }
  if (!list.some(row => row.id === currentId)) currentId = list[0].id;
  el.innerHTML = list.map(row => {
    const d = rowDecision(row);
    return \`<button class="row-btn \${row.id === currentId ? 'active' : ''}" data-row-id="\${esc(row.id)}">
      <span class="row-index">\${row.index}</span>
      <span class="row-main"><span class="row-title">\${esc(row.visible_product)}</span><span class="row-meta">\${esc(statusLabel(row.status))} · \${esc(row.files)}</span></span>
      <span class="decision-dot \${esc(d)}" title="\${esc(decisionLabel(d))}"></span>
    </button>\`;
  }).join('');
  el.querySelectorAll('[data-row-id]').forEach(btn => btn.addEventListener('click', () => { currentId = btn.dataset.rowId; render(); }));
}
function renderCard() {
  const row = rows.find(r => r.id === currentId) || filteredRows()[0];
  const el = document.getElementById('card');
  if (!row) { el.innerHTML = '<div class="empty">No row selected</div>'; return; }
  const d = rowDecision(row);
  const thumbHtml = row.thumbs.length ? row.thumbs.map(t => \`<div class="thumb"><img src="\${esc(t.src)}" alt="\${esc(t.file)}"><div class="thumb-name">\${esc(t.file)}</div></div>\`).join('') : '<div class="empty">Missing thumbnail</div>';
  const tagClass = row.status === 'create_new_confirm' ? 'blue' : row.status === 'ignore_or_supplies' ? 'bad' : 'warn';
  const skuHtml = row.target_sku || row.candidate_product || row.product_url || row.confidence ? \`
        <div class="section"><div class="label">Candidate SKU</div><div class="value">
          \${row.target_sku ? \`<div><strong>\${esc(row.target_sku)}</strong></div>\` : ''}
          \${row.candidate_product ? \`<div>\${esc(row.candidate_product)}</div>\` : ''}
          \${row.confidence ? \`<div class="notes">Confidence: \${esc(row.confidence)}</div>\` : ''}
          \${row.product_url ? \`<div><a href="\${esc(row.product_url)}" target="_blank" rel="noreferrer">\${esc(row.product_url)}</a></div>\` : ''}
        </div></div>\` : '';
  el.innerHTML = \`
    <div class="card-head">
      <div>
        <h2 class="card-title">\${row.index}. \${esc(row.visible_product)}</h2>
        <div class="tagline">
          <span class="tag \${tagClass}">\${esc(statusLabel(row.status))}</span>
          <span class="tag">\${esc(row.source_batch)}</span>
          <span class="tag">\${esc(row.id)}</span>
          \${row.suggested_decision ? \`<span class="tag">Suggested: \${esc(decisionLabel(row.suggested_decision))}</span>\` : ''}
        </div>
      </div>
      <div class="pill">Decision: \${esc(decisionLabel(d))}</div>
    </div>
    <div class="split">
      <div class="images"><div class="image-grid">\${thumbHtml}</div></div>
      <div class="details">
        \${skuHtml}
        <div class="section"><div class="label">Review reason</div><div class="notes">\${esc(row.reason || '')}</div></div>
        <div class="section"><div class="label">Next action</div><div class="notes">\${esc(row.next_action || '')}</div></div>
        <div class="section"><div class="label">Source files</div><div class="notes">\${esc(row.files || '')}</div></div>
        <div class="section"><div class="label">Owner notes</div><textarea class="textarea" id="ownerNotes" placeholder="Ghi xác nhận, tên đúng, size, EAN, giá, hoặc lý do bỏ qua...">\${esc(rowNotes(row))}</textarea></div>
      </div>
    </div>
    <div class="decision-bar">
      <button data-decision="confirm" class="\${d === 'confirm' ? 'selected' : ''}">1 · Confirm</button>
      <button data-decision="wrong" class="\${d === 'wrong' ? 'selected' : ''}">2 · Wrong</button>
      <button data-decision="create_new" class="\${d === 'create_new' ? 'selected' : ''}">3 · Create new</button>
      <button data-decision="skip" class="\${d === 'skip' ? 'selected' : ''}">4 · Skip</button>
    </div>\`;
  el.querySelectorAll('[data-decision]').forEach(btn => btn.addEventListener('click', () => setDecision(row.id, btn.dataset.decision)));
  const notes = el.querySelector('#ownerNotes');
  notes.addEventListener('input', () => { decisions[row.id] = { ...(decisions[row.id] || {}), notes: notes.value }; saveState(); });
}
function setDecision(id, decision) {
  decisions[id] = { ...(decisions[id] || {}), decision };
  saveState();
  move(1);
}
function move(delta) {
  const list = filteredRows();
  const idx = Math.max(0, list.findIndex(row => row.id === currentId));
  const next = list[Math.min(list.length - 1, Math.max(0, idx + delta))];
  if (next) currentId = next.id;
  render();
}
function render() { updateStats(); renderList(); renderCard(); }
function exportCsv() {
  const headers = ['id','source_batch','status','files','visible_product','target_sku','candidate_product','confidence','product_url','decision','owner_notes','reason','next_action'];
  const lines = [headers.join(',')];
  for (const row of rows) {
    const state = decisions[row.id] || {};
    const values = [row.id,row.source_batch,row.status,row.files,row.visible_product,row.target_sku,row.candidate_product,row.confidence,row.product_url,state.decision || '',state.notes || '',row.reason,row.next_action];
    lines.push(values.map(v => '"' + String(v ?? '').replace(/"/g, '""') + '"').join(','));
  }
  const blob = new Blob([lines.join('\\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = DOWNLOAD_NAME;
  a.click();
  URL.revokeObjectURL(url);
}
document.querySelectorAll('[data-filter]').forEach(btn => btn.addEventListener('click', () => {
  document.querySelectorAll('[data-filter]').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  filter = btn.dataset.filter;
  render();
}));
document.getElementById('search').addEventListener('input', event => { search = event.target.value; render(); });
document.getElementById('prevBtn').addEventListener('click', () => move(-1));
document.getElementById('nextBtn').addEventListener('click', () => move(1));
document.getElementById('exportBtn').addEventListener('click', exportCsv);
document.addEventListener('keydown', event => {
  if (event.target && ['TEXTAREA','INPUT'].includes(event.target.tagName)) return;
  if (event.key === 'ArrowRight') move(1);
  if (event.key === 'ArrowLeft') move(-1);
  if (event.key === '1') setDecision(currentId, 'confirm');
  if (event.key === '2') setDecision(currentId, 'wrong');
  if (event.key === '3') setDecision(currentId, 'create_new');
  if (event.key === '4') setDecision(currentId, 'skip');
});
render();
</script>
</body>
</html>
`;
}

function countBy(rows, key) {
  return rows.reduce((acc, row) => {
    const value = row[key] || '';
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const inputPath = path.resolve(args.input);
  const outputPath = path.resolve(args.output);
  const assetsDir = path.resolve(args.assetsDir);
  const thumbsDir = path.join(assetsDir, 'thumbs');

  const csv = await readFile(inputPath, 'utf8');
  const parsedRows = parseCsv(csv);
  if (!parsedRows.length) throw new Error(`No rows found in ${inputPath}`);

  if (args.clean && existsSync(assetsDir)) await rm(assetsDir, { recursive: true, force: true });
  await mkdir(thumbsDir, { recursive: true });

  let missing = 0;
  const rows = parsedRows.map((row, index) => {
    const localFiles = splitList(row.local_files);
    const thumbs = [];
    for (const localFile of localFiles) {
      const basename = path.basename(localFile);
      const outName = `${fileBase(basename)}.jpg`;
      const outPath = path.join(thumbsDir, outName);
      if (!existsSync(localFile)) {
        missing += 1;
        continue;
      }
      if (!existsSync(outPath)) thumbnailImage(localFile, outPath);
      thumbs.push({
        file: basename,
        src: `${path.basename(assetsDir)}/thumbs/${outName}`,
      });
    }
    return {
      source_batch: row.source_batch,
      status: row.status,
      id: row.review_id,
      files: row.files,
      visible_product: row.visible_product,
      target_sku: row.target_sku || '',
      candidate_product: row.candidate_product || '',
      confidence: row.confidence || '',
      product_url: row.product_url || '',
      reason: row.reason,
      next_action: row.next_action,
      index: index + 1,
      suggested_decision: suggestedDecision(row.status),
      thumbs,
    };
  });

  const html = renderHtml({
    rows,
    title: args.title,
    storageKey: args.storageKey,
    subtitle: args.subtitle,
    downloadName: args.downloadName,
  });
  await writeFile(outputPath, html, 'utf8');

  console.log(`Wrote ${outputPath}`);
  console.log(`Rows: ${rows.length}`);
  console.log(`Thumbnails: ${rows.reduce((sum, row) => sum + row.thumbs.length, 0)}`);
  console.log(`Missing source images: ${missing}`);
  console.log(`Assets: ${assetsDir}`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
