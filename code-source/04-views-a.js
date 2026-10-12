
/* =====================================================================
   Coque de l'application
   ===================================================================== */
const LOGO = `<svg width="28" height="28" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="8" fill="#D9680A"/><g fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="6" width="8" height="6" rx="1"/><circle cx="8" cy="23" r="3.5"/><rect x="20" y="13" width="8" height="6" rx="1"/><path d="M12 9h3v7h5M11.5 23H15v-7"/></g></svg>`;
S.saveCls = ''; S.saveTxt = '';
const _setSave = setSaveState;
setSaveState = function (state, text) { S.saveCls = state; S.saveTxt = text; _setSave(state, text); };
function renderTop() {
  $('#topbar').innerHTML = `<button class="brand" data-act="home" aria-label="Arbre des causes – retour à l'accueil">${LOGO}<span>Arbre des causes</span></button>
  <div class="top-title">${S.a ? esc(titleOf(S.a)) : "Analyse d'accident du travail – méthode INRS ED 6163"}</div>
  ${S.a ? `<div class="save-state ${S.saveCls}" id="save-state"><span class="dot"></span><span>${esc(S.saveTxt || (S.dbOK ? 'Enregistrement automatique actif' : 'Stockage local indisponible'))}</span></div>
  <button class="btn sm" data-act="exportJSON" title="Télécharger une sauvegarde complète (.json)">${icon('save')}Sauvegarder (.json)</button>` : ''}`;
}
function stepMeta(i) {
  const a = S.a; if (!a) return '';
  const F = liveFacts();
  switch (STEPS[i].id) {
    case 'ctx': return a.accident.description ? 'renseigné' : '';
    case 'collect': return F.length ? F.length + ' fait(s)' : '';
    case 'files': return a.attachments.length ? a.attachments.length + ' fichier(s)' : '';
    case 'tree': return a.tree.status === 'valide' ? 'validé v' + a.tree.validatedVersion : (activeLinks().length ? 'provisoire' : '');
    case 'gaps': { const g = computeGaps().active.filter(x => x.prio === 'haute').length; return g ? g + ' prioritaire(s)' : ''; }
    case 'hist': return a.versions.length ? a.versions.length + ' version(s)' : '';
    default: return '';
  }
}
function renderStepper() {
  const nav = $('#stepper'), pr = $('#progress');
  if (!S.a) { nav.hidden = true; pr.hidden = true; return; }
  nav.hidden = false; pr.hidden = false;
  nav.innerHTML = `<ol>${STEPS.slice(1).map((s, j) => { const i = j + 1; const m = stepMeta(i); return `<li><button data-act="go" data-step="${i}" ${S.step === i ? 'aria-current="step"' : ''} class="${m && S.step !== i ? 'done' : ''}"><span class="num">${i}</span><span>${esc(s.label)}${m ? `<br><span class="meta">${esc(m)}</span>` : ''}</span></button></li>`; }).join('')}</ol>`;
  pr.firstElementChild.style.width = (S.step / (STEPS.length - 1) * 100) + '%';
}
function renderFoot() {
  const f = $('#navfoot');
  if (!S.a || S.step === 0) { f.hidden = true; return; }
  f.hidden = false;
  const prev = S.step > 1 ? STEPS[S.step - 1].label : null, next = S.step < STEPS.length - 1 ? STEPS[S.step + 1].label : null;
  f.innerHTML = `<button class="btn" data-act="go" data-step="${S.step - 1}">← ${esc(prev || 'Accueil')}</button>
  <div class="info">Étape ${S.step} sur ${STEPS.length - 1} – vous pouvez quitter et reprendre plus tard : l'analyse est enregistrée sur cet appareil.</div>
  ${next ? `<button class="btn primary" data-act="go" data-step="${S.step + 1}">${esc(next)} →</button>` : `<button class="btn primary" data-act="home">Terminer</button>`}`;
}
const VIEWS = {};
function render() {
  renderTop(); renderStepper(); renderFoot();
  const m = $('#main'); const y = window.scrollY;
  const same = m.dataset.step === String(S.step);
  m.className = STEPS[S.step].id === 'tree' ? 'wide' : '';
  try { m.innerHTML = VIEWS[STEPS[S.step].id](); }
  catch (e) { console.error(e); m.innerHTML = `<div class="note bad">${icon('alert')}<div>Erreur d'affichage : ${esc(e.message)}. Vos données ne sont pas perdues ; exportez une sauvegarde puis rechargez la page.</div></div>`; }
  m.dataset.step = S.step;
  if (same) window.scrollTo(0, y);
  const h = AFTER[STEPS[S.step].id]; if (h) h();
}
const AFTER = {};
function go(step) {
  step = Math.max(0, Math.min(STEPS.length - 1, Number(step)));
  if (step === 0) return goHome();
  S.step = step; S.needFit = true; render(); window.scrollTo(0, 0); $('#main').focus({ preventScroll: true });
}
async function goHome() {
  if (S.a) await saveNow();
  S.a = null; S.step = 0; S.sel = null;
  await refreshList(); render(); window.scrollTo(0, 0);
}
async function refreshList() {
  if (!S.dbOK) { S.list = []; return; }
  try { S.list = (await DB.all()).sort((x, y) => (y.updatedAt || '').localeCompare(x.updatedAt || '')); } catch (e) { S.list = []; }
}
async function openAnalysis(id) {
  const a = await DB.get(id); if (!a) { toast('Analyse introuvable.', 'bad'); return; }
  S.a = normalize(a); S.step = 1; S.sel = null; S.needFit = true; S.saveTxt = 'Analyse ouverte'; S.saveCls = '';
  render(); window.scrollTo(0, 0);
}

