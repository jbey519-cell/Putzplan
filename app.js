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
        'Waschbecken reinigen',
        'Boden wischen'
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
        'Unkraut ziehen',
        'Stühle abfegen'
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
   RENDER: "Erledigt für diesen Tag" Übersicht
=========================================================== */
function openSummaryPanel(){
  panel.style.setProperty('--tile-color', 'var(--c-kueche)');
  const selOpts = { weekday:'long', day:'2-digit', month:'long', year:'numeric' };

  let doneItems = [];
  let totalCount = 0, doneCount = 0;

  sections.forEach(sec => {
    sec.groups.forEach((g, gi) => {
      g.tasks.forEach((t, ti) => {
        totalCount++;
        if(isDone(sec.id, gi, ti, g.freq, selectedDate)){
          doneCount++;
          doneItems.push({ sec, t });
        }
      });
    });
  });

  let html = `
    <div class="panel-head">
      <div>
        <div class="panel-title"><span class="dot"></span>✅ Erledigt für diesen Tag</div>
        <div class="panel-sub">${selectedDate.toLocaleDateString('de-DE', selOpts)}</div>
      </div>
      <button class="close-btn" id="closeBtn" aria-label="Schließen">✕</button>
    </div>
  `;

  if(doneItems.length === 0){
    html += `<div class="group"><div class="task-text" style="padding:16px 4px;color:var(--text-muted);">Für diesen Tag wurde noch nichts erledigt.</div></div>`;
  } else {
    const bySec = {};
    doneItems.forEach(item => {
      if(!bySec[item.sec.id]) bySec[item.sec.id] = { sec:item.sec, tasks:[] };
      bySec[item.sec.id].tasks.push(item.t);
    });
    Object.values(bySec).forEach(group => {
      html += `<div class="group">
        <div class="group-head">
          <div class="group-label" style="color:${group.sec.color}">${group.sec.icon} ${group.sec.name}</div>
        </div>`;
      group.tasks.forEach(t => {
        html += `
          <div class="task done" style="cursor:default;">
            <div class="checkbox" style="background:${group.sec.color};border-color:${group.sec.color};">
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
  }

  html += `
    <div class="panel-footer">
      <span class="tile-progress-text">${doneCount} / ${totalCount} erledigt</span>
    </div>
  `;
  panel.innerHTML = html;
  document.getElementById('closeBtn').addEventListener('click', closePanel);
  overlay.classList.add('open');
}

document.getElementById('overallCard').addEventListener('click', openSummaryPanel);
document.getElementById('overallCard').addEventListener('keydown', e => {
  if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); openSummaryPanel(); }
});

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
  const generatedStr = TODAY.toLocaleDateString('de-DE', { day:'2-digit', month:'2-digit', year:'numeric' }) + ', ' +
    TODAY.toLocaleTimeString('de-DE', { hour:'2-digit', minute:'2-digit' });

  let totalAll = 0, doneAll = 0;
  sections.forEach(sec => {
    const c = sectionCounts(sec);
    totalAll += c.total;
    doneAll += c.done;
  });

  let html = `
    <div class="rep-head">
      <div class="rep-title">🍦 Putzplan – Tagesbericht</div>
      <div class="rep-sub">Eiscafé Nico</div>
    </div>
    <div class="rep-meta">
      <div><span class="rep-meta-label">Datum:</span> ${dateStr}</div>
      <div><span class="rep-meta-label">Erstellt am:</span> ${generatedStr}</div>
      <div><span class="rep-meta-label">Gesamt:</span> ${doneAll} / ${totalAll} Aufgaben erledigt</div>
    </div>
  `;

  sections.forEach(sec => {
    const c = sectionCounts(sec);
    html += `
      <div class="rep-sec">
        <div class="rep-sec-head" style="border-color:${secColorHex(sec.color)}">
          <span class="rep-sec-icon">${sec.icon}</span>
          <span class="rep-sec-name">${sec.name}</span>
          <span class="rep-sec-count">${c.done} / ${c.total}</span>
        </div>
    `;
    sec.groups.forEach((g, gi) => {
      html += `<div class="rep-grp">${g.label} · ${FREQ_LABELS[g.freq]}</div>`;
      g.tasks.forEach((t, ti) => {
        const done = isDone(sec.id, gi, ti, g.freq, selectedDate);
        html += `<div class="rep-row ${done?'rep-done':'rep-open'}">
          <span class="rep-mark">${done?'✓':'○'}</span>
          <span class="rep-text">${t}</span>
        </div>`;
      });
    });
    html += `</div>`;
  });

  report.innerHTML = html;

  // html2canvas hat Probleme, Elemente zu erfassen, die per
  // "position:fixed; left:-9999px" außerhalb des Bildschirms liegen
  // (das Ergebnis ist dann eine leere/weiße PDF-Seite). Wir verschieben
  // das Report-Element daher nur in der GEKLONTEN Version (onclone) an
  // eine normale Position, sodass es korrekt gerendert wird – im
  // sichtbaren Dokument bleibt es weiterhin ausgeblendet.
  showToast('PDF wird erstellt …');

  html2pdf(report, {
    margin: 10,
    filename: 'putzplan_tagesbericht_' + dateKey(selectedDate) + '.pdf',
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      onclone: (clonedDoc) => {
        const el = clonedDoc.getElementById('pdf-report');
        if(el){
          el.style.position = 'static';
          el.style.left = '0';
          el.style.top = '0';
          el.style.display = 'block';
          el.style.visibility = 'visible';
        }
      }
    },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  }).then(() => {
    showToast('PDF wurde erstellt.');
  }).catch(err => {
    console.error('PDF-Fehler:', err);
    showToast('PDF konnte nicht erstellt werden.');
  });
});

/* Resolve a var(--c-xxx) reference to a hex color for the PDF (html2canvas can be picky with CSS vars) */
function secColorHex(varRef){
  const map = {
    'var(--c-kueche)':   '#8fd9b6',
    'var(--c-gastraum)': '#f4a988',
    'var(--c-gasteklo)': '#7ec8e3',
    'var(--c-personal)': '#cdb6e8',
    'var(--c-draussen)': '#e8b86d',
    'var(--c-sonstiges)':'#f5a3c0'
  };
  return map[varRef] || '#999999';
}

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

/* ===========================================================
   PWA INSTALL: Toolbar-Button + schwebendes Banner
=========================================================== */
const INSTALL_DISMISS_KEY = 'putzplan-install-dismissed';
const DISMISS_DAYS = 14; // nach "Später" erst nach X Tagen wieder zeigen

let deferredInstallPrompt = null;
const installBtn = document.getElementById('installBtn');
const installBanner = document.getElementById('installBanner');
const installBannerBtn = document.getElementById('installBannerBtn');
const installBannerDismiss = document.getElementById('installBannerDismiss');
const installBannerText = document.getElementById('installBannerText');

function isStandalone(){
  return window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true; // iOS
}
function isIOS(){
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent)
    || (window.navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}
function wasRecentlyDismissed(){
  const ts = localStorage.getItem(INSTALL_DISMISS_KEY);
  if(!ts) return false;
  const days = (Date.now() - Number(ts)) / (1000*60*60*24);
  return days < DISMISS_DAYS;
}
function hideInstallBanner(){
  installBanner.classList.remove('show');
}
function dismissInstallBanner(){
  localStorage.setItem(INSTALL_DISMISS_KEY, String(Date.now()));
  hideInstallBanner();
}
function showInstallBanner(){
  if(isStandalone() || wasRecentlyDismissed()) return;
  installBanner.classList.add('show');
}

// Android / Chrome / Edge: native Installations-Prompt
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredInstallPrompt = e;
  installBtn.classList.add('show');
  installBannerText.textContent = 'Putzplan auf den Startbildschirm legen – schneller Zugriff, läuft offline.';
  installBannerBtn.textContent = 'Installieren';
  showInstallBanner();
});

async function triggerInstall(){
  if(!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  const { outcome } = await deferredInstallPrompt.userChoice;
  if(outcome === 'accepted') showToast('App wird installiert …');
  deferredInstallPrompt = null;
  installBtn.classList.remove('show');
  hideInstallBanner();
}

installBtn.addEventListener('click', triggerInstall);

installBannerBtn.addEventListener('click', () => {
  if(deferredInstallPrompt){
    triggerInstall();
  } else if(isIOS()){
    showToast('Tippe unten auf "Teilen" und dann auf "Zum Home-Bildschirm"');
  } else {
    hideInstallBanner();
  }
});

installBannerDismiss.addEventListener('click', dismissInstallBanner);

window.addEventListener('appinstalled', () => {
  installBtn.classList.remove('show');
  deferredInstallPrompt = null;
  hideInstallBanner();
  showToast('App wurde installiert.');
});

// Beim ersten Laden prüfen: schon installiert? iOS? oder einfach abwarten,
// ob "beforeinstallprompt" feuert (Android/Chrome).
window.addEventListener('load', () => {
  if(isStandalone()) return;

  if(isIOS()){
    // iOS feuert "beforeinstallprompt" nie – eigene Anleitung zeigen
    installBannerText.textContent = 'Für die App-Installation: Tippe unten in Safari auf das Teilen-Symbol und wähle "Zum Home-Bildschirm".';
    installBannerBtn.textContent = 'Verstanden';
    setTimeout(showInstallBanner, 1200);
  } else {
    // Android/Chrome: kurz warten, ob beforeinstallprompt feuert
    setTimeout(() => {
      if(deferredInstallPrompt) showInstallBanner();
    }, 1500);
  }
});
