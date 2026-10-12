
/* =====================================================================
   Actions (délégation d'événements)
   ===================================================================== */
S.openFams = new Set();
async function confirmReason(text, { title = 'Confirmation', ok = 'Confirmer', label = 'Motif (facultatif, conservé dans l\'historique)' } = {}) {
  const v = await modal({
    title, body: `<p>${text}</p><div class="field"><label for="cr-r">${esc(label)}</label><input type="text" id="cr-r"></div>`,
    buttons: [{ label: 'Annuler', value: 'no' }, { label: ok, value: 'yes', cls: 'danger solid' }],
    onAction: (v, d) => v === 'yes' ? { r: d.querySelector('#cr-r').value.trim() } : undefined
  });
  return v && typeof v === 'object' ? v : null;
}
function exportName(ext, what = 'analyse-AT') { return `${what}_${slug(S.a?.company.raisonSociale)}_${stamp()}.${ext}`; }
async function exportAnalysis(a) {
  try {
    const txt = JSON.stringify(a);
    download(`analyse-AT_${slug(a.company.raisonSociale)}_${stamp()}.json`, txt, 'application/json');
    return txt.length;
  } catch (e) { toast('Export impossible : ' + e.message, 'bad'); return 0; }
}
async function importFile(file) {
  let a;
  try { a = JSON.parse(await readAs(file, 'readAsText')); }
  catch (e) { modal({ title: 'Import impossible', body: `<p>Le fichier « ${esc(file.name)} » n'est pas un fichier JSON lisible.</p>` }); return; }
  if (!a || a.format !== APP.format) { modal({ title: 'Import impossible', body: `<p>Le fichier « ${esc(file.name)} » n'est pas une sauvegarde de cette application (format attendu : ${APP.format}).</p>` }); return; }
  if (a.formatVersion > APP.formatVersion) { modal({ title: 'Import impossible', body: '<p>Cette sauvegarde provient d\'une version plus récente de l\'application.</p>' }); return; }
  try { normalize(a); } catch (e) { modal({ title: 'Import impossible', body: `<p>La sauvegarde est incomplète ou endommagée (${esc(e.message)}).</p>` }); return; }
  if (S.dbOK) {
    const ex = await DB.get(a.id).catch(() => null);
    if (ex) {
      const ch = await modal({ title: 'Analyse déjà présente', body: `<p>Une analyse portant le même identifiant existe déjà sur cet appareil (modifiée le ${esc(fmtDT(ex.updatedAt))}). La sauvegarde importée date du ${esc(fmtDT(a.updatedAt))}.</p>`, buttons: [{ label: 'Annuler', value: 'cancel' }, { label: 'Importer comme copie', value: 'copy' }, { label: 'Remplacer celle de l\'appareil', value: 'replace', cls: 'danger solid' }] });
      if (!ch || ch === 'cancel') return;
      if (ch === 'copy') { a.id = uid('an'); a.company.raisonSociale = (a.company.raisonSociale || 'Analyse') + ' (copie importée)'; }
    }
  }
  a.journal.push({ date: nowISO(), type: 'export', text: `Analyse importée depuis le fichier « ${file.name} »` });
  S.a = a; S.step = 1; S.sel = null; S.needFit = true;
  await saveNow(); render(); toast('Sauvegarde importée. Vous pouvez reprendre l\'analyse.', 'ok');
}
const ACT = {
  home: () => goHome(),
  go: d => go(d.step),
  newAnalysis: async () => { S.a = blankAnalysis(); S.step = 1; S.sel = null; S.needFit = true; await saveNow(); render(); window.scrollTo(0, 0); $('#b-company-raisonSociale')?.focus(); },
  importJSON: () => $('#file-import').click(),
  loadDemo: async () => { S.a = buildDemo(); S.step = 1; S.sel = null; S.needFit = true; await saveNow(); render(); toast('Cas fictif chargé. Les données sont inventées et identifiées comme telles.', 'ok', 6000); },
  openAnalysis: d => openAnalysis(d.id),
  exportStored: async d => { const a = await DB.get(d.id); if (a) exportAnalysis(a); },
  deleteStored: async d => {
    const a = S.list.find(x => x.id === d.id); if (!a) return;
    if (!await confirmBox(`Supprimer définitivement l'analyse « ${esc(titleOf(a))} » de cet appareil ?<br><br>Cette action est irréversible. Les sauvegardes .json déjà exportées ne sont pas concernées.`, { ok: 'Supprimer définitivement', danger: true })) return;
    await DB.del(d.id); await refreshList(); render(); toast('Analyse supprimée de cet appareil.');
  },
  wipeAll: async () => {
    if (!await confirmBox(`Supprimer <b>toutes</b> les analyses enregistrées dans ce navigateur (${S.list.length}) ?<br><br>Action irréversible. Pensez à exporter d'abord ce que vous souhaitez conserver.`, { ok: 'Tout supprimer', danger: true })) return;
    await DB.clear(); await refreshList(); render(); toast('Toutes les données locales ont été supprimées.');
  },
  exportJSON: async () => { await saveNow(); log('export', 'Sauvegarde complète exportée (.json)'); changed(); const n = await exportAnalysis(S.a); if (n) toast(`Sauvegarde téléchargée (${fmtSize(n)}). Rangez-la dans un dossier sécurisé.`, 'ok', 6000); },

  extSearch: () => extSearch(),
  extPick: d => {
    const e = S.extResults?.[+d.i]; if (!e) return;
    S.a.external = { date: nowISO(), source: "API Recherche d'entreprises – service public (recherche-entreprises.api.gouv.fr)", url: S.extUrl, fiche: `https://annuaire-entreprises.data.gouv.fr/entreprise/${encodeURIComponent(e.siren)}`, data: e };
    log('analyse', `Informations publiques consultées : ${e.nom} (NAF ${e.naf || '—'})`); changed(); render();
  },
  extUse: () => { const d = S.a.external?.data; if (!d) return; const v = `${d.naf || ''}${d.section ? ' – ' + (NAF_SECTIONS[d.section] || '') : ''} (source : API Recherche d'entreprises)`; S.a.company.secteur = S.a.company.secteur ? S.a.company.secteur : v; if (S.a.company.secteur !== v) S.a.company.secteur += ' · ' + v; changed(); render(); },
  extClear: async () => { if (!await confirmBox('Effacer les informations publiques enregistrées pour cette analyse ?', { ok: 'Effacer' })) return; S.a.external = null; log('analyse', 'Informations publiques effacées'); changed(); render(); },
  extractFrom: () => extractDialog(S.a.accident.description, 'récit initial', { origin: { type: 'recit' } }),

  collectTab: d => { S.collectTab = d.tab; render(); },
  qAdd: async d => {
    const ta = $('#qa-' + d.q); const m = qMeta(d.q);
    const id = await factEditor(null, { text: ta?.value.trim() || '', questionId: d.q, origin: { type: 'questionnaire' }, chrono: { phase: m.phase, order: null, moment: '' }, family: m.family }, { why: 'réponse à « ' + trunc(m.q, 60) + ' »', intro: `Question : <b>${esc(m.q)}</b>` });
    if (id) { if (m.family !== 'NC') S.openFams.add(m.family); render(); toast('Fait enregistré.', 'ok'); }
  },
  addFact: async () => { const id = await factEditor(null, {}, { why: 'saisie directe' }); if (id) render(); },
  editFact: async d => { const id = await factEditor(d.id); if (id) render(); },
  contradict: d => contradictionDialog(d.id),
  resolveC: d => resolveContradiction(d.id),
  delFact: async d => {
    const f = factById(d.id);
    const r = await confirmReason(`Retirer le fait « ${esc(trunc(f.text, 100))} » de l'analyse ?<br><span class="small">Il restera consultable (étape 7 – Historique) et pourra être rétabli. ${inTree(d.id) ? 'Ses liens dans l\'arbre seront retirés.' : ''}</span>`, { title: 'Retirer un fait', ok: 'Retirer' });
    if (!r) return; deleteFact(d.id, r.r); if (S.sel?.id === d.id) S.sel = null; render(); toast('Fait retiré (rétablissable dans l\'historique).');
  },
  restoreFact: d => { restoreFact(d.id); render(); },
  toggleNA: (d, el) => { const st = S.a.m5[d.fam]; st.na = el.checked; S.openFams.add(d.fam); log('analyse', `Famille ${FAMILIES[d.fam].label} marquée ${st.na ? '« sans objet »' : 'à examiner'}`); changed(); render(); },
  addCustomQ: async d => { const q = await askText('Ajouter une question', 'Question adaptée à votre activité', { required: true, hint: 'Ex. : « Quel était le réglage de la butée ? »' }); if (!q) return; S.a.m5[d.fam].custom.push({ id: uid('cq'), q }); S.openFams.add(d.fam); log('analyse', `Question ajoutée (${FAMILIES[d.fam].label}) : ${q}`); changed(); render(); },
  delCustomQ: async d => { if (!await confirmBox('Retirer cette question ? Les faits déjà saisis sont conservés.', { ok: 'Retirer' })) return; const st = S.a.m5[d.fam]; st.custom = st.custom.filter(c => c.id !== d.q); changed(); render(); },

  newWhy: async () => {
    const F = liveFacts();
    const v = await modal({
      title: 'Approfondir un fait ou une situation', wide: true,
      body: `<div class="field"><label for="nw-f">Partir d'un fait recueilli</label><select id="nw-f"><option value="">— Choisir un fait —</option>${F.map(f => `<option value="${f.id}">${esc(trunc(f.text, 110))}</option>`).join('')}</select></div>
      <p class="small muted" style="margin:8px 0">ou</p><div class="field"><label for="nw-t">Décrire la situation à examiner</label><textarea id="nw-t" rows="2"></textarea></div><div class="err" id="nw-e" role="alert" hidden>Choisissez un fait ou décrivez la situation.</div>`,
      buttons: [{ label: 'Annuler', value: 'cancel' }, { label: 'Commencer', value: 'ok', cls: 'primary' }],
      onAction: (v, d) => { if (v !== 'ok') return; const fid = d.querySelector('#nw-f').value, t = d.querySelector('#nw-t').value.trim(); if (!fid && !t) { d.querySelector('#nw-e').hidden = false; return false; } return { fid, t }; }
    });
    if (!v || typeof v !== 'object') return;
    S.a.whys.push({ id: uid('w'), subject: v.fid ? factById(v.fid).text : v.t, subjectFactId: v.fid || null, createdAt: nowISO(), levels: [{ id: uid('wl'), answer: '', documented: '', source: '', factId: null }], stop: null });
    log('5pourquoi', 'Nouveau questionnement « pourquoi » : ' + trunc(v.fid ? factById(v.fid).text : v.t, 80)); changed(); render();
  },
  delWhy: async d => { if (!await confirmBox('Supprimer ce questionnement ? Les faits déjà enregistrés à partir des réponses sont conservés.', { ok: 'Supprimer', danger: true })) return; S.a.whys = S.a.whys.filter(w => w.id !== d.id); log('5pourquoi', 'Questionnement supprimé'); changed(); render(); },
  whyNext: d => { const w = S.a.whys.find(x => x.id === d.id); w.levels.push({ id: uid('wl'), answer: '', documented: '', source: '', factId: null }); changed(); render(); setTimeout(() => $('#wa-' + w.levels[w.levels.length - 1].id)?.focus(), 30); },
  whyStop: async d => {
    const w = S.a.whys.find(x => x.id === d.id);
    const v = await modal({
      title: "S'arrêter ici", body: `<fieldset><legend>Pourquoi s'arrêter ?</legend><div class="radio-list">${Object.entries(WHY_STOPS).map(([k, t], i) => `<label><input type="radio" name="ws" value="${k}" ${i === 0 ? 'checked' : ''}> ${esc(t)}</label>`).join('')}</div></fieldset><div class="field" style="margin-top:8px"><label for="ws-n">Précision (ex. : qui pourrait répondre ?)</label><input type="text" id="ws-n"></div>`,
      buttons: [{ label: 'Annuler', value: 'cancel' }, { label: 'Arrêter le questionnement', value: 'ok', cls: 'primary' }],
      onAction: (v, dd) => v === 'ok' ? { r: dd.querySelector('input[name=ws]:checked').value, n: dd.querySelector('#ws-n').value.trim() } : undefined
    });
    if (!v || typeof v !== 'object') return;
    const last = w.levels[w.levels.length - 1];
    if (w.levels.length > 1 && last && !last.answer.trim() && !last.factId) w.levels.pop();
    w.stop = { reason: v.r, note: v.n, date: nowISO() }; log('5pourquoi', `Questionnement arrêté (${WHY_STOPS[v.r]})`); changed(); render();
  },
  whyResume: d => { const w = S.a.whys.find(x => x.id === d.id); w.stop = null; changed(); render(); },
  whyToFact: async d => {
    const w = S.a.whys.find(x => x.id === d.id), i = w.levels.findIndex(l => l.id === d.lvl), l = w.levels[i];
    const status = l.documented === 'oui' ? 'rapporte' : l.documented === 'partiel' ? 'averifier' : 'hypothese';
    const prev = i === 0 ? w.subject : w.levels[i - 1].answer;
    const id = await factEditor(null, { text: l.answer, status, origin: { type: '5pourquoi', ref: w.id }, source: l.source ? { type: 'autre', detail: l.source } : { type: 'apreciser', detail: '' }, notes: `Réponse à : « Pourquoi ${trunc(prev, 120)} ? »` }, { why: 'réponse à un « pourquoi »', intro: `Statut proposé selon votre réponse (${l.documented ? 'documentée : ' + l.documented : 'documentation non précisée'}). Vous pouvez le modifier. <b>Ce fait n'est pas ajouté à l'arbre automatiquement.</b>` });
    if (id) { l.factId = id; changed(); render(); }
  },

  pasteDoc: async () => {
    const t = await askText('Relevé des faits de l\'entreprise', 'Collez ici le texte du relevé des faits', { required: true, multiline: true, ok: 'Enregistrer' });
    if (!t) return;
    S.a.attachments.push({ id: uid('d'), kind: 'document', name: `Relevé des faits (texte saisi le ${new Date().toLocaleDateString('fr-FR')})`, mime: 'text/plain', size: t.length, dataUrl: '', caption: '', factIds: [], isReleve: true, addedAt: nowISO(), extract: { status: 'manuel', text: t, method: 'texte saisi', date: nowISO() } });
    log('piece', 'Relevé des faits saisi (texte collé)'); changed(); render();
  },
  manualDoc: async d => {
    const x = S.a.attachments.find(t => t.id === d.id);
    const t = await askText('Texte du document', `Collez le texte utile de « ${trunc(x.name, 60)} »`, { required: true, multiline: true, ok: 'Enregistrer' });
    if (!t) return; x.extract = { status: 'manuel', text: t, method: 'texte saisi par l\'utilisateur', date: nowISO(), message: '' };
    log('piece', `Texte saisi manuellement pour « ${x.name} »`); changed(); render();
  },
  retryDoc: async d => {
    const x = S.a.attachments.find(t => t.id === d.id); if (!x?.dataUrl) return;
    x.extract = { status: 'cours' }; render();
    const buf = await (await fetch(x.dataUrl)).arrayBuffer();
    x.extract = await extractText(x.name, buf); log('piece', `Nouvelle lecture de « ${x.name} » : ${EXTRACT_LBL[x.extract.status][1]}`); changed(); render();
  },
  extractDoc: d => { const x = S.a.attachments.find(t => t.id === d.id); extractDialog(x.extract.text, 'document « ' + trunc(x.name, 40) + ' »', { origin: { type: 'document', ref: x.id }, source: { type: 'document', detail: x.name }, _att: [x.id] }); },
  dlAtt: async d => { const x = S.a.attachments.find(t => t.id === d.id); if (!x?.dataUrl) return; const b = await (await fetch(x.dataUrl)).blob(); download(x.name, b); },
  viewPhoto: d => { const x = S.a.attachments.find(t => t.id === d.id); if (!x) return; modal({ title: x.caption || x.name, wide: true, body: `<div class="lightbox"><img src="${safeImg(x.dataUrl)}" alt="${esc(x.caption || x.name)}"></div>${x.observation ? `<p><b>Observation :</b> ${esc(x.observation)}</p>` : '<p class="muted">Aucune observation décrite.</p>'}<p class="xs muted">Seuls les éléments effectivement visibles peuvent être retenus. L'application n'interprète pas l'image et n'identifie pas les personnes.</p>` }); },
  attFacts: d => attFactsDialog(d.id),
  photoFact: async d => { const x = S.a.attachments.find(t => t.id === d.id); const id = await factEditor(null, { text: x.observation || '', origin: { type: 'photo', ref: x.id }, source: { type: 'photo', detail: x.caption || x.name }, chrono: { phase: x.phase || '', order: null, moment: '' }, _att: [x.id] }, { why: 'observé sur une photographie', intro: 'Ne retenez que ce qui est <b>effectivement visible</b> sur la photo.' }); if (id) render(); },
  delAtt: async d => {
    const x = S.a.attachments.find(t => t.id === d.id);
    if (!await confirmBox(`Supprimer « ${esc(x.caption || x.name)} » de l'analyse ?<br><span class="small">Le fichier est effacé de l'analyse. Les faits qui en sont issus sont conservés, avec la mention de leur provenance.</span>`, { ok: 'Supprimer', danger: true })) return;
    S.a.attachments = S.a.attachments.filter(t => t.id !== d.id); log('piece', `Pièce jointe supprimée : ${x.name}`); changed(); render();
  },

  treeView: d => { S.a.tree.view = d.v; S.needFit = true; changed(); render(); },
  treeOrient: d => { S.a.tree.orient = d.v; S.needFit = true; changed(); render(); },
  zoom: d => zoomAt(+d.v),
  fit: () => fitTree(),
  fullscreen: () => { const b = $('#tree-box'); if (!document.fullscreenElement) b.requestFullscreen?.().catch(() => toast('Plein écran indisponible dans ce navigateur.', 'warn')); else document.exitFullscreen(); },
  exportSVG: () => { const v = S.a.tree.view; download(exportName('svg', 'arbre-' + v), treeSVGString(S.a, v, S.a.tree.orient), 'image/svg+xml'); log('export', `Export SVG de l'arbre (${v})`); changed(); },
  exportPNG: async () => { const v = S.a.tree.view; try { const b = await svgToPngBlob(treeSVGString(S.a, v, S.a.tree.orient)); download(exportName('png', 'arbre-' + v), b); log('export', `Export PNG de l'arbre (${v})`); changed(); } catch (e) { toast('Export PNG impossible : ' + e.message + '. Utilisez l\'export SVG.', 'bad'); } },
  validateTree: () => validateTree(),
  selNode: d => { if (S.dragMoved) return; S.sel = { type: 'fact', id: d.id }; render(); if (window.innerWidth < 1000) $('.side')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); },
  selLink: d => { if (S.dragMoved) return; S.sel = { type: 'link', id: d.id }; render(); if (window.innerWidth < 1000) $('.side')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); },
  unsel: () => { S.sel = null; render(); },
  setRootPick: () => { const v = $('input[name=root-pick]:checked')?.value; if (!v) { toast('Choisissez un fait dans la liste.', 'warn'); return; } ACT.setRoot({ id: v }); },
  newRoot: async () => { const id = await factEditor(null, { text: S.a.accident.dommage || '', chrono: { phase: 'dommage', order: null, moment: '' }, origin: { type: 'arbre' } }, { why: 'fait ultime', intro: 'Le fait ultime est le <b>dommage</b> (blessure physique ou psychique), sans détail médical.' }); if (id) ACT.setRoot({ id }); },
  setRoot: async d => {
    const t = S.a.tree;
    if (t.rootId && t.rootId !== d.id && !await confirmBox(`Remplacer le fait ultime actuel (« ${esc(trunc(factById(t.rootId).text, 60))} ») par « ${esc(trunc(factById(d.id).text, 60))} » ?`, { ok: 'Remplacer' })) return;
    t.rootId = d.id; log('arbre', `Fait ultime défini : « ${trunc(factById(d.id).text, 80)} »`); treeTouched('changement du fait ultime'); changed();
    S.sel = { type: 'fact', id: d.id }; S.needFit = true; render();
  },
  linkTo: d => linkWizard({ to: d.id }),
  linkFrom: d => { if (!S.a.tree.rootId) { toast('Définissez d\'abord le fait ultime.', 'warn'); return; } linkWizard({ from: d.id }); },
  factHist: d => factHistory(d.id),
  unlinkNode: async d => {
    const L = activeLinks().filter(l => l.from === d.id || l.to === d.id);
    const r = await confirmReason(`Retirer ce fait de l'arbre ? Ses ${L.length} lien(s) seront retirés ; le fait reste dans la liste des faits recueillis.`, { title: 'Retirer de l\'arbre', ok: 'Retirer de l\'arbre' });
    if (!r) return; L.forEach(l => deleteLink(l.id, r.r || 'Fait retiré de l\'arbre')); S.sel = null; render();
  },
  linkNec: d => { updateLink(d.id, { necessity: d.v }, d.v === 'confirmee' ? 'Nécessité confirmée' : 'Nécessité remise à confirmer'); render(); },
  linkUnc: d => { updateLink(d.id, { uncertain: d.v === '1' }, d.v === '1' ? 'Part d\'incertitude signalée' : 'Lien considéré comme établi'); render(); },
  insertMid: d => insertMid(d.id),
  delLink: async d => { const r = await confirmReason('Supprimer ce lien ? Il restera visible dans l\'historique.', { title: 'Supprimer un lien', ok: 'Supprimer' }); if (!r) return; deleteLink(d.id, r.r); S.sel = null; render(); },

  gapAction: d => gapAction(d.key),
  answerGap: d => answerGap(d.key),
  dismissGap: async d => {
    const g = computeGaps().active.find(x => x.key === d.key);
    const r = await askText('Écarter ce point', 'Pourquoi ce point est-il sans objet ? (obligatoire)', { required: true, hint: 'Ex. : « Le groupe estime pragmatique d\'arrêter l\'analyse à ce fait. »' });
    if (!r) return; S.a.gapsDismissed[d.key] = { reason: r, date: nowISO(), concerne: g?.concerne || '' }; log('complement', `Point écarté : ${g?.concerne || d.key} – motif : ${r}`); changed(); render();
  },
  undismissGap: d => { delete S.a.gapsDismissed[d.key]; log('complement', 'Point rétabli : ' + d.key); changed(); render(); },

  newVersion: async () => { const l = await askText('Enregistrer une version', 'Libellé de la version', { required: true, value: 'Point d\'étape du ' + new Date().toLocaleDateString('fr-FR') }); if (!l) return; const n = createVersion(l, '', 'manuel'); toast(`Version ${n} enregistrée.`, 'ok'); render(); },
  viewVersion: d => viewVersion(d.n),
  restoreVersion: d => restoreVersion(d.n),

  addPrev: d => { S.a.prevention.push({ id: uid('pv'), factId: d.id, text: '', level: '', criteria: {}, fpa: '', owner: '', status: 'a-examiner', createdAt: nowISO() }); log('prevention', `Piste de prévention ajoutée pour « ${trunc(factById(d.id).text, 60)} »`); changed(); render(); },
  delPrev: async d => { if (!await confirmBox('Retirer cette piste de prévention ?', { ok: 'Retirer', danger: true })) return; S.a.prevention = S.a.prevention.filter(p => p.id !== d.id); log('prevention', 'Piste de prévention retirée'); changed(); render(); },
  dossierPreview: () => {
    const html = buildDossier(S.a, { photos: $('#dos-photos')?.checked }).replace(/<div class="np"[\s\S]*?<\/div>/, '');
    modal({ title: 'Aperçu du dossier', wide: true, body: `<iframe title="Aperçu du dossier" style="width:100%;height:70vh;border:1px solid var(--line);border-radius:8px" sandbox="allow-same-origin" srcdoc="${esc(html)}"></iframe>`, buttons: [{ label: 'Fermer', value: 'close' }, { label: 'Imprimer / enregistrer en PDF', value: 'print', cls: 'primary', icon: 'print' }], onAction: v => { if (v === 'print') ACT.dossierPrint(); } });
  },
  dossierDownload: () => { download(exportName('html', 'dossier-AT'), buildDossier(S.a, { photos: $('#dos-photos')?.checked }), 'text/html'); log('export', 'Dossier d\'analyse exporté (.html)'); changed(); },
  dossierPrint: () => {
    const html = buildDossier(S.a, { photos: $('#dos-photos')?.checked });
    const w = window.open('', '_blank');
    if (!w) { toast('La fenêtre d\'impression a été bloquée par le navigateur. Téléchargez le dossier (.html) puis imprimez-le.', 'warn', 8000); return; }
    w.document.open(); w.document.write(html); w.document.close(); setTimeout(() => { try { w.focus(); w.print(); } catch (e) { } }, 400);
    log('export', 'Dossier d\'analyse ouvert pour impression'); changed();
  }
};
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]'); if (!el) return;
  const fn = ACT[el.dataset.act]; if (!fn) return;
  if (!(el instanceof HTMLInputElement)) e.preventDefault();
  Promise.resolve().then(() => fn(el.dataset, el, e)).catch(err => { console.error(err); toast('Une erreur est survenue : ' + err.message, 'bad', 8000); });
});
document.addEventListener('keydown', e => {
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches?.('img[data-act]')) { e.preventDefault(); e.target.click(); }
});
let filterTimer;
document.addEventListener('input', e => {
  const t = e.target;
  if (t.dataset.bind && S.a) {
    setPath(S.a, t.dataset.bind, t.type === 'checkbox' ? t.checked : t.value); changed();
    if (t.dataset.bind === 'company.siret') { const c = siretCheck(t.value); const er = $('#' + t.id + '-err'); er.hidden = c.ok; er.textContent = c.msg || ''; t.setAttribute('aria-invalid', !c.ok); }
    if (t.dataset.bind.startsWith('company.') || t.dataset.bind === 'accident.date') { const tt = $('.top-title'); if (tt) tt.textContent = titleOf(S.a); }
    return;
  }
  if (t.dataset.filter) {
    S.factFilter[t.dataset.filter] = t.type === 'checkbox' ? t.checked : t.value;
    clearTimeout(filterTimer); const id = t.id, pos = t.selectionStart;
    filterTimer = setTimeout(() => { render(); const n = id && $('#' + id); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (er) { } } }, t.type === 'search' ? 250 : 0);
    return;
  }
  if (t.dataset.att && S.a) {
    const x = S.a.attachments.find(a => a.id === t.dataset.att); if (!x) return;
    x[t.dataset.k] = t.type === 'checkbox' ? t.checked : t.value; changed(); return;
  }
  if (t.dataset.why && S.a) {
    const w = S.a.whys.find(x => x.id === t.dataset.why); const l = w?.levels.find(x => x.id === t.dataset.lvl); if (!l) return;
    l[t.dataset.k] = t.value; changed();
    if (t.dataset.k === 'answer') { const b = t.closest('.why-level').querySelector('[data-act=whyToFact]'); if (b) b.disabled = !t.value.trim(); const nx = t.closest('.card').querySelector('[data-act=whyNext]'); if (nx && l === w.levels[w.levels.length - 1]) nx.disabled = !t.value.trim(); }
    return;
  }
  if (t.dataset.prev && S.a) {
    const p = S.a.prevention.find(x => x.id === t.dataset.prev); if (!p) return;
    setPath(p, t.dataset.k, t.value); changed(); return;
  }
});
document.addEventListener('change', e => {
  const t = e.target;
  if (t.dataset.why && t.dataset.k === 'documented') render();
  if (t.dataset.att && t.dataset.k === 'isReleve') { log('piece', `« ${S.a.attachments.find(a => a.id === t.dataset.att)?.name} » ${t.checked ? 'identifié' : 'n\'est plus identifié'} comme relevé des faits`); render(); }
  if (t.dataset.prev && t.dataset.k === 'level') render();
  if (t.matches('[data-jfilter]')) { S.jFilter = t.value; render(); }
});
document.addEventListener('toggle', e => { const d = e.target; if (d.matches && d.matches('details[data-fam]')) { if (d.open) S.openFams.add(d.dataset.fam); else S.openFams.delete(d.dataset.fam); } }, true);
$('#file-import').addEventListener('change', e => { const f = e.target.files[0]; e.target.value = ''; if (f) importFile(f); });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && S.a) saveNow(); });
window.addEventListener('pagehide', () => { if (S.a) saveNow(); });
window.addEventListener('error', e => { toast('Erreur inattendue : ' + (e.message || 'inconnue') + '. Exportez une sauvegarde par précaution.', 'bad', 8000); });
window.addEventListener('unhandledrejection', e => { toast('Erreur inattendue : ' + (e.reason?.message || e.reason || 'inconnue'), 'bad', 8000); });

/* ---------------- Démarrage ---------------- */
(async function init() {
  S.dbOK = typeof indexedDB !== 'undefined' && await DB.open();
  await refreshList();
  render();
})();
</script>
</body>
</html>
