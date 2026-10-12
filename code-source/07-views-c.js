
/* =====================================================================
   Étape 6 – Informations manquantes et compléments d'enquête
   ===================================================================== */
VIEWS.gaps = () => {
  const { active, dismissed } = computeGaps();
  const c = confidence(active);
  const comps = S.a.complements;
  const group = p => active.filter(g => g.prio === p);
  const card = g => {
    const answered = comps.filter(x => x.gapKey === g.key);
    return `<article class="gap ${g.prio}"><div class="row"><span class="prio ${g.prio}">${esc(g.prio)}</span><b style="flex:1;min-width:200px">${esc(g.concerne)}</b></div>
    <dl><dt>Pourquoi c'est utile</dt><dd>${esc(g.pourquoi)}</dd><dt>Question à poser</dt><dd><b>${esc(g.question)}</b></dd><dt>Exemples de preuves</dt><dd>${esc(g.preuve)}</dd><dt>Impact sur la confiance</dt><dd>${esc(g.impact)}</dd></dl>
    ${g.list ? `<ul class="small">${g.list.map(id => `<li>${esc(trunc(factById(id)?.text, 100))}</li>`).join('')}</ul>` : ''}
    ${answered.length ? `<div class="note ok small">${icon('check')}<div><b>Réponse(s) déjà enregistrée(s) :</b><ul>${answered.map(x => `<li>${esc(x.answer)} <span class="muted">(${esc(SOURCES[x.source.type] || '')}${x.source.detail ? ' – ' + esc(x.source.detail) : ''}, ${esc(fmtDT(x.date))})</span></li>`).join('')}</ul>Le point reste affiché tant que les faits ou liens concernés n'ont pas été mis à jour.</div></div>` : ''}
    <div class="row">${g.action ? `<button class="btn sm primary" data-act="gapAction" data-key="${esc(g.key)}">${esc(g.action.label)}</button>` : ''}<button class="btn sm" data-act="answerGap" data-key="${esc(g.key)}">${icon('edit')}Enregistrer une réponse</button><button class="btn sm ghost" data-act="dismissGap" data-key="${esc(g.key)}">Écarter (sans objet)</button></div></article>`;
  };
  return `<h1>6. Informations manquantes et compléments d'enquête</h1>
  <p class="lead">Voici ce qui reste à recueillir ou à vérifier, du plus important au moins important. Répondez directement ici : chaque réponse est enregistrée avec sa provenance.</p>
  <section class="card"><div class="conf c${c.lvl}"><div class="meter" aria-hidden="true"><i></i><i></i><i></i></div><div><b>${esc(c.label)}</b><br><span class="small muted">${esc(c.txt)} Indicateur calculé à partir des contrôles automatiques : il ne remplace pas le jugement du groupe d'analyse.</span></div></div></section>
  ${active.length ? '' : `<div class="note ok">${icon('check')}<div>Aucun point en attente détecté par les contrôles automatiques.</div></div>`}
  ${['haute', 'moyenne', 'faible'].map(p => group(p).length ? `<h2 style="margin-top:18px">Priorité ${p} <span class="pill">${group(p).length}</span></h2>${group(p).map(card).join('')}` : '').join('')}
  ${dismissed.length ? `<section class="card" style="margin-top:18px"><h2>Points écartés par le groupe</h2><ul class="facts">${dismissed.map(g => `<li class="fact"><div class="ftxt small"><b>${esc(g.concerne)}</b><div class="muted">Motif : ${esc(S.a.gapsDismissed[g.key].reason)} (${esc(fmtDT(S.a.gapsDismissed[g.key].date))})</div></div><button class="btn sm" data-act="undismissGap" data-key="${esc(g.key)}">Rétablir</button></li>`).join('')}</ul></section>` : ''}
  <section class="card" style="margin-top:18px"><h2>${icon('list')}Réponses complémentaires enregistrées <span class="pill">${comps.length}</span></h2>
  ${comps.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Date</th><th>Question</th><th>Réponse</th><th>Source</th><th>Fait créé</th></tr></thead><tbody>${comps.slice().reverse().map(x => `<tr><td>${esc(fmtDT(x.date))}</td><td>${esc(x.question)}</td><td>${esc(x.answer)}</td><td>${esc(SOURCES[x.source.type] || '')}${x.source.detail ? ' – ' + esc(x.source.detail) : ''}</td><td>${x.factId && factById(x.factId) ? factBadge(factById(x.factId)) : '—'}</td></tr>`).join('')}</tbody></table></div>` : '<p class="small muted">Aucune réponse pour le moment.</p>'}</section>`;
};
async function answerGap(key) {
  const g = computeGaps().active.find(x => x.key === key); if (!g) return;
  const res = await modal({
    title: 'Enregistrer une réponse', wide: true,
    body: `<p class="small muted">${esc(g.concerne)}</p><p><b>${esc(g.question)}</b></p>
    <div class="field"><label for="ag-a">Réponse apportée par l'entreprise <span class="muted">(obligatoire)</span></label><textarea id="ag-a" rows="3"></textarea><div class="err" id="ag-e" role="alert" hidden>Saisissez la réponse.</div></div>
    <div class="grid g2" style="margin-top:8px"><div class="field"><label for="ag-s">Source</label><select id="ag-s">${opts(SOURCES, 'apreciser')}</select></div><div class="field"><label for="ag-d">Précision</label><input type="text" id="ag-d" placeholder="Fonction, document…"></div></div>
    <label class="check" style="margin-top:10px"><input type="checkbox" id="ag-f" checked> <span>Enregistrer aussi cette réponse comme un <b>nouveau fait</b> (vous pourrez le reformuler et choisir son statut)</span></label>
    ${g.ref ? `<label class="check"><input type="checkbox" id="ag-u" checked> <span>Ouvrir ensuite le fait concerné pour mettre à jour son statut ou sa formulation (l'ancienne version sera conservée)</span></label>` : ''}`,
    buttons: [{ label: 'Annuler', value: 'cancel' }, { label: 'Enregistrer', value: 'ok', cls: 'primary' }],
    onAction: (v, d) => {
      if (v !== 'ok') return; const t = d.querySelector('#ag-a').value.trim();
      if (!t) { d.querySelector('#ag-e').hidden = false; return false; }
      return { t, s: { type: d.querySelector('#ag-s').value, detail: d.querySelector('#ag-d').value.trim() }, mk: d.querySelector('#ag-f').checked, up: !!d.querySelector('#ag-u')?.checked };
    }
  });
  if (!res || typeof res !== 'object') return;
  const before = computeGaps().active.length;
  const cp = { id: uid('cp'), gapKey: key, concerne: g.concerne, question: g.question, answer: res.t, source: res.s, date: nowISO(), factId: null };
  S.a.complements.push(cp); log('complement', `Complément d'enquête : « ${trunc(g.question, 70)} » → « ${trunc(res.t, 80)} »`); changed();
  if (res.mk) { const id = await factEditor(null, { text: res.t, source: res.s, origin: { type: 'complement', ref: cp.id } }, { why: 'complément d\'enquête', intro: `Réponse à : « ${esc(g.question)} »` }); if (id) { cp.factId = id; changed(); } }
  if (res.up && g.ref && factById(g.ref)) await factEditor(g.ref, {}, { intro: `Nouvelle information : « ${esc(res.t)} ». Mettez à jour ce fait si nécessaire.` });
  const after = computeGaps().active.length;
  render(); toast(`Complément enregistré. Analyse actualisée : ${after} point(s) restant(s) (avant : ${before}).`, 'ok', 6000);
}
async function gapAction(key) {
  const g = computeGaps().active.find(x => x.key === key); if (!g || !g.action) return;
  const ac = g.action;
  if (ac.type === 'goto') return go(ac.step);
  if (ac.type === 'ante') { go(5); return linkWizard({ to: ac.id }); }
  if (ac.type === 'edit') { const r = await factEditor(ac.id); if (r) render(); return; }
  if (ac.type === 'resolve') return resolveContradiction(ac.id);
  if (ac.type === 'link') { S.sel = { type: 'link', id: ac.id }; return go(5); }
  if (ac.type === 'collect') { S.collectTab = 'chrono'; go(2); setTimeout(() => { const t = $('#qa-' + ac.q); if (t) { t.scrollIntoView({ block: 'center' }); t.focus(); } }, 50); return; }
  if (ac.type === 'collectTab') { S.collectTab = ac.tab; return go(2); }
}

/* =====================================================================
   Étape 7 – Historique et versions
   ===================================================================== */
const JTYPES = { analyse: 'Analyse', fait: 'Fait', lien: 'Lien', arbre: 'Arbre', contradiction: 'Contradiction', piece: 'Pièce jointe', complement: 'Complément', version: 'Version', export: 'Export', '5pourquoi': '5 pourquoi', prevention: 'Prévention' };
VIEWS.hist = () => {
  const a = S.a; const jf = S.jFilter || '';
  const J = a.journal.filter(j => !jf || j.type === jf).slice().reverse();
  const delF = a.facts.filter(f => f.deleted), delL = a.links.filter(l => l.deleted);
  return `<h1>7. Historique et versions</h1>
  <p class="lead">Aucune information n'est remplacée sans trace : chaque modification importante est journalisée et vous pouvez enregistrer des versions de l'analyse.</p>
  <section class="card"><div class="card-head"><h2>${icon('save')}Versions de l'analyse <span class="pill">${a.versions.length}</span></h2><button class="btn primary" data-act="newVersion">${icon('plus')}Enregistrer une version maintenant</button></div>
  ${a.versions.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>N°</th><th>Date</th><th>Libellé</th><th>Arbre</th><th>Faits</th><th></th></tr></thead><tbody>${a.versions.slice().reverse().map(v => `<tr><td><b>v${v.n}</b></td><td>${esc(fmtDT(v.date))}</td><td>${esc(v.label)}${v.comment ? `<br><span class="small muted">${esc(v.comment)}</span>` : ''}</td><td>${v.treeStatus === 'valide' ? '<span class="tag ok">validé</span>' : '<span class="tag warn">provisoire</span>'}</td><td>${v.snapshot.facts.filter(f => !f.deleted).length}</td><td><div class="row" style="gap:4px"><button class="btn sm" data-act="viewVersion" data-n="${v.n}">Consulter</button><button class="btn sm" data-act="restoreVersion" data-n="${v.n}">Restaurer</button></div></td></tr>`).join('')}</tbody></table></div>` : '<p class="small muted">Aucune version enregistrée. Une version est créée automatiquement à chaque validation de l\'arbre.</p>'}
  <p class="xs muted">Les versions conservent les données et les descriptions des pièces jointes, mais pas une seconde copie des photos et documents (pour limiter la taille).</p></section>
  <section class="card"><h2>${icon('trash')}Éléments retirés <span class="pill">${delF.length + delL.length}</span></h2>
  ${delF.length ? `<h4>Faits</h4><ul class="facts">${delF.map(f => factItem(f)).join('')}</ul>` : ''}
  ${delL.length ? `<h4>Liens</h4><ul class="small">${delL.map(l => `<li>« ${esc(trunc(factById(l.from)?.text, 60))} » → « ${esc(trunc(factById(l.to)?.text, 60))} » <span class="muted">(retiré le ${esc(fmtDT(l.deletedAt))})</span></li>`).join('')}</ul>` : ''}
  ${!delF.length && !delL.length ? '<p class="small muted">Aucun élément retiré.</p>' : ''}</section>
  <section class="card"><div class="card-head"><h2>${icon('clock')}Journal des modifications <span class="pill">${a.journal.length}</span></h2>
  <div><label class="sr-only" for="jf">Filtrer le journal</label><select id="jf" data-jfilter><option value="">Tous les types</option>${opts(JTYPES, jf)}</select></div></div>
  <div class="tbl-wrap" style="max-height:520px;overflow:auto"><table class="tbl"><thead><tr><th style="width:150px">Date</th><th style="width:120px">Type</th><th>Description</th></tr></thead><tbody>${J.map(j => `<tr><td>${esc(fmtDT(j.date))}</td><td>${esc(JTYPES[j.type] || j.type)}</td><td>${esc(j.text)}</td></tr>`).join('')}</tbody></table></div></section>`;
};
async function factHistory(id) {
  const f = factById(id);
  const fmtV = (k, v) => { if (v == null || v === '') return '∅'; if (k === 'status') return STATUS[v]?.short || v; if (k === 'kind') return KINDS[v]?.short || v; if (k === 'family') return FAMILIES[v]?.label || v; if (k === 'chrono.phase') return PHASES[v]?.label || v; if (k === 'source.type') return SOURCES[v] || v; if (k === 'certainty') return CERTAINTY[v] || v; if (typeof v === 'boolean') return v ? 'oui' : 'non'; return String(v); };
  await modal({
    title: 'Historique du fait', wide: true,
    body: `<p><b>${esc(f.text)}</b></p><p class="small muted">Créé le ${esc(fmtDT(f.createdAt))} – ${esc(originTxt(f))}</p>
    ${f.history.length ? `<ol class="hist">${f.history.map(h => `<li><b>${esc(fmtDT(h.date))}</b>${h.reason ? ' – motif : ' + esc(h.reason) : ''}<ul>${(h.changes || []).map(c => `<li>${esc(TRACKED[c.field] || c.field)} : <s>${esc(fmtV(c.field, c.old))}</s> → <b>${esc(fmtV(c.field, c.new))}</b></li>`).join('')}</ul></li>`).join('')}</ol>` : '<p class="muted">Aucune modification.</p>'}`
  });
}
async function viewVersion(n) {
  const v = S.a.versions.find(x => x.n === Number(n)); if (!v) return;
  const s = normalize(clone(v.snapshot));
  const svg = treeSVGString(s, 'travail', s.tree.orient).replace(/^<\?xml[^>]*>\s*/, '');
  const F = s.facts.filter(f => !f.deleted);
  await modal({
    title: `Version ${v.n} – ${v.label}`, wide: true,
    body: `<p class="small">Enregistrée le ${esc(fmtDT(v.date))} · arbre ${v.treeStatus === 'valide' ? 'validé' : 'provisoire'} · ${F.length} fait(s) · ${activeLinks(s).length} lien(s)${v.comment ? '<br>' + esc(v.comment) : ''}</p>
    <div style="overflow:auto;border:1px solid var(--line);border-radius:8px;max-height:50vh">${svg}</div>
    <h3 style="margin-top:12px">Faits de cette version</h3><ul class="small">${F.map(f => `<li>${esc(f.text)} – ${esc(STATUS[effStatus(f, s)].short)}</li>`).join('')}</ul>`
  });
}
async function restoreVersion(n) {
  const v = S.a.versions.find(x => x.n === Number(n)); if (!v) return;
  if (!await confirmBox(`Restaurer la version ${v.n} (« ${esc(v.label)} ») ?<br><br>L'état actuel sera d'abord enregistré comme nouvelle version : rien ne sera perdu.`, { ok: 'Restaurer' })) return;
  const curN = createVersion(`État avant restauration de la v${v.n}`, '', 'restauration');
  const cur = S.a; const snap = normalize(clone(v.snapshot));
  snap.versions = cur.versions; snap.journal = cur.journal; snap.id = cur.id;
  snap.attachments = snap.attachments.map(x => { const c = cur.attachments.find(y => y.id === x.id); if (c) x.dataUrl = c.dataUrl; else x.missing = true; return x; }).filter(x => x.dataUrl || x.kind === 'document');
  cur.attachments.filter(x => !snap.attachments.some(y => y.id === x.id)).forEach(x => snap.attachments.push(x));
  S.a = snap;
  if (snap.tree.status === 'valide') { /* conservé tel qu'à la version */ }
  log('version', `Version ${v.n} restaurée (état précédent conservé en v${curN})`); changed();
  toast(`Version ${v.n} restaurée. L'état précédent est conservé en version ${curN}.`, 'ok'); render();
}

/* =====================================================================
   Étape 8 – Prévention et dossier
   ===================================================================== */
VIEWS.final = () => {
  const a = S.a; const ret = graphModel(a, 'retenu');
  let ids = [...ret.nodeIds]; const fromWork = !ids.length;
  if (fromWork) ids = [...graphModel(a, 'travail').nodeIds];
  ids.sort((x, y) => (x === ret.root) - (y === ret.root));
  return `<h1>8. Pistes de prévention et dossier d'analyse</h1>
  <div class="note info">${icon('info')}<div>Les pistes de prévention sont <b>à examiner par le groupe d'analyse</b> ; elles ne sont pas des décisions automatiques. Selon la brochure INRS, le choix des mesures relève de la direction, à l'aide de critères. Pour chaque fait de l'arbre, recherchez les moyens de le supprimer, <b>quelle que soit sa position</b> ; aucune proposition n'est rejetée a priori. Privilégiez les mesures en amont et les protections collectives, plutôt que les seuls EPI et consignes.</div></div>
  ${fromWork ? `<div class="note warn">${icon('alert')}<div>L'arbre retenu est vide : les faits ci-dessous proviennent de l'arbre de travail et ne sont pas tous établis.</div></div>` : ''}
  <section class="card"><h2>${icon('bulb')}Pistes de prévention à examiner</h2>
  ${ids.length ? ids.map(id => prevBlock(factById(id))).join('') : '<p class="muted">Construisez d\'abord l\'arbre des causes.</p>'}</section>
  <section class="card"><h2>${icon('alert')}Limites de l'analyse</h2>${bindField('limites', "Limites identifiées par le groupe (informations non obtenues, personnes non interrogées…)", { area: true, rows: 3 })}</section>
  <section class="card"><h2>${icon('file')}Dossier d'analyse</h2>
    <p class="small">Le dossier reprend : A. synthèse de l'accident – B. arbre des causes (version, date, statut) – C. traçabilité (faits, sources, statuts, pièces, liens) – D. points restant à examiner – E. pistes de prévention.</p>
    <label class="check small"><input type="checkbox" id="dos-photos" checked> Inclure les photographies dans le dossier</label>
    <div class="row" style="margin-top:10px">
      <button class="btn primary" data-act="dossierPreview">${icon('file')}Aperçu</button>
      <button class="btn" data-act="dossierPrint">${icon('print')}Imprimer / enregistrer en PDF</button>
      <button class="btn" data-act="dossierDownload">${icon('download')}Télécharger le dossier (.html)</button>
      <button class="btn" data-act="exportJSON">${icon('save')}Sauvegarde complète (.json)</button>
    </div>
    <p class="xs muted">PDF : utilisez « Imprimer » puis choisissez « Enregistrer au format PDF » dans la fenêtre d'impression du navigateur. Le dossier correspond exactement à l'état affiché au moment de l'export.</p>
    ${a.tree.status !== 'valide' ? `<div class="note warn">${icon('alert')}<div>L'arbre n'est pas validé : le dossier portera la mention « provisoire ».</div></div>` : ''}
  </section>`;
};
function prevBlock(f) {
  const P = S.a.prevention.filter(p => p.factId === f.id);
  return `<div class="qcard"><div class="row"><b style="flex:1;min-width:220px">${esc(f.text)}</b>${factBadge(f)} ${kindTag(f.kind)}</div>
  ${P.map(p => `<div class="doc-row">
    <div class="field"><label for="pv-${p.id}" class="small">Piste de prévention envisagée</label><textarea id="pv-${p.id}" rows="2" data-prev="${p.id}" data-k="text" placeholder="Comment supprimer ce fait ?">${esc(p.text)}</textarea></div>
    <div class="grid g3" style="margin-top:8px">
      <div class="field"><label for="pl-${p.id}" class="small">Niveau d'action</label><select id="pl-${p.id}" data-prev="${p.id}" data-k="level"><option value="">À préciser</option>${opts(LEVELS, p.level)}</select></div>
      <div class="field"><label for="pf-${p.id}" class="small">Facteur potentiel d'accident (FPA)</label><input type="text" id="pf-${p.id}" data-prev="${p.id}" data-k="fpa" value="${esc(p.fpa)}" placeholder="Ex. : tâche inhabituelle, récupération d'incident"></div>
      <div class="field"><label for="ps-${p.id}" class="small">Suite</label><select id="ps-${p.id}" data-prev="${p.id}" data-k="status">${opts({ 'a-examiner': 'À examiner', retenue: 'Retenue par la direction', ecartee: 'Écartée' }, p.status)}</select></div>
    </div>
    <details style="margin-top:8px"><summary class="small">Critères de choix (INRS)</summary><div class="grid g2" style="margin-top:6px">${CRITERIA.map(c => `<div class="field"><label for="pc-${p.id}-${c.id}" class="small" style="font-weight:400">${esc(c.q)}</label><select id="pc-${p.id}-${c.id}" data-prev="${p.id}" data-k="criteria.${c.id}"><option value="">À examiner</option><option value="oui" ${p.criteria[c.id] === 'oui' ? 'selected' : ''}>Oui</option><option value="non" ${p.criteria[c.id] === 'non' ? 'selected' : ''}>Non</option></select></div>`).join('')}</div>
    <div class="field" style="margin-top:6px"><label for="po-${p.id}" class="small">Pilote proposé pour la mise en œuvre (fonction)</label><input type="text" id="po-${p.id}" data-prev="${p.id}" data-k="owner" value="${esc(p.owner)}" placeholder="Décidé par la direction"></div></details>
    ${p.level === 'reaction' ? `<p class="xs" style="color:var(--warn)">EPI et consignes : utiles à court terme, ils ne dispensent pas de rechercher des mesures plus durables et de plus grande portée.</p>` : ''}
    <div class="row end"><button class="btn sm danger" data-act="delPrev" data-id="${p.id}">${icon('trash')}Retirer cette piste</button></div></div>`).join('')}
  <button class="btn sm" data-act="addPrev" data-id="${f.id}">${icon('plus')}Proposer une piste pour ce fait</button></div>`;
}

/* ---------------- Dossier imprimable ---------------- */
function buildDossier(a, { photos = true } = {}) {
  const F = a.facts.filter(f => !f.deleted);
  const ret = graphModel(a, 'retenu'), work = graphModel(a, 'travail');
  const svgRet = treeSVGString(a, 'retenu', a.tree.orient).replace(/^<\?xml[^>]*>\s*/, '');
  const svgWork = treeSVGString(a, 'travail', a.tree.orient).replace(/^<\?xml[^>]*>\s*/, '');
  const gaps = computeGaps(a);
  const num = new Map(); F.forEach((f, i) => num.set(f.id, i + 1));
  const n = id => 'F' + (num.get(id) || '?');
  const byPh = F.slice().filter(f => f.chrono.phase).sort((x, y) => (PHASES[x.chrono.phase].rank - PHASES[y.chrono.phase].rank) || ((x.chrono.order ?? 999) - (y.chrono.order ?? 999)));
  const st = f => STATUS[effStatus(f, a)].short;
  const valid = a.tree.status === 'valide';
  const kindsOf = l => { const k = []; if (activeLinks(a).filter(x => x.to === l.to).length > 1) k.push('conjonction'); if (activeLinks(a).filter(x => x.from === l.from).length > 1) k.push('disjonction'); return k.length ? k.join(' + ') : 'enchaînement'; };
  const rows = (arr, cols) => arr.length ? `<table><thead><tr>${cols.map(c => `<th>${esc(c[0])}</th>`).join('')}</tr></thead><tbody>${arr.map(x => `<tr>${cols.map(c => `<td>${c[1](x)}</td>`).join('')}</tr>`).join('')}</tbody></table>` : '<p class="m">Aucun élément.</p>';
  const ext = a.external?.data;
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Dossier d'analyse – ${esc(titleOf(a))}</title>
<style>body{font-family:'Segoe UI',Arial,sans-serif;color:#18202E;max-width:1100px;margin:0 auto;padding:24px;font-size:13.5px;line-height:1.45;background:#fff}
h1{color:#143F7A;font-size:22px;margin:0 0 4px}h2{color:#143F7A;border-bottom:2px solid #1D58A6;padding-bottom:4px;margin-top:28px;font-size:18px;break-after:avoid}h3{font-size:15px;margin:16px 0 6px}
table{border-collapse:collapse;width:100%;margin:6px 0 12px;font-size:12px}th,td{border:1px solid #C9D2DE;padding:5px 6px;text-align:left;vertical-align:top}th{background:#EEF3FA}
.m{color:#556072}.ban{padding:10px 14px;border-radius:8px;margin:10px 0;border:1px solid}.w{background:#FFF3D1;border-color:#EED38C}.i{background:#E7EFFA;border-color:#BCD0EE}.r{background:#FDE7E5;border-color:#F1B5AE}
.svg{overflow:auto;border:1px solid #C9D2DE;border-radius:6px;margin:8px 0}.svg svg{max-width:100%;height:auto}
.ph{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px}.ph figure{margin:0;border:1px solid #C9D2DE;border-radius:6px;padding:6px;break-inside:avoid}.ph img{width:100%;max-height:300px;object-fit:contain}
dl{display:grid;grid-template-columns:220px 1fr;gap:3px 10px}dt{font-weight:600;color:#556072}dd{margin:0}
@media print{body{padding:0}h2{break-before:auto}.svg{border:0}tr{break-inside:avoid}.np{display:none}}
</style></head><body>
<div class="np" style="text-align:right"><button onclick="window.print()" style="padding:8px 14px;font-size:14px">Imprimer / PDF</button></div>
<h1>Dossier d'analyse d'accident du travail – méthode de l'arbre des causes</h1>
<p class="m">${esc(titleOf(a))} · Dossier généré le ${esc(fmtDT(nowISO()))} · Arbre : <b>${esc(treeStatusLine(a))}</b></p>
${a.fictif ? '<div class="ban r"><b>CAS FICTIF</b> – données inventées à des fins de démonstration et de test. Ne constitue pas une analyse réelle.</div>' : ''}
${!valid ? '<div class="ban w"><b>Analyse provisoire</b> : l\'arbre des causes n\'a pas été validé par le groupe d\'analyse.</div>' : ''}
<div class="ban i">Cette analyse vise à comprendre l'accident pour en éviter la répétition. Elle ne recherche pas de responsabilité et ne conclut à aucune faute individuelle. Elle repose exclusivement sur les informations fournies par l'entreprise.</div>

<h2>A. Synthèse de l'accident</h2>
<h3>Contexte</h3><dl>
<dt>Entreprise</dt><dd>${esc(a.company.raisonSociale || '—')}${a.company.siret ? ' (SIRET ' + esc(a.company.siret) + ')' : ''}</dd>
<dt>Établissement</dt><dd>${esc(a.company.etablissement || '—')}</dd><dt>Secteur / activité</dt><dd>${esc(a.company.secteur || '—')}</dd>
<dt>Date, heure</dt><dd>${esc([fmtD(a.accident.date), a.accident.heure].filter(Boolean).join(' à ') || '—')}</dd><dt>Lieu</dt><dd>${esc(a.accident.lieu || '—')}</dd>
<dt>Poste de la victime</dt><dd>${esc(a.accident.poste || '—')}</dd><dt>Tâche réalisée</dt><dd>${esc(a.accident.tache || '—')}</dd><dt>Dommage</dt><dd>${esc(a.accident.dommage || '—')}</dd></dl>
${ext ? `<p class="m">Contexte public (source externe, non utilisée comme fait) : ${esc(ext.nom)}, NAF ${esc(ext.naf || '—')}${ext.section ? ' – ' + esc(NAF_SECTIONS[ext.section] || '') : ''}. Source : ${esc(a.external.source)}, consultée le ${esc(fmtDT(a.external.date))} – ${esc(a.external.fiche)}</p>` : ''}
${a.accident.description ? `<h3>Récit initial (tel que saisi)</h3><p style="white-space:pre-wrap">${esc(a.accident.description)}</p>` : ''}
<h3>Chronologie</h3>${rows(byPh, [['Phase', f => esc(PHASES[f.chrono.phase].label)], ['N°', f => esc(f.chrono.order ?? '')], ['Moment', f => esc(f.chrono.moment || '')], ['Fait', f => `<b>${n(f.id)}</b> ${esc(f.text)}`], ['Statut', f => esc(st(f))]])}
<h3>Faits retenus dans l'arbre</h3>${rows([...ret.nodeIds].map(id => factById(id, a)), [['Réf.', f => n(f.id)], ['Fait', f => esc(f.text)], ['Type', f => esc(KINDS[f.kind].short)], ['Statut', f => esc(st(f))]])}
${Object.keys(a.notes || {}).filter(k => a.notes[k]).length ? `<h3>Corrections et compléments apportés à la synthèse</h3><ul>${Object.entries(a.notes).filter(([k, v]) => v).map(([k, v]) => `<li>${esc(v)}</li>`).join('')}</ul>` : ''}

<h2>B. Arbre des causes</h2>
<p>Version : <b>${esc(treeStatusLine(a))}</b>. Lecture : du dommage vers les faits antécédents ; rectangle = état (fait habituel), cercle = variation (fait inhabituel), « ET » = conjonction ou disjonction, pointillé = part d'incertitude, « ? » = nécessité à confirmer.</p>
<h3>Arbre retenu (faits établis reliés au dommage)</h3><div class="svg">${svgRet}</div>
${work.nodeIds.size !== ret.nodeIds.size || work.links.length !== ret.links.length ? `<h3>Arbre de travail (inclut des éléments non établis, signalés)</h3><div class="svg">${svgWork}</div>` : ''}

<h2>C. Traçabilité</h2>
<h3>Liste des faits</h3>${rows(F, [['Réf.', f => n(f.id)], ['Fait', f => esc(f.text)], ['Statut', f => esc(st(f)) + (f.evidence ? '<br><span class="m">Élément probant : ' + esc(f.evidence) + '</span>' : '')], ['Type', f => esc(KINDS[f.kind].short)], ['Famille', f => esc(FAMILIES[f.family]?.label || '')], ['Source', f => esc(srcTxt(f)) + '<br><span class="m">' + esc(CERTAINTY[f.certainty]) + '</span>'], ['Provenance', f => esc(originTxtA(f, a))], ['Pièces', f => esc(a.attachments.filter(x => x.factIds.includes(f.id)).map(x => x.caption || x.name).join(', '))], ['Arbre retenu', f => ret.nodeIds.has(f.id) ? 'oui' : (work.nodeIds.has(f.id) ? 'travail seulement' : 'non')], ['Modif.', f => f.history.length]])}
<h3>Relations logiques</h3>${rows(activeLinks(a), [['Antécédent', l => n(l.from) + ' ' + esc(trunc(factById(l.from, a).text, 80))], ['Fait conséquent', l => n(l.to) + ' ' + esc(trunc(factById(l.to, a).text, 80))], ['Relation', l => esc(kindsOf(l))], ['Nécessité', l => l.necessity === 'confirmee' ? 'confirmée' : 'à confirmer'], ['Tracé', l => l.uncertain ? 'pointillé (incertitude)' : 'plein'], ['Justification', l => esc(l.justification || '')]])}
<h3>Photographies et documents</h3>${rows(a.attachments, [['Fichier', x => esc(x.name)], ['Type', x => x.kind === 'photo' ? 'Photo' : 'Document'], ['Lecture', x => x.kind === 'photo' ? 'affichée (non analysée automatiquement)' : esc(EXTRACT_LBL[x.extract?.status]?.[1] || '')], ['Légende / observation', x => esc([x.caption, x.observation].filter(Boolean).join(' – '))], ['Faits associés', x => x.factIds.filter(id => num.has(id)).map(n).join(', ')]])}
<h3>Contradictions</h3>${rows(a.contradictions, [['Faits', c => c.factIds.map(n).join(' / ')], ['Description', c => esc(c.description || '')], ['État', c => c.status === 'ouverte' ? 'non résolue' : 'résolue'], ['Résolution', c => c.resolution ? esc(c.resolution.text) + ' (' + esc(fmtDT(c.resolution.date)) + ')' : '']])}
<h3>Compléments d'enquête</h3>${rows(a.complements, [['Date', x => esc(fmtDT(x.date))], ['Question', x => esc(x.question)], ['Réponse', x => esc(x.answer)], ['Source', x => esc((SOURCES[x.source.type] || '') + (x.source.detail ? ' – ' + x.source.detail : ''))]])}

<h2>D. Points restant à examiner</h2>
${rows(gaps.active, [['Priorité', g => esc(g.prio)], ['Élément concerné', g => esc(g.concerne)], ['Question à poser', g => esc(g.question)], ['Impact', g => esc(g.impact)]])}
${gaps.dismissed.length ? `<h3>Points écartés par le groupe</h3>${rows(gaps.dismissed, [['Élément', g => esc(g.concerne)], ['Motif', g => esc(a.gapsDismissed[g.key].reason)]])}` : ''}
<h3>Limites de l'analyse</h3>
${a.limites ? `<p style="white-space:pre-wrap">${esc(a.limites)}</p>` : ''}
<ul><li>L'analyse repose uniquement sur les informations communiquées par l'entreprise ; l'application n'en vérifie pas l'exactitude.</li><li>Les photographies ne sont pas analysées automatiquement ; seules les observations décrites par les utilisateurs sont prises en compte.</li><li>Les contrôles automatiques (formulation, chronologie, indépendance, statuts) sont des aides : ils ne remplacent pas la relecture par un groupe formé à la méthode.</li>${a.attachments.filter(x => x.kind === 'document' && !['ok', 'manuel'].includes(x.extract?.status)).map(x => `<li>Document non exploité : ${esc(x.name)}.</li>`).join('')}</ul>

<h2>E. Pistes de prévention à examiner</h2>
<div class="ban w">Pistes proposées pour examen par le groupe d'analyse. Ce ne sont pas des décisions : leur pertinence doit être examinée par l'entreprise ; le choix des mesures relève de la direction.</div>
${rows(a.prevention.filter(p => p.text.trim() && num.has(p.factId)), [['Fait visé', p => n(p.factId) + ' ' + esc(trunc(factById(p.factId, a)?.text, 70))], ['Piste', p => esc(p.text)], ['Niveau', p => esc(LEVELS[p.level] || 'à préciser')], ['FPA', p => esc(p.fpa || '')], ['Critères', p => CRITERIA.map(c => esc(c.q) + ' ' + (p.criteria[c.id] || 'à examiner')).join('<br>')], ['Suite', p => esc({ 'a-examiner': 'à examiner', retenue: 'retenue par la direction', ecartee: 'écartée' }[p.status])], ['Pilote proposé', p => esc(p.owner || '')]])}
${photos && a.attachments.some(x => x.kind === 'photo' && safeImg(x.dataUrl)) ? `<h2>Annexe – Photographies</h2><div class="ph">${a.attachments.filter(x => x.kind === 'photo' && safeImg(x.dataUrl)).map(x => `<figure><img src="${safeImg(x.dataUrl)}" alt="${esc(x.caption || x.name)}"><figcaption><b>${esc(x.caption || x.name)}</b>${x.observation ? '<br>Observation : ' + esc(x.observation) : ''}</figcaption></figure>`).join('')}</div>` : ''}
<p class="m" style="margin-top:30px;border-top:1px solid #C9D2DE;padding-top:8px">Référence méthodologique : INRS, ED 6163, « La méthode de l'arbre des causes – L'analyse de l'accident du travail », 3e édition (2025), révisée en novembre 2025 – ${INRS_URL}. Le questionnement 5M et les « 5 pourquoi » sont des outils complémentaires d'aide au recueil. Document produit avec l'application « Arbre des causes » v${APP.build}.</p>
</body></html>`;
}
function originTxtA(f, a) { const save = S.a; S.a = a; try { return originTxt(f); } finally { S.a = save; } }

/* =====================================================================
   Cas fictif de démonstration (clairement identifié)
   ===================================================================== */
function demoPhoto() {
  const c = document.createElement('canvas'); c.width = 900; c.height = 600; const g = c.getContext('2d');
  g.fillStyle = '#E9EEF4'; g.fillRect(0, 0, 900, 600);
  g.fillStyle = '#9AA5B4'; g.fillRect(380, 80, 140, 420); g.fillStyle = '#C9D2DE'; g.fillRect(150, 300, 600, 30);
  g.strokeStyle = '#B42318'; g.lineWidth = 6; g.beginPath(); g.moveTo(450, 90); g.lineTo(450, 300); g.stroke();
  g.fillStyle = '#8A5300'; g.fillRect(455, 285, 70, 18);
  g.fillStyle = '#18202E'; g.font = 'bold 34px Segoe UI, Arial'; g.fillText('PHOTO FICTIVE – schéma', 40, 560);
  g.font = '22px Segoe UI, Arial'; g.fillText('Chute de bois coincée contre la lame (illustration)', 40, 50);
  return c.toDataURL('image/jpeg', 0.85);
}
function buildDemo() {
  const a = blankAnalysis(); a.fictif = true;
  a.company = { raisonSociale: '[CAS FICTIF] Menuiserie Exemple', siret: '', etablissement: 'Atelier de débit', secteur: 'Fabrication de menuiseries en bois (exemple inventé)' };
  a.accident = { date: '2026-03-10', heure: '09:40', lieu: 'Atelier de débit, scie à ruban n°2', poste: 'Opérateur de débit', tache: 'Découpe de tasseaux en chêne', dommage: "Coupure à l'index gauche", description: "CAS FICTIF. Vers 9 h 40, l'opérateur découpait des tasseaux en chêne sur la scie à ruban n°2. Une chute de bois est restée coincée entre la lame et le guide. Il a dégagé la chute à la main gauche, scie en marche. Son index gauche a touché la lame. Le lot du jour était en chêne humide, ce qui n'est pas habituel selon le chef d'équipe. Un témoin indique que le poussoir était posé sur l'établi voisin ; un autre dit qu'il était sur son support." };
  const t = nowISO();
  const F = (id, text, o) => Object.assign(newFact({ id, text, origin: { type: 'demo' } }), o, { createdAt: t, updatedAt: t });
  const ph = demoPhoto();
  a.attachments.push({ id: 'p_demo1', kind: 'photo', name: 'photo-fictive-scie.jpg', mime: 'image/jpeg', size: Math.round(ph.length * 0.75), dataUrl: ph, w: 900, h: 600, caption: 'Photo 1 (fictive) – zone de coupe', observation: 'Une chute de bois est visible entre la lame et le guide. La photo ne montre pas la position du protège-lame.', phase: 'justeavant', factIds: ['f5'], addedAt: t });
  a.attachments.push({ id: 'd_demo1', kind: 'document', name: 'Relevé des faits (fictif).txt', mime: 'text/plain', size: 0, dataUrl: '', caption: '', factIds: [], isReleve: true, addedAt: t, extract: { status: 'manuel', method: 'texte du cas fictif', date: t, text: "RELEVÉ DES FAITS – CAS FICTIF\nLe 10/03, vers 9 h 40, l'opérateur de débit a été blessé à l'index gauche sur la scie à ruban n°2.\nLa commande du client devait être livrée le jour même à 14 h.\nLe protège-lame était réglé en position haute selon le régleur ; non vérifié." } });
  a.facts = [
    F('f1', "Coupure à l'index gauche de l'opérateur", { status: 'rapporte', kind: 'variation', family: 'MO', chrono: { phase: 'dommage', order: 6, moment: '9 h 40' }, source: { type: 'encadrement', detail: "chef d'équipe" }, questionId: 'c5', origin: { type: 'questionnaire' } }),
    F('f2', "L'index gauche entre en contact avec la lame", { status: 'rapporte', kind: 'variation', family: 'MO', chrono: { phase: 'moment', order: 5, moment: '' }, source: { type: 'victime', detail: '' }, questionId: 'c4', origin: { type: 'questionnaire' } }),
    F('f3', 'La lame de la scie est en mouvement', { status: 'rapporte', kind: 'etat', family: 'MA', chrono: { phase: 'moment', order: 5, moment: '' }, source: { type: 'temoin', detail: 'opérateur du poste voisin' }, origin: { type: 'questionnaire' }, questionId: 'ma2' }),
    F('f4', "L'opérateur dégage à la main gauche une chute coincée près de la lame", { status: 'rapporte', kind: 'variation', family: 'ME', chrono: { phase: 'justeavant', order: 4, moment: '' }, source: { type: 'victime', detail: '' }, questionId: 'c3', origin: { type: 'questionnaire' } }),
    F('f5', 'Une chute de bois reste coincée entre la lame et le guide', { status: 'corrobore', evidence: 'Photo 1 (fictive) montrant la chute coincée', kind: 'variation', family: 'MT', chrono: { phase: 'justeavant', order: 3, moment: '' }, source: { type: 'photo', detail: 'Photo 1' }, origin: { type: 'photo', ref: 'p_demo1' } }),
    F('f6', "Le poussoir est posé sur l'établi voisin, à environ 3 m", { status: 'rapporte', kind: 'variation', family: 'MA', chrono: { phase: 'avant', order: 2, moment: '' }, source: { type: 'temoin', detail: 'témoin 1' } }),
    F('f7', 'Le poussoir est rangé sur son support à côté de la scie', { status: 'rapporte', kind: 'etat', family: 'MA', chrono: { phase: 'avant', order: 2, moment: '' }, source: { type: 'temoin', detail: 'témoin 2' } }),
    F('f8', 'Le lot du jour est en chêne humide (bois sec d\'habitude)', { status: 'rapporte', kind: 'variation', family: 'MT', chrono: { phase: 'avant', order: 1, moment: '' }, source: { type: 'encadrement', detail: "chef d'équipe" }, questionId: 'c7', origin: { type: 'questionnaire' } }),
    F('f9', 'Le protège-lame est réglé en position haute', { status: 'averifier', kind: 'indetermine', family: 'MA', chrono: { phase: 'avant', order: null, moment: '' }, source: { type: 'document', detail: 'Relevé des faits (fictif)' }, origin: { type: 'document', ref: 'd_demo1' } }),
    F('f10', "L'humidité du bois favorise le coincement des chutes", { status: 'hypothese', kind: 'indetermine', family: 'MT', source: { type: 'groupe', detail: '' }, origin: { type: '5pourquoi', ref: 'w_demo' } }),
    F('f11', 'La commande doit être livrée le jour même à 14 h', { status: 'rapporte', kind: 'etat', family: 'ME', chrono: { phase: 'avant', order: null, moment: '' }, source: { type: 'document', detail: 'Relevé des faits (fictif)' }, origin: { type: 'document', ref: 'd_demo1' } }),
    F('f12', 'Réglage habituel du protège-lame pour ce type de pièce : non communiqué', { status: 'manquant', kind: 'indetermine', family: 'ME', source: { type: 'groupe', detail: '' } }),
    F('f13', "D'habitude, les chutes sont dégagées avec le poussoir, machine en marche", { status: 'rapporte', kind: 'etat', family: 'ME', chrono: { phase: 'habituel', order: null, moment: '' }, source: { type: 'collegue', detail: 'opérateur de débit (autre équipe)' }, questionId: 'c0', origin: { type: 'questionnaire' } })
  ];
  const Lk = (id, from, to, o = {}) => Object.assign({ id, from, to, uncertain: false, necessity: 'confirmee', justification: '', createdAt: t, history: [], deleted: false }, o);
  a.links = [Lk('l1', 'f2', 'f1'), Lk('l2', 'f3', 'f1'), Lk('l3', 'f4', 'f2', { justification: 'Récit de la victime' }), Lk('l4', 'f5', 'f4', { justification: 'Photo 1' }), Lk('l5', 'f8', 'f5', { uncertain: true, necessity: 'a-verifier', justification: 'Hypothèse du chef d\'équipe, à confirmer' }), Lk('l6', 'f9', 'f2', { necessity: 'a-verifier' }), Lk('l7', 'f6', 'f4', { necessity: 'a-verifier' })];
  a.tree.rootId = 'f1';
  a.contradictions = [{ id: 'c_demo', factIds: ['f6', 'f7'], description: "Les deux témoins ne situent pas le poussoir au même endroit.", status: 'ouverte', createdAt: t, resolution: null }];
  a.whys = [{ id: 'w_demo', subject: 'Une chute de bois reste coincée entre la lame et le guide', subjectFactId: 'f5', createdAt: t, levels: [{ id: 'wl1', answer: 'Le bois humide gonfle et frotte contre le guide', documented: 'non', source: '', factId: 'f10' }, { id: 'wl2', answer: 'Le lot a été stocké à l\'extérieur', documented: 'nsp', source: '', factId: null }], stop: { reason: 'manque', note: 'Demander au magasinier les conditions de stockage du lot', date: t } }];
  a.journal = [{ date: t, type: 'analyse', text: 'Création du cas fictif de démonstration' }];
  return a;
}