/* =====================================================================
   Accueil
   ===================================================================== */
VIEWS.home = () => `
<section class="hero">
  <h1>Analyser un accident du travail avec l'arbre des causes</h1>
  <p>Cette application vous guide pas à pas, du recueil des faits jusqu'à l'arbre des causes, puis vers les informations qui restent à recueillir. Elle suit la méthode de la brochure <b>INRS ED 6163</b>. Son but est de comprendre l'accident pour le prévenir, <b>pas de désigner un responsable</b>.</p>
  <div class="steps-intro">
    <div><b>1</b>Décrire l'entreprise et l'accident</div>
    <div><b>2</b>Recueillir les faits (questions guidées, photos, documents)</div>
    <div><b>3</b>Construire l'arbre des causes à partir du dommage</div>
    <div><b>4</b>Compléter l'enquête et préparer la prévention</div>
  </div>
  <div class="row" style="margin-top:14px">
    <button class="btn accent lg" data-act="newAnalysis">${icon('plus')}Commencer une analyse</button>
    <button class="btn lg" data-act="importJSON">${icon('upload')}Importer une sauvegarde (.json)</button>
    <button class="btn lg" data-act="loadDemo">${icon('bulb')}Découvrir avec un cas fictif</button>
  </div>
</section>
${!S.dbOK ? `<div class="note bad">${icon('alert')}<div><b>Le stockage local de ce navigateur est indisponible</b> (navigation privée ou paramètres de sécurité). L'application fonctionne, mais rien n'est conservé à la fermeture : exportez régulièrement la sauvegarde .json.</div></div>` : ''}
<div class="grid g2">
  <section class="card">
    <h2>${icon('list')}Analyses enregistrées sur cet appareil</h2>
    ${S.list.length ? `<ul class="an-list">${S.list.map(a => `<li><div class="t"><b>${esc(titleOf(a))}</b><br><span class="small muted">Modifiée le ${esc(fmtDT(a.updatedAt))} · ${(a.facts || []).filter(f => !f.deleted).length} fait(s) · arbre ${a.tree?.status === 'valide' ? 'validé' : 'provisoire'}</span></div>
      <button class="btn sm primary" data-act="openAnalysis" data-id="${esc(a.id)}">Ouvrir</button>
      <button class="btn sm" data-act="exportStored" data-id="${esc(a.id)}">${icon('download')}Exporter</button>
      <button class="btn sm danger" data-act="deleteStored" data-id="${esc(a.id)}" aria-label="Supprimer l'analyse ${esc(titleOf(a))}">${icon('trash')}</button></li>`).join('')}</ul>` : '<p class="muted">Aucune analyse enregistrée pour le moment.</p>'}
    ${S.list.length ? `<hr><button class="btn sm danger" data-act="wipeAll">${icon('trash')}Supprimer toutes les données de cet appareil</button>` : ''}
  </section>
  <section class="card">
    <h2>${icon('shield')}Vos données</h2>
    <ul class="small">
      <li>Les informations restent <b>sur cet appareil</b>, dans le stockage du navigateur. Rien n'est envoyé à un serveur, aucun traceur ni outil de mesure d'audience n'est utilisé.</li>
      <li>Ce stockage <b>n'est pas une sauvegarde garantie</b> : il peut être effacé (nettoyage du navigateur, autre poste, navigation privée). Exportez la sauvegarde <b>.json</b> et rangez-la dans un dossier sécurisé de l'entreprise.</li>
      <li>Ne saisissez <b>pas le nom de la victime</b> ni de détails médicaux : ils ne sont pas nécessaires à l'analyse. Désignez les personnes par leur fonction.</li>
      <li>Deux fonctions facultatives utilisent Internet, après votre accord : la recherche publique sur l'entreprise (raison sociale ou SIRET uniquement) et le module de lecture des PDF (le fichier n'est pas envoyé).</li>
    </ul>
    <h3 style="margin-top:12px">Référence méthodologique</h3>
    <p class="small">INRS, ED 6163, <i>La méthode de l'arbre des causes – L'analyse de l'accident du travail</i>, 3<sup>e</sup> édition (2025), révisée en novembre 2025. <a href="${INRS_URL}" target="_blank" rel="noopener">Consulter la brochure</a>.</p>
    <p class="small muted">Le questionnement 5M et les « 5 pourquoi » sont proposés en complément pour aider au recueil. Ils ne font pas partie de la brochure et ne remplacent pas la construction de l'arbre.</p>
  </section>
</div>`;

