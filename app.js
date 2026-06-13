/* ===========================================================
   DATA
   freq: 'daily' | 'weekly' | 'monthly' | 'asneeded'
=========================================================== */
const sections = [
  {
    id: 'kueche',
    name: 'Küche',
    icon: '🍳',
    color: 'var(--c-kueche)',
    groups: [
      { label: 'Täglich', freq: 'daily', tasks: [
        'Geschirrspüler reinigen',
        'Mikrowelle reinigen',
        'Kühlschränke und Gefrierschränke reinigen',
        'Ablagen abwischen'
      ]},
      { label: 'Einmal in der Woche', freq: 'weekly', tasks: [
        'Regale abwischen plus Heizung abwischen'
      ]}
    ]
  },
  {
    id: 'gastraum',
    name: 'Gästeraum',
    icon: '🛋️',
    color: 'var(--c-gastraum)',
    groups: [
      { label: 'Täglich', freq: 'daily', tasks: [
        'Boden saugen und wischen',
        'Eistheke Scheibe sauber machen',
        'Papierkörbe leeren'
      ]},
      { label: 'Wöchentlich, nach Bedarf', freq: 'weekly', tasks: [
        'Tischbeine sauber machen'
      ]},
      { label: 'Einmal im Monat', freq: 'monthly', tasks: [
        'Sitzbänke sauber machen, abwischen'
      ]}
    ]
  },
  {
    id: 'gasteklo',
    name: 'Gäste-WC',
    icon: '🚻',
    color: 'var(--c-gasteklo)',
    groups: [
      { label: 'Täglich', freq: 'daily', tasks: [
        'Toilette reinigen',
        'Waschbecken reinigen',
        'Ablagen abwischen',
        'Hygieneartikel auffüllen',
        'Fegen, wischen',
        'Spiegel sauber machen'
      ]},
      { label: 'Einmal die Woche', freq: 'weekly', tasks: [
        'Wände wischen, Wände sauber machen',
        'Türen abwischen',
        'Spinnnetz wegmachen'
      ]}
    ]
  },
  {
    id: 'personal',
    name: 'Personal-WC',
    icon: '🧻',
    color: 'var(--c-personal)',
    groups: [
      { label: 'Täglich', freq: 'daily', tasks: [
        'Toilette reinigen',
        'Waschbecken reinigen'
      ]},
      { label: 'Einmal die Woche', freq: 'weekly', tasks: [
        'Ablagerungsorte wischen, Staub wischen'
      ]}
    ]
  },
  {
    id: 'draussen',
    name: 'Draußen (Garten & Hof)',
    icon: '🌳',
    color: 'var(--c-draussen)',
    groups: [
      { label: 'Nach Bedarf', freq: 'asneeded', tasks: [
        'Regenrinne sauber machen',
        'Hof fegen',
        'Unkraut ziehen'
      ]}
    ]
  },
  {
    id: 'sonstiges',
    name: 'Sonstiges',
    icon: '✨',
    color: 'var(--c-sonstiges)',
    groups: [
      { label: 'Einmal die Woche', freq: 'weekly', tasks: [
        'Kinderstühle abziehen und sauber machen'
      ]}
    ]
  }
];

const FREQ_LABELS = {
  daily:   'Heute',
  weekly:  'Diese Woche',
  monthly: 'Diesen Monat',
  asneeded:'Jederzeit'
};

const WEEKDAY_NAMES = ['So','Mo','Di','Mi','Do','Fr','Sa']; // getDay() index
const CLOSED_WEEKDAY = 3; // Mittwoch = Ruhetag

/* ===========================================================
   DATE / PERIOD HELPERS
=========================================================== */
function pad(n){ return String(n).padStart(2,'0'); }

function dateKey(d){
  return d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate());
}
function monthKey(d){
  return d.getFullYear() + '-' + pad(d.getMonth()+1);
}
function isoWeekKey(d){
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = (date.getUTCDay() + 6) % 7; // Mon=0..Sun=6
  date.setUTCDate(date.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const weekNum = 1 + Math.round((date - firstThursday) / (7*24*3600*1000));
  return date.getUTCFullYear() + '-W' + pad(weekNum);
}
function startOfWeek(d){
  // Monday as first day
  const date = new Date(d);
  const diff = (date.getDay() + 6) % 7; // days since Monday
  date.setDate(date.getDate() - diff);
  date.setHours(0,0,0,0);
  return date;
}
function sameDay(a,b){ return dateKey(a) === dateKey(b); }

const TODAY = new Date();
let selectedDate = new Date(TODAY);

function periodKeyFor(freq, dateForDaily){
  if(freq === 'daily')   return dateKey(dateForDaily);
  if(freq === 'weekly')  return isoWeekKey(TODAY);
  if(freq === 'monthly') return monthKey(TODAY);
  return 'persistent';
}
function taskId(secId, gi, ti){ return secId + '__' + gi + '__' + ti; }

/* ===========================================================
   STORAGE
=========================================================== */
const STORAGE_KEY = 'putzplan-eiscafe-nico-v1';

function loadState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(raw){
      const parsed = JSON.parse(raw);
      if(parsed && parsed.log) return parsed;
    }
  }catch(e){ /* ignore */ }
  return { log: {} };
}
function saveState(){
  try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  catch(e){ console.warn('Speichern nicht möglich:', e); }
}