/* =====================================================================
   Étape 1 – Entreprise et accident
   ===================================================================== */
function siretCheck(s) {
  const d = String(s || '').replace(/\s/g, '');
  if (!d) return { ok: true, empty: true };
  if (!/^\d{14}$/.test(d)) return { ok: false, msg: 'Le SIRET doit comporter exactement 14 chiffres.' };
  let sum = 0; for (let i = 0; i < 14; i++) { let n = Number(d[13 - i]); if (i % 2 === 1) { n *= 2; if (n > 9) n -= 9; } sum += n; }
  if (sum % 10 === 0) return { ok: true, d };
  // Exception connue : établissements de La Poste (SIREN 356000000), somme des chiffres multiple de 5
  if (d.startsWith('356000000') && [...d].reduce((x, c) => x + Number(c), 0) % 5 === 0) return { ok: true, d };
  return { ok: false, msg: 'Ce numéro SIRET ne semble pas valide (clé de contrôle). Vérifiez la saisie.' };
}
function bindField(path, label, { type = 'text', hint = '', placeholder = '', area = false, rows = 3 } = {}) {
  const id = 'b-' + path.replace(/\./g, '-'); const v = getPath(S.a, path) ?? '';
  const ctl = area ? `<textarea id="${id}" data-bind="${path}" rows="${rows}" placeholder="${esc(placeholder)}" ${hint ? `aria-describedby="${id}-h"` : ''}>${esc(v)}</textarea>`
    : `<input type="${type}" id="${id}" data-bind="${path}" value="${esc(v)}" placeholder="${esc(placeholder)}" ${hint ? `aria-describedby="${id}-h"` : ''}>`;
  return `<div class="field"><label for="${id}">${esc(label)}</label>${ctl}${hint ? `<div class="hint" id="${id}-h">${esc(hint)}</div>` : ''}<div class="err" id="${id}-err" role="alert" hidden></div></div>`;
}
VIEWS.ctx = () => {
  const a = S.a, x = a.external;
  return `
<h1>1. L'entreprise et l'accident</h1>
<p class="lead">Quelques informations pour situer l'accident. Tous les champs sont facultatifs : vous pourrez compléter plus tard.</p>
<div class="grid g2">
<section class="card">
  <h2>${icon('building')}Entreprise</h2>
  <div class="grid">
    ${bindField('company.raisonSociale', 'Raison sociale', { placeholder: 'Ex. : Métallerie Dupuis SAS' })}
    ${bindField('company.siret', 'Numéro SIRET (facultatif)', { placeholder: '14 chiffres', hint: 'Permet, si vous le souhaitez, de retrouver les informations publiques sur l\'activité.' })}
    ${bindField('company.etablissement', 'Établissement concerné', { placeholder: 'Ex. : Usine de Saint-Priest' })}
    ${bindField('company.secteur', 'Secteur ou activité', { placeholder: 'Ex. : Découpe et emboutissage de tôles' })}
  </div>
  <details class="fam" style="margin-top:14px" ${x ? 'open' : ''}><summary>${icon('search')} Informations publiques sur l'entreprise (facultatif)</summary><div class="fam-body">
    <p class="small">Ces informations servent seulement à situer l'activité. <b>Elles ne sont jamais utilisées comme faits de l'accident.</b></p>
    ${x ? extBlock(x) : ''}
    <label class="check small"><input type="checkbox" id="ext-consent"> <span>J'accepte que la raison sociale ou le SIRET, <b>et uniquement eux</b>, soient envoyés au service public « API Recherche d'entreprises » (recherche-entreprises.api.gouv.fr). Aucune information sur l'accident n'est transmise.</span></label>
    <div class="row" style="margin-top:8px"><button class="btn sm" data-act="extSearch">${icon('search')}Rechercher</button><span class="xs muted">Connexion Internet nécessaire. Sans connexion, l'application reste utilisable.</span></div>
    <div id="ext-results" aria-live="polite"></div>
  </div></details>
</section>
<section class="card">
  <h2>${icon('alert')}Accident</h2>
  <div class="grid g2">
    ${bindField('accident.date', "Date de l'accident", { type: 'date' })}
    ${bindField('accident.heure', 'Heure (si connue)', { type: 'time' })}
  </div>
  <div class="grid" style="margin-top:14px">
    ${bindField('accident.lieu', "Lieu précis dans l'entreprise", { placeholder: 'Ex. : Atelier B, poste de découpe n°3' })}
    ${bindField('accident.poste', 'Poste occupé par la victime', { placeholder: 'Ex. : Opérateur sur presse', hint: 'Le nom de la victime n\'est pas demandé.' })}
    ${bindField('accident.tache', "Tâche réalisée au moment de l'accident", { placeholder: 'Ex. : Dégagement d\'une pièce coincée' })}
    ${bindField('accident.dommage', 'Nature du dommage, si connue', { placeholder: 'Ex. : Coupure à la main gauche', hint: 'Sans détail médical : nature et localisation de la blessure suffisent.' })}
  </div>
</section>
</div>
<section class="card">
  <h2>${icon('file')}Description initiale de l'accident</h2>
  <p class="small muted">Racontez ce qui s'est passé avec vos mots. Ce récit n'est pas encore une liste de faits : vous pourrez en extraire les faits un par un.</p>
  ${bindField('accident.description', 'Récit de l\'accident', { area: true, rows: 7, placeholder: 'Ex. : Vers 9 h 40, l\'opérateur a constaté qu\'une pièce restait coincée…' })}
  <div class="row" style="margin-top:10px"><button class="btn" data-act="extractFrom" data-src="description">${icon('list')}Extraire des faits de ce récit</button>
  <span class="xs muted">${liveFacts().filter(f => f.origin?.type === 'recit').length} fait(s) déjà extrait(s) du récit.</span></div>
</section>`;
};
function extBlock(x) {
  const d = x.data || {};
  return `<div class="note info">${icon('info')}<div><b>Source externe – contexte uniquement</b><br>
  ${esc(d.nom)}${d.siret ? ' · SIRET ' + esc(d.siret) : d.siren ? ' · SIREN ' + esc(d.siren) : ''}<br>
  Activité principale (code NAF/APE) : <b>${esc(d.naf || 'non communiquée')}</b>${d.naf ? ` – <a href="https://www.insee.fr/fr/metadonnees/nafr2/sousClasse/${encodeURIComponent(d.naf)}" target="_blank" rel="noopener">libellé INSEE</a>` : ''}<br>
  Section : ${esc(d.section ? d.section + ' – ' + (NAF_SECTIONS[d.section] || '') : 'non communiquée')}${d.adresse ? '<br>Adresse : ' + esc(d.adresse) : ''}<br>
  <span class="xs">Consulté le ${esc(fmtDT(x.date))} – ${esc(x.source)} – <a href="${esc(x.fiche)}" target="_blank" rel="noopener">fiche publique</a></span>
  <div class="row" style="margin-top:6px"><button class="btn sm" data-act="extUse">Reporter le secteur dans le champ « Secteur »</button><button class="btn sm danger" data-act="extClear">Effacer ces informations</button></div></div></div>`;
}
async function extSearch() {
  const out = $('#ext-results');
  if (!$('#ext-consent')?.checked) { out.innerHTML = `<div class="err" role="alert">Cochez la case d'accord avant de lancer la recherche.</div>`; $('#ext-consent').focus(); return; }
  const sc = siretCheck(S.a.company.siret);
  if (!sc.ok) { out.innerHTML = `<div class="err" role="alert">${esc(sc.msg)}</div>`; return; }
  const q = sc.d || S.a.company.raisonSociale.trim();
  if (!q) { out.innerHTML = `<div class="err" role="alert">Saisissez la raison sociale ou le SIRET.</div>`; return; }
  out.innerHTML = '<p class="small muted">Recherche en cours…</p>';
  const url = `${API_ENTREPRISES}?q=${encodeURIComponent(q)}&per_page=5`;
  try {
    const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 12000);
    const r = await fetch(url, { signal: ctrl.signal, headers: { Accept: 'application/json' } }); clearTimeout(t);
    if (!r.ok) throw new Error('Réponse du service : ' + r.status);
    const js = await r.json(); const res = js.results || [];
    if (!res.length) { out.innerHTML = '<p class="small">Aucun résultat. Vérifiez la saisie, ou poursuivez sans cette information.</p>'; return; }
    S.extResults = res.map(e => {
      const m = (e.matching_etablissements || []).find(x => x.siret === sc.d) || e.siege || {};
      return { nom: e.nom_complet, siren: e.siren, siret: m.siret || e.siege?.siret, naf: m.activite_principale || e.activite_principale, section: e.section_activite_principale, adresse: m.adresse || e.siege?.adresse, etat: m.etat_administratif || e.siege?.etat_administratif };
    });
    S.extUrl = url;
    out.innerHTML = `<ul class="an-list" style="margin-top:8px">${S.extResults.map((e, i) => `<li><div class="t"><b>${esc(e.nom)}</b><br><span class="small muted">SIRET ${esc(e.siret || '—')} · NAF ${esc(e.naf || '—')} · ${esc(e.adresse || '')}${e.etat === 'F' ? ' · établissement fermé' : ''}</span></div><button class="btn sm primary" data-act="extPick" data-i="${i}">Utiliser</button></li>`).join('')}</ul><p class="xs muted">Source : API Recherche d'entreprises (service public). Vérifiez qu'il s'agit bien de votre établissement.</p>`;
  } catch (e) {
    out.innerHTML = `<div class="note warn">${icon('alert')}<div>La recherche n'a pas abouti (${esc(e.name === 'AbortError' ? 'délai dépassé' : e.message || 'connexion indisponible')}). Vous pouvez poursuivre l'analyse sans cette information.</div></div>`;
  }
}