let state = loadState();

function isDone(secId, gi, ti, freq, dateForDaily){
  const pk = periodKeyFor(freq, dateForDaily);
  return !!(state.log[pk] && state.log[pk][taskId(secId, gi, ti)]);
}
function setDone(secId, gi, ti, freq, dateForDaily, value){
  const pk = periodKeyFor(freq, dateForDaily);
  if(!state.log[pk]) state.log[pk] = {};
  if(value) state.log[pk][taskId(secId, gi, ti)] = true;
  else delete state.log[pk][taskId(secId, gi, ti)];
  saveState();
}

function sectionCounts(sec){
  let total = 0, done = 0;
  sec.groups.forEach((g, gi) => g.tasks.forEach((t, ti) => {
    total++;
    if(isDone(sec.id, gi, ti, g.freq, selectedDate)) done++;
  }));
  return { total, done };
}

/* ===========================================================
   RENDER: header date, banner, day row, ring
=========================================================== */
function renderHeader(){
  const opts = { weekday:'long', day:'2-digit', month:'long', year:'numeric' };
  document.getElementById('dateLine').textContent = TODAY.toLocaleDateString('de-DE', opts);

  document.getElementById('ruhetagBanner').classList.toggle('show', TODAY.getDay() === CLOSED_WEEKDAY);

  let total = 0, done = 0;
  sections.forEach(sec => {
    const c = sectionCounts(sec);
    total += c.total;
    done += c.done;
  });
  document.getElementById('overallText').textContent = done + ' / ' + total;
  const circumference = 2 * Math.PI * 20;
  const pct = total ? done/total : 0;
  document.getElementById('overallRingFill').setAttribute('stroke-dasharray', circumference);
  document.getElementById('overallRingFill').setAttribute('stroke-dashoffset', circumference * (1-pct));
}

function renderDayRow(){
  const row = document.getElementById('dayRow');
  row.innerHTML = '';
  const monday = startOfWeek(TODAY);

  for(let i=0; i<7; i++){
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);

    const isToday = sameDay(d, TODAY);
    const isSelected = sameDay(d, selectedDate);
    const isClosed = d.getDay() === CLOSED_WEEKDAY;
    const isFuture = d > TODAY && !sameDay(d, TODAY);

    const btn = document.createElement('button');
    btn.className = 'day-btn';
    if(isToday) btn.classList.add('today');
    if(isSelected) btn.classList.add('selected');
    if(isClosed) btn.classList.add('closed');
    if(isFuture) btn.classList.add('future');

    btn.innerHTML = `<span class="dname">${WEEKDAY_NAMES[d.getDay()]}</span><span class="dnum">${d.getDate()}</span>`;

    if(isClosed){
      btn.title = 'Ruhetag – Café geschlossen';
      btn.disabled = true;
    } else if(isFuture){
      btn.title = 'Noch nicht verfügbar';
      btn.disabled = true;
    } else {
      btn.addEventListener('click', () => {
        selectedDate = d;
        renderAll();
      });
    }
    row.appendChild(btn);
  }
}

/* ===========================================================
   RENDER: grid of tiles
=========================================================== */
function renderGrid(){
  const grid = document.getElementById('grid');
  grid.innerHTML = '';
  sections.forEach(sec => {
    const c = sectionCounts(sec);
    const pct = c.total ? Math.round((c.done/c.total)*100) : 0;
    const tile = document.createElement('div');
    tile.className = 'tile' + (c.total && c.done === c.total ? ' complete' : '');
    tile.style.setProperty('--tile-color', sec.color);
    tile.tabIndex = 0;
    tile.innerHTML = `
      <div class="scoop"></div>
      <div class="tile-check">✓</div>
      <div class="tile-icon">${sec.icon}</div>
      <div class="tile-name">${sec.name}</div>
      <div class="tile-progress-text">${c.done} / ${c.total} erledigt</div>
      <div class="tile-bar"><div class="tile-bar-fill" style="width:${pct}%"></div></div>
    `;
    tile.addEventListener('click', () => openPanel(sec));
    tile.addEventListener('keydown', e => { if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); openPanel(sec); }});
    grid.appendChild(tile);
  });
}

/* ===========================================================
   RENDER: detail panel (modal)
=========================================================== */
const overlay = document.getElementById('overlay');
const panel = document.getElementById('panel');

function openPanel(sec){
  panel.style.setProperty('--tile-color', sec.color);
  const selOpts = { weekday:'short', day:'2-digit', month:'2-digit' };

  let html = `
    <div class="panel-head">
      <div>
        <div class="panel-title"><span class="dot"></span>${sec.icon} ${sec.name}</div>
        <div class="panel-sub">${selectedDate.toLocaleDateString('de-DE', selOpts)}</div>
      </div>
      <button class="close-btn" id="closeBtn" aria-label="Schließen">✕</button>
    </div>
  `;
  sec.groups.forEach((g, gi) => {
    html += `<div class="group">
      <div class="group-head">
        <div class="group-label">${g.label}</div>
        <div class="group-period">${FREQ_LABELS[g.freq]}</div>
      </div>`;
    g.tasks.forEach((t, ti) => {
      const done = isDone(sec.id, gi, ti, g.freq, selectedDate);
      html += `
        <div class="task ${done?'done':''}" data-gi="${gi}" data-ti="${ti}">
          <div class="checkbox">
            <svg viewBox="0 0 24 24" fill="none" stroke="#10191c" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M5 13l4 4L19 7"/>
            </svg>
          </div>
          <div class="task-text">${t}</div>
        </div>
      `;
    });
    html += `</div>`;
  });
  html += `
    <div class="panel-footer">
      <span class="tile-progress-text" id="panelCounter"></span>
      <button class="reset-link" id="resetBtn">Alle Häkchen dieser Karte zurücksetzen</button>
    </div>
  `;
  panel.innerHTML = html;
  updatePanelCounter(sec);

  panel.querySelectorAll('.task').forEach(el => {
    el.addEventListener('click', () => {
      const gi = +el.dataset.gi, ti = +el.dataset.ti;
      const g = sec.groups[gi];
      const nowDone = !isDone(sec.id, gi, ti, g.freq, selectedDate);
      setDone(sec.id, gi, ti, g.freq, selectedDate, nowDone);
      el.classList.toggle('done', nowDone);
      updatePanelCounter(sec);
      renderGrid();
      renderHeader();
    });
  });

  document.getElementById('closeBtn').addEventListener('click', closePanel);
  document.getElementById('resetBtn').addEventListener('click', () => {
    sec.groups.forEach((g, gi) => g.tasks.forEach((t, ti) => setDone(sec.id, gi, ti, g.freq, selectedDate, false)));
    openPanel(sec);
    renderGrid();
    renderHeader();
    showToast('Häkchen zurückgesetzt.');
  });

  overlay.classList.add('open');
}

function updatePanelCounter(sec){
  const c = sectionCounts(sec);
  const el = document.getElementById('panelCounter');
  if(el) el.textContent = c.done + ' / ' + c.total + ' erledigt';
}

function closePanel(){ overlay.classList.remove('open'); }
overlay.addEventListener('click', e => { if(e.target === overlay) closePanel(); });
document.addEventListener('keydown', e => { if(e.key === 'Escape') closePanel(); });

/* ===========================================================
   TOAST
=========================================================== */
function showToast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 2600);
}

/* ===========================================================
   EXPORT / IMPORT JSON
=========================================================== */
document.getElementById('exportJsonBtn').addEventListener('click', () => {
  const data = JSON.stringify(state, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'putzplan_eiscafe_nico_' + dateKey(TODAY) + '.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('Spielstand gespeichert.');
});

document.getElementById('importBtn').addEventListener('click', () => {
  document.getElementById('importInput').click();
});
document.getElementById('importInput').addEventListener('change', e => {
  const file = e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try{
      const imported = JSON.parse(reader.result);
      if(imported && imported.log){
        Object.keys(imported.log).forEach(period => {
          state.log[period] = Object.assign({}, state.log[period] || {}, imported.log[period]);
        });
        saveState();
        renderAll();
        showToast('Daten erfolgreich importiert.');
      } else {
        showToast('Diese Datei enthält keine gültigen Putzplan-Daten.');
      }
    } catch(err){
      showToast('Datei konnte nicht gelesen werden.');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
});

/* ===========================================================
   EXPORT PDF (Tagesbericht)
=========================================================== */
document.getElementById('exportPdfBtn').addEventListener('click', () => {
  const report = document.getElementById('pdf-report');
  const dateStr = selectedDate.toLocaleDateString('de-DE', { weekday:'long', day:'2-digit', month:'long', year:'numeric' });

  let html = `<h2>Putzplan – Tagesbericht</h2><div class="sub">Eiscafé Nico · ${dateStr}</div>`;
  sections.forEach(sec => {
    html += `<div class="sec"><h3>${sec.icon} ${sec.name}</h3>`;
    sec.groups.forEach((g, gi) => {
      html += `<div class="grp">${g.label} (${FREQ_LABELS[g.freq]})</div>`;
      g.tasks.forEach((t, ti) => {
        const done = isDone(sec.id, gi, ti, g.freq, selectedDate);
        html += `<div class="row"><span class="mark ${done?'yes':'no'}">${done?'✓':'✗'}</span><span>${t}</span></div>`;
      });
    });
    html += `</div>`;
  });
  report.innerHTML = html;

  html2pdf(report, {
    margin: 10,
    filename: 'putzplan_tagesbericht_' + dateKey(selectedDate) + '.pdf',
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  });
});

/* ===========================================================
   INIT
=========================================================== */
function renderAll(){
  renderHeader();
  renderDayRow();
  renderGrid();
}
renderAll();

if('serviceWorker' in navigator){
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