/* =====================================================================
   Étape 2 – Recueil des faits
   ===================================================================== */
function attCount(fid) { return S.a.attachments.filter(x => x.factIds.includes(fid)).length; }
function factMeta(f) {
  const ph = PHASES[f.chrono.phase || ''];
  const n = attCount(f.id);
  return `${factBadge(f)} ${kindTag(f.kind)} <span>${esc(FAMILIES[f.family]?.label || '')}</span> · <span>${esc(ph.label)}${f.chrono.order != null ? ' · n°' + esc(f.chrono.order) : ''}${f.chrono.moment ? ' (' + esc(f.chrono.moment) + ')' : ''}</span> · <span>Source : ${esc(srcTxt(f))}</span>${f.certainty !== 'certain' ? ' · <span>' + esc(CERTAINTY[f.certainty]) + '</span>' : ''}${inTree(f.id) ? ' · <span class="pill">dans l\'arbre</span>' : ''}${n ? ' · <span>📎 ' + n + '</span>' : ''}${f.history.length ? ' · <span>' + f.history.length + ' modif.</span>' : ''}`;
}
function factItem(f, { actions = true } = {}) {
  return `<li class="fact ${f.deleted ? 'is-deleted' : ''}"><div class="ftxt"><strong>${esc(f.text)}</strong><div class="fmeta">${factMeta(f)}</div>${f.deleted ? `<div class="xs muted">Retiré le ${esc(fmtDT(f.deletedAt))}${f.deleteReason ? ' – ' + esc(f.deleteReason) : ''}</div>` : ''}</div>
  ${actions ? (f.deleted ? `<div class="facts-act"><button class="btn sm" data-act="restoreFact" data-id="${f.id}">Rétablir</button></div>` :
    `<div class="facts-act"><button class="icon-btn" data-act="editFact" data-id="${f.id}" aria-label="Modifier le fait : ${esc(trunc(f.text, 40))}" title="Modifier">${icon('edit')}</button><button class="icon-btn" data-act="contradict" data-id="${f.id}" aria-label="Signaler une contradiction" title="Signaler une contradiction">${icon('alert')}</button><button class="icon-btn" data-act="delFact" data-id="${f.id}" aria-label="Retirer le fait" title="Retirer">${icon('trash')}</button></div>`) : ''}</li>`;
}
function qMeta(qid) {
  const c = CHRONO_Q.find(x => x.id === qid); if (c) return { q: c.q, phase: c.phase, family: 'NC' };
  for (const [k, list] of Object.entries(M5_Q)) { const m = list.find(x => x.id === qid); if (m) return { q: m.q, phase: '', family: k }; }
  for (const [k, v] of Object.entries(S.a.m5)) { const m = (v.custom || []).find(x => x.id === qid); if (m) return { q: m.q, phase: '', family: k }; }
  return { q: '', phase: '', family: 'NC' };
}
function qCard(q) {
  const facts = liveFacts().filter(f => f.questionId === q.id);
  return `<div class="qcard"><h4>${esc(q.q)}</h4>${q.help ? `<div class="hint">${esc(q.help)}</div>` : ''}
  ${facts.length ? `<ul class="facts">${facts.map(f => factItem(f)).join('')}</ul>` : ''}
  <div class="qadd"><label class="sr-only" for="qa-${q.id}">Réponse à : ${esc(q.q)}</label><textarea id="qa-${q.id}" placeholder="${esc(q.ex || 'Saisissez un fait…')}"></textarea><button class="btn sm primary" data-act="qAdd" data-q="${q.id}">${icon('plus')}Ajouter…</button></div>
  ${q.custom ? `<div class="row end"><button class="btn sm ghost" data-act="delCustomQ" data-q="${q.id}" data-fam="${q.fam}">Retirer cette question</button></div>` : ''}</div>`;
}
VIEWS.collect = () => {
  const t = S.collectTab;
  const tabs = [['chrono', 'Chronologie'], ['m5', 'Questionnement 5M'], ['why', '5 pourquoi'], ['all', 'Tous les faits (' + liveFacts().length + ')']];
  return `<h1>2. Recueil des faits</h1>
  <p class="lead">Décrivez ce qui s'est réellement passé. Une réponse = un fait. Aucune question n'est obligatoire.</p>
  <div class="tabs" role="tablist" aria-label="Outils de recueil">${tabs.map(([k, l]) => `<button role="tab" aria-selected="${t === k}" data-act="collectTab" data-tab="${k}">${esc(l)}</button>`).join('')}</div>
  <div role="tabpanel">${({ chrono: collectChrono, m5: collectM5, why: collectWhy, all: collectAll })[t]()}</div>`;
};
function collectChrono() {
  const F = liveFacts().filter(f => f.chrono.phase).sort((x, y) => (PHASES[x.chrono.phase].rank - PHASES[y.chrono.phase].rank) || ((x.chrono.order ?? 999) - (y.chrono.order ?? 999)));
  return `<div class="note info">${icon('info')}<div>Faites décrire le travail <b>tel qu'il se fait réellement d'habitude</b>, puis recherchez <b>ce qui était inhabituel</b>. Interrogez sans porter de jugement : il ne s'agit pas de rechercher des responsabilités.</div></div>
  <div class="chrono-grid">
    <div>${CHRONO_Q.map(qCard).join('')}</div>
    <aside class="card tight"><h3>${icon('clock')} Fil chronologique</h3>
      ${F.length ? `<ol class="timeline">${F.map(f => `<li><div class="ph">${esc(PHASES[f.chrono.phase].label)}${f.chrono.order != null ? ' · n°' + esc(f.chrono.order) : ''}${f.chrono.moment ? ' · ' + esc(f.chrono.moment) : ''}</div><div class="small">${esc(f.text)}</div>${factBadge(f)}</li>`).join('')}</ol>` : '<p class="small muted">Les faits situés dans le temps apparaîtront ici.</p>'}
      <p class="xs muted">Astuce : le n° d'ordre (1, 2, 3…) précise la succession des faits d'une même phase.</p></aside>
  </div>`;
}
function collectM5() {
  return `<div class="note info">${icon('info')}<div>Ces questions sont des <b>pistes de recueil</b>, pas une grille de causes. Certaines familles peuvent être sans objet : ne les remplissez pas artificiellement. Correspondance avec le cadre d'observation de la brochure INRS : Main-d'œuvre ↔ <b>I</b> (individu), Méthodes ↔ <b>T/A</b> (tâche/activité), Matériel et Matière ↔ <b>Ma</b>, Milieu ↔ <b>Mi</b>.</div></div>
  ${S.a.external?.data?.naf ? `<p class="small muted">Contexte (source externe) : activité NAF ${esc(S.a.external.data.naf)}${S.a.external.data.section ? ' – ' + esc(NAF_SECTIONS[S.a.external.data.section] || '') : ''}.</p>` : ''}
  ${Object.keys(M5_Q).map(k => {
    const st = S.a.m5[k]; const fam = FAMILIES[k];
    const n = liveFacts().filter(f => f.family === k).length;
    const qs = [...M5_Q[k], ...(st.custom || []).map(c => ({ ...c, custom: true, fam: k }))];
    const qIds = new Set(qs.map(q => q.id));
    const others = liveFacts().filter(f => f.family === k && !qIds.has(f.questionId));
    return `<details class="fam" ${S.openFams.has(k) ? 'open' : ''} data-fam="${k}"><summary><span class="letter">${esc(fam.label[0])}</span>${esc(fam.label)} <span class="xs muted">(INRS : ${esc(fam.inrs)})</span><span class="spacer"></span>${st.na ? '<span class="pill">sans objet</span>' : ''}<span class="pill">${n} fait(s)</span></summary>
    <div class="fam-body">
      <label class="check small"><input type="checkbox" data-act="toggleNA" data-fam="${k}" ${st.na ? 'checked' : ''}> Sans objet pour cet accident</label>
      ${st.na ? `<div class="field" style="margin-top:6px"><label for="na-${k}">Pourquoi ? (facultatif)</label><input type="text" id="na-${k}" data-bind="m5.${k}.naReason" value="${esc(st.naReason || '')}"></div>` :
        `<div style="margin-top:10px">${qs.map(qCard).join('')}</div>
        ${others.length ? `<h4>Autres faits classés « ${esc(fam.label)} »</h4><ul class="facts">${others.map(f => factItem(f)).join('')}</ul>` : ''}
        <button class="btn sm" data-act="addCustomQ" data-fam="${k}">${icon('plus')}Ajouter une question adaptée à votre activité</button>`}
    </div></details>`;
  }).join('')}`;
}
function collectWhy() {
  const W = S.a.whys;
  return `<div class="note hyp">${icon('info')}<div><b>Les « 5 pourquoi » aident à approfondir l'enquête.</b> Ils ne figurent pas dans la brochure INRS et ne remplacent pas la construction de l'arbre. Les réponses ne sont <b>pas des causes établies</b> : elles ne deviennent des faits que si vous les enregistrez, avec leur source et leur statut. Il n'est pas obligatoire d'aller jusqu'à cinq niveaux.</div></div>
  <div class="row"><button class="btn primary" data-act="newWhy">${icon('plus')}Approfondir un fait ou une situation</button></div>
  ${W.length ? W.map(whyCard).join('') : '<p class="muted" style="margin-top:12px">Aucun questionnement pour le moment.</p>'}`;
}
function whyCard(w) {
  const last = w.levels[w.levels.length - 1];
  return `<section class="card" style="margin-top:14px"><div class="card-head"><div><span class="xs muted">Point examiné</span><h3 style="margin:0">${esc(w.subject)}</h3></div><button class="btn sm danger" data-act="delWhy" data-id="${w.id}">${icon('trash')}Supprimer</button></div>
  ${w.levels.map((l, i) => {
    const prev = i === 0 ? w.subject : w.levels[i - 1].answer;
    const f = l.factId ? factById(l.factId) : null;
    return `<div class="why-level"><div class="q">Pourquoi n°${i + 1} : pourquoi « ${esc(trunc(prev, 140))} » ?</div>
    <div class="field" style="margin-top:6px"><label for="wa-${l.id}" class="sr-only">Réponse au pourquoi n°${i + 1}</label><textarea id="wa-${l.id}" rows="2" data-why="${w.id}" data-lvl="${l.id}" data-k="answer" placeholder="Réponse…">${esc(l.answer)}</textarea></div>
    <fieldset style="margin-top:6px"><legend class="small">Cette réponse repose-t-elle sur un fait documenté ?</legend><div class="row small">
      ${[['oui', 'Oui, documenté'], ['partiel', 'En partie'], ['non', 'Non, c\'est une supposition'], ['nsp', 'Je ne sais pas']].map(([v, t]) => `<label class="check"><input type="radio" name="wd-${l.id}" data-why="${w.id}" data-lvl="${l.id}" data-k="documented" value="${v}" ${l.documented === v ? 'checked' : ''}> ${t}</label>`).join('')}
    </div></fieldset>
    ${l.documented === 'oui' || l.documented === 'partiel' ? `<div class="field" style="margin-top:6px"><label for="ws-${l.id}" class="small">Sur quoi repose-t-elle ?</label><input type="text" id="ws-${l.id}" data-why="${w.id}" data-lvl="${l.id}" data-k="source" value="${esc(l.source || '')}" placeholder="Ex. : fiche de maintenance du 14/03"></div>` : ''}
    <div class="row" style="margin-top:6px">${f ? `<span class="small">Enregistré comme fait : ${factBadge(f)}</span>` : `<button class="btn sm" data-act="whyToFact" data-id="${w.id}" data-lvl="${l.id}" ${l.answer.trim() ? '' : 'disabled'}>${icon('plus')}Enregistrer cette réponse comme fait…</button>`}</div></div>`;
  }).join('')}
  ${w.stop ? `<div class="note ${w.stop.reason === 'manque' ? 'warn' : 'info'}">${icon('info')}<div>Questionnement arrêté : <b>${esc(WHY_STOPS[w.stop.reason])}</b>${w.stop.note ? ' – ' + esc(w.stop.note) : ''} <button class="btn sm ghost" data-act="whyResume" data-id="${w.id}">Reprendre</button></div></div>` :
      `<div class="row" style="margin-top:8px"><button class="btn sm primary" data-act="whyNext" data-id="${w.id}" ${last && !last.answer.trim() ? 'disabled title="Répondez d\'abord à la question en cours"' : ''}>Poser un nouveau « pourquoi »</button><button class="btn sm" data-act="whyStop" data-id="${w.id}">S'arrêter ici</button></div>`}
  </section>`;
}
const WHY_STOPS = { manque: "l'information manque", inutile: "un nouveau « pourquoi » n'est pas justifié", hors: "la réponse sort du cadre de l'accident analysé", autre: 'autre raison' };
function collectAll() {
  const fl = S.factFilter;
  let F = S.a.facts.filter(f => fl.showDeleted || !f.deleted);
  if (fl.status) F = F.filter(f => effStatus(f) === fl.status);
  if (fl.family) F = F.filter(f => f.family === fl.family);
  if (fl.q) F = F.filter(f => f.text.toLowerCase().includes(fl.q.toLowerCase()));
  return `<div class="row" style="margin-bottom:12px">
    <button class="btn primary" data-act="addFact">${icon('plus')}Ajouter un fait</button>
    <span class="spacer"></span>
    <label class="sr-only" for="ff-q">Rechercher</label><input type="search" id="ff-q" data-filter="q" value="${esc(fl.q)}" placeholder="Rechercher…" style="max-width:220px">
    <label class="sr-only" for="ff-s">Statut</label><select id="ff-s" data-filter="status" style="max-width:190px"><option value="">Tous les statuts</option>${opts(STATUS, fl.status, (k, v) => v.label)}</select>
    <label class="sr-only" for="ff-f">Famille</label><select id="ff-f" data-filter="family" style="max-width:170px"><option value="">Toutes les familles</option>${opts(FAMILIES, fl.family)}</select>
    <label class="check small"><input type="checkbox" data-filter="showDeleted" ${fl.showDeleted ? 'checked' : ''}> Afficher les faits retirés</label>
  </div>
  ${F.length ? `<ul class="facts">${F.map(f => factItem(f)).join('')}</ul>` : '<p class="muted">Aucun fait ne correspond.</p>'}
  ${S.a.contradictions.length ? `<h3 style="margin-top:18px">Contradictions</h3>${contraList()}` : ''}`;
}
function contraList() {
  return `<ul class="facts">${S.a.contradictions.map(c => `<li class="fact"><div class="ftxt">${c.status === 'ouverte' ? stBadge('contradiction') : '<span class="tag ok">Résolue</span>'} ${c.factIds.map(id => '« ' + esc(trunc(factById(id)?.text, 70)) + ' »').join(' <b>/</b> ')}
  ${c.description ? `<div class="small muted">${esc(c.description)}</div>` : ''}${c.resolution ? `<div class="small">Résolution (${esc(fmtDT(c.resolution.date))}) : ${esc(c.resolution.text)}</div>` : ''}</div>
  ${c.status === 'ouverte' ? `<button class="btn sm primary" data-act="resolveC" data-id="${c.id}">Résoudre</button>` : ''}</li>`).join('')}</ul>`;
}

/* ---------- Extraction de faits depuis un texte ---------- */
async function extractDialog(text, label, defaults) {
  if (!String(text || '').trim()) { toast('Le texte est vide.', 'warn'); return; }
  let created = 0;
  await modal({
    title: 'Extraire des faits : ' + label, wide: true,
    body: `<p class="small">Sélectionnez à la souris (ou au doigt) un passage qui décrit <b>un seul fait</b>, puis cliquez sur « Créer un fait ». Vous pourrez le reformuler, préciser sa source, son statut et sa place dans la chronologie.</p>
    <div class="doc-text" id="ex-text" tabindex="0">${esc(text)}</div>
    <div class="row" style="margin-top:10px"><button type="button" class="btn primary" id="ex-go">${icon('plus')}Créer un fait avec la sélection</button><button type="button" class="btn" id="ex-empty">Créer un fait sans sélection</button><span class="small muted" id="ex-n" aria-live="polite"></span></div>`,
    buttons: [{ label: 'Terminer', value: 'done', cls: 'primary' }],
    onOpen: d => {
      const mk = async useSel => {
        let s = '';
        if (useSel) { const sel = window.getSelection(); if (sel && sel.rangeCount && d.querySelector('#ex-text').contains(sel.anchorNode)) s = sel.toString().trim(); if (!s) { toast('Sélectionnez d\'abord un passage du texte.', 'warn'); return; } }
        const id = await factEditor(null, Object.assign(clone(defaults), { text: s }), { why: 'extrait de : ' + label });
        if (id) { created++; d.querySelector('#ex-n').textContent = created + ' fait(s) créé(s).'; }
      };
      d.querySelector('#ex-go').addEventListener('click', () => mk(true));
      d.querySelector('#ex-empty').addEventListener('click', () => mk(false));
    }
  });
  if (created) render();
}
