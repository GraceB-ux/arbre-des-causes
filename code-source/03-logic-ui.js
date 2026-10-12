
/* =====================================================================
   Détection des informations manquantes (étape 6)
   ===================================================================== */
function computeGaps(a = S.a) {
  const G = [];
  const ft = id => trunc(factById(id, a)?.text || '', 90);
  const F = a.facts.filter(f => !f.deleted);
  const model = graphModel(a, 'travail');
  const treeIds = model.nodeIds;
  const L = activeLinks(a).filter(l => treeIds.has(l.from) && treeIds.has(l.to));
  const add = g => G.push(g);

  if (!model.root) add({ key: 'root', prio: 'haute', concerne: 'Fait ultime (dommage)', pourquoi: "La méthode construit l'arbre en partant du dommage : sans lui, aucun enchaînement ne peut être recherché.", question: 'Quel dommage corporel ou psychique a été constaté ? (nature et localisation, sans détail médical)', preuve: "Déclaration d'accident, constat du sauveteur secouriste du travail, registre des accidents bénins.", impact: "Bloquant : l'arbre ne peut pas être construit.", action: { type: 'goto', step: 5, label: "Définir le fait ultime dans l'arbre" } });
  else if (!ins(model.root, a).length) add({ key: 'root-ante', prio: 'haute', ref: model.root, concerne: `Fait ultime : « ${ft(model.root)} »`, pourquoi: 'Il faut rechercher ce qui a été nécessaire pour que le dommage se produise.', question: `Qu'a-t-il fallu pour que « ${ft(model.root)} » se produise ?`, preuve: 'Récit de la victime et des témoins, observation des lieux, photographies.', impact: "Bloquant : l'arbre se limite au dommage.", action: { type: 'ante', id: model.root, label: 'Ajouter un antécédent' } });

  const phaseHas = ph => F.some(f => f.chrono.phase === ph);
  if (!phaseHas('moment')) add({ key: 'chrono-moment', prio: 'haute', concerne: "Chronologie : moment de l'accident", pourquoi: "Le déroulement exact au moment de l'accident relie le dommage aux faits qui le précèdent.", question: "Que s'est-il passé exactement au moment de l'accident ? (geste, mouvement, contact)", preuve: 'Récit de la victime, témoignage, observation de la position des éléments.', impact: "Élevé : sans cette étape, le lien entre le dommage et ses antécédents ne peut pas être établi.", action: { type: 'collect', q: 'c4', label: 'Répondre dans le recueil' } });
  if (!phaseHas('justeavant')) add({ key: 'chrono-justeavant', prio: 'haute', concerne: "Chronologie : juste avant l'accident", pourquoi: "L'événement qui précède immédiatement l'accident est souvent la variation qui déclenche le processus.", question: "Quel événement s'est produit immédiatement avant l'accident ?", preuve: 'Témoignages, données machine (défauts, arrêts), photos de la situation.', impact: "Élevé : l'enchaînement immédiat reste inconnu.", action: { type: 'collect', q: 'c3', label: 'Répondre dans le recueil' } });
  if (!phaseHas('habituel') && !F.some(f => f.questionId === 'me2' || f.questionId === 'me4')) add({ key: 'usual', prio: 'moyenne', concerne: 'Travail habituel', pourquoi: "La méthode s'appuie sur ce qui était inhabituel (« variations ») : il faut connaître le déroulement habituel pour les repérer.", question: 'Comment ce travail se déroule-t-il habituellement, du point de vue de la victime et de ses collègues ?', preuve: 'Entretien avec les opérateurs du poste, fiche de poste, mode opératoire.', impact: 'Moyen : certaines variations peuvent passer inaperçues.', action: { type: 'collect', q: 'c0', label: 'Répondre dans le recueil' } });
  if (!phaseHas('avant')) add({ key: 'chrono-avant', prio: 'moyenne', concerne: "Chronologie : avant l'accident", pourquoi: "Les faits antérieurs permettent de remonter le plus en amont possible (organisation, préparation du travail).", question: "Que faisait la victime avant l'accident et quelle opération devait-elle réaliser ?", preuve: 'Planning, ordre de travail, témoignages.', impact: "Moyen : l'analyse risque de se limiter aux faits proches du dommage.", action: { type: 'collect', q: 'c1', label: 'Répondre dans le recueil' } });

  // Contradictions ouvertes
  a.contradictions.filter(c => c.status === 'ouverte').forEach(c => add({ key: 'con-' + c.id, prio: 'haute', concerne: 'Contradiction entre : ' + c.factIds.map(id => '« ' + ft(id) + ' »').join(' / '), pourquoi: "Des informations incompatibles ne peuvent pas être retenues ensemble dans l'arbre.", question: c.description ? `Laquelle de ces informations est exacte ? (${trunc(c.description, 120)})` : 'Laquelle de ces informations est exacte, et sur quel élément repose cette conclusion ?', preuve: 'Nouvel entretien croisé, photographie, document daté, observation sur place.', impact: 'Élevé : les faits concernés sont exclus de l\'arbre retenu tant que la contradiction n\'est pas résolue.', action: { type: 'resolve', id: c.id, label: 'Résoudre la contradiction' } }));

  // Statuts des faits placés dans l'arbre
  F.forEach(f => {
    const st = effStatus(f, a); const inT = treeIds.has(f.id);
    if (inT && st === 'hypothese') add({ key: 'hyp-' + f.id, prio: 'haute', ref: f.id, concerne: `Hypothèse placée dans l'arbre de travail : « ${ft(f.id)} »`, pourquoi: "Une hypothèse n'est pas un fait établi : elle ne peut pas figurer dans l'arbre retenu.", question: `Quel élément permet de confirmer ou d'écarter : « ${ft(f.id)} » ?`, preuve: 'Constat sur place, document, témoignage précis, mesure.', impact: "Élevé : la branche concernée reste provisoire.", action: { type: 'edit', id: f.id, label: 'Mettre à jour ce fait' } });
    if (inT && st === 'averifier') add({ key: 'ver-' + f.id, prio: 'haute', ref: f.id, concerne: `Information à vérifier dans l'arbre : « ${ft(f.id)} »`, pourquoi: "Son exactitude conditionne les liens dans lesquels elle intervient.", question: `Comment vérifier : « ${ft(f.id)} » ? Qui peut le confirmer ?`, preuve: 'Témoignage d\'une autre personne, photo, document, observation de l\'équipement.', impact: 'Élevé : le fait est exclu de l\'arbre retenu tant qu\'il n\'est pas vérifié.', action: { type: 'edit', id: f.id, label: 'Mettre à jour ce fait' } });
    if (st === 'manquant') add({ key: 'man-' + f.id, prio: inT ? 'haute' : 'moyenne', ref: f.id, concerne: `Information manquante : « ${ft(f.id)} »`, pourquoi: 'Cet élément a été identifié comme nécessaire à la compréhension de l\'accident.', question: `Pouvez-vous fournir l'information suivante : « ${ft(f.id)} » ?`, preuve: 'Selon le cas : photo, relevé de réglage, fiche de maintenance, témoignage.', impact: inT ? 'Élevé : un maillon de l\'arbre reste inconnu.' : 'Moyen.', action: { type: 'edit', id: f.id, label: 'Compléter ce fait' } });
  });

  // Indépendance (conjonction / disjonction)
  independenceIssues(a).forEach(i => add({ key: `ind-${i.type}-${i.at}-${i.a}-${i.b}`, prio: 'haute', concerne: `${i.type === 'conjonction' ? 'Conjonction' : 'Disjonction'} au niveau de « ${ft(i.at)} »`, pourquoi: `Selon la méthode, les faits d'une ${i.type} doivent être indépendants l'un de l'autre. Or « ${ft(i.a)} » et « ${ft(i.b)} » sont déjà reliés par un enchaînement.`, question: 'Ce lien direct est-il justifié, ou faut-il le supprimer et conserver seulement l\'enchaînement existant ?', preuve: 'Relecture de l\'arbre par le groupe d\'analyse.', impact: 'Élevé : bloque la validation de l\'arbre.', action: { type: 'goto', step: 5, label: 'Ouvrir l\'arbre' } }));

  // Liens
  L.forEach(l => {
    const lbl = `Lien « ${ft(l.from)} » → « ${ft(l.to)} »`;
    if (l.necessity !== 'confirmee') add({ key: 'nec-' + l.id, prio: 'moyenne', concerne: lbl, pourquoi: "Chaque lien doit traduire une relation de nécessité : l'antécédent a-t-il été nécessaire pour que le fait se produise ?", question: `Sans « ${ft(l.from)} », « ${ft(l.to)} » se serait-il produit ?`, preuve: 'Discussion en groupe d\'analyse à partir des faits recueillis.', impact: 'Moyen : ce lien bloque la validation de l\'arbre tant qu\'il n\'est pas confirmé.', action: { type: 'link', id: l.id, label: 'Examiner le lien' } });
    if (l.uncertain) add({ key: 'unc-' + l.id, prio: 'moyenne', concerne: lbl + ' (trait en pointillé)', pourquoi: "Une incertitude subsiste sur la façon dont ce fait est apparu.", question: `Quels éléments permettent de préciser comment « ${ft(l.to)} » s'est produit ?`, preuve: 'Témoignage, essai ou observation de l\'équipement à l\'arrêt, documents de maintenance.', impact: 'Moyen : la relation reste incertaine dans le dossier.', action: { type: 'link', id: l.id, label: 'Examiner le lien' } });
    const ci = chronoIssue(l, a);
    if (ci) add({ key: 'chr-' + l.id, prio: 'moyenne', concerne: lbl, pourquoi: 'La chronologie enregistrée semble incompatible avec le sens du lien. ' + ci, question: "L'ordre des faits est-il exact ? Sinon, lequel faut-il corriger ?", preuve: 'Horaires, enregistrements machine, témoignages datés.', impact: 'Moyen : le lien ou la chronologie doit être corrigé.', action: { type: 'link', id: l.id, label: 'Examiner le lien' } });
  });

  // Faits de l'arbre : variations sans antécédent, formulation, source
  F.filter(f => treeIds.has(f.id)).forEach(f => {
    if (f.kind === 'variation' && f.id !== model.root && !ins(f.id, a).length && isEst(f, a)) add({ key: 'leaf-' + f.id, prio: 'moyenne', ref: f.id, concerne: `Variation sans antécédent : « ${ft(f.id)} »`, pourquoi: "La méthode cherche à remonter le plus en amont possible : comment cette variation est-elle apparue ?", question: `Qu'a-t-il fallu pour que « ${ft(f.id)} » se produise ?`, preuve: 'Entretien avec l\'encadrement, la maintenance, les méthodes ; documents d\'organisation.', impact: "Moyen : l'analyse s'arrête à ce fait. Le groupe peut décider, de façon pragmatique, d'arrêter ici (écarter ce point en le justifiant).", action: { type: 'ante', id: f.id, label: 'Ajouter un antécédent' } });
    const w = wordingIssues(f.text);
    if (w.length) add({ key: 'wd-' + f.id, prio: 'moyenne', ref: f.id, concerne: `Formulation : « ${ft(f.id)} »`, pourquoi: w.join(' '), question: 'Quels faits observables cette formulation recouvre-t-elle ?', preuve: 'Description précise de ce qui a été vu, entendu ou mesuré.', impact: 'Moyen : une formulation imprécise ou un jugement fausse la lecture de l\'arbre.', action: { type: 'edit', id: f.id, label: 'Reformuler' } });
    if ((f.source?.type || 'apreciser') === 'apreciser') add({ key: 'src-' + f.id, prio: 'moyenne', ref: f.id, concerne: `Provenance non précisée : « ${ft(f.id)} »`, pourquoi: 'Chaque fait doit avoir une provenance identifiable.', question: 'Qui a rapporté cette information, ou sur quel document / constat repose-t-elle ?', preuve: 'Fonction de la personne, référence du document.', impact: 'Moyen : traçabilité incomplète.', action: { type: 'edit', id: f.id, label: 'Préciser la source' } });
  });
  const undet = F.filter(f => treeIds.has(f.id) && f.kind === 'indetermine');
  if (undet.length) add({ key: 'kind', prio: 'faible', concerne: `${undet.length} fait(s) de l'arbre sans distinction habituel / inhabituel`, list: undet.map(f => f.id), pourquoi: "La méthode distingue les états (habituels, rectangles) et les variations (inhabituelles, cercles) : les variations guident l'analyse.", question: 'Pour chacun de ces faits : était-ce la situation habituelle ou un écart par rapport à l\'habituel ?', preuve: 'Témoignage des opérateurs habituels du poste.', impact: 'Faible : la représentation graphique reste incomplète.', action: { type: 'goto', step: 5, label: 'Ouvrir l\'arbre' } });

  // Faits établis non placés
  const orphans = F.filter(f => !treeIds.has(f.id) && isEst(f, a));
  if (orphans.length && model.root) add({ key: 'orphans', prio: 'faible', concerne: `${orphans.length} fait(s) établi(s) non placé(s) dans l'arbre`, list: orphans.map(f => f.id), pourquoi: "Un fait recueilli peut avoir contribué à l'accident ; il peut aussi être sans rapport.", question: "Ces faits ont-ils été nécessaires à l'un des faits de l'arbre ? Si oui, lequel ?", preuve: 'Discussion en groupe d\'analyse.', impact: 'Faible : à examiner, sans obligation de tout placer.', action: { type: 'goto', step: 5, label: 'Ouvrir l\'arbre' } });

  // 5M non renseignés (sans chercher à tout remplir)
  const emptyFam = Object.keys(M5_Q).filter(k => !a.m5[k]?.na && !F.some(f => f.family === k));
  if (emptyFam.length && F.length) add({ key: 'm5', prio: 'faible', concerne: 'Familles du questionnement 5M sans information : ' + emptyFam.map(k => FAMILIES[k].label).join(', '), pourquoi: "Ces familles aident à ne rien oublier. Elles peuvent être sans objet pour cet accident : il n'est pas nécessaire de les remplir artificiellement.", question: 'Ces familles apportent-elles des faits utiles ? Sinon, marquez-les « sans objet ».', preuve: '—', impact: 'Faible.', action: { type: 'collectTab', tab: 'm5', label: 'Ouvrir le questionnement 5M' } });

  // Pièces jointes
  a.attachments.filter(x => x.kind === 'document' && x.extract && !['ok', 'manuel'].includes(x.extract.status)).forEach(x => add({ key: 'doc-' + x.id, prio: 'moyenne', concerne: `Document non exploité : « ${trunc(x.name, 60)} »`, pourquoi: "Son contenu n'a pas pu être lu par l'application : il n'a donc pas été pris en compte.", question: 'Pouvez-vous copier le texte utile de ce document, ou fournir une version TXT, DOCX ou PDF texte ?', preuve: 'Texte du document.', impact: 'Moyen : des faits utiles peuvent manquer.', action: { type: 'goto', step: 3, label: 'Ouvrir les documents' } }));
  const ph = a.attachments.filter(x => x.kind === 'photo' && !String(x.observation || '').trim());
  if (ph.length) add({ key: 'photos', prio: 'faible', concerne: `${ph.length} photographie(s) sans description de ce qu'elle(s) permet(tent) d'observer`, pourquoi: "Une photo n'est exploitable que si l'on précise ce qu'elle montre réellement.", question: 'Que voit-on précisément sur ces photos (élément, position, état) ?', preuve: '—', impact: 'Faible.', action: { type: 'goto', step: 3, label: 'Ouvrir les photos' } });

  a.whys.filter(w => w.stop && w.stop.reason === 'manque').forEach(w => add({ key: 'why-' + w.id, prio: 'moyenne', concerne: `Questionnement « pourquoi » interrompu : « ${trunc(w.subject, 70)} »`, pourquoi: "Le questionnement s'est arrêté faute d'information.", question: `Quelle information permettrait de répondre à la question : pourquoi « ${trunc(lastWhyText(w), 90)} » ?`, preuve: w.stop.note || 'Selon le cas : entretien, document, observation.', impact: 'Moyen.', action: { type: 'collectTab', tab: 'why', label: 'Ouvrir les 5 pourquoi' } }));

  const order = { haute: 0, moyenne: 1, faible: 2 };
  G.sort((x, y) => order[x.prio] - order[y.prio]);
  const dis = a.gapsDismissed || {};
  return { active: G.filter(g => !dis[g.key]), dismissed: G.filter(g => dis[g.key]) };
}
function lastWhyText(w) { const l = w.levels.filter(x => x.answer.trim()); return l.length ? l[l.length - 1].answer : w.subject; }
function confidence(gaps) {
  const h = gaps.filter(g => g.prio === 'haute').length, m = gaps.filter(g => g.prio === 'moyenne').length;
  if (h) return { lvl: 1, label: 'Confiance limitée', txt: `${h} point(s) de priorité haute restent à traiter.` };
  if (m) return { lvl: 2, label: 'Confiance moyenne', txt: `Aucun point de priorité haute ; ${m} point(s) de priorité moyenne.` };
  return { lvl: 3, label: 'Confiance satisfaisante', txt: 'Aucun point de priorité haute ou moyenne détecté par les contrôles automatiques.' };
}

/* =====================================================================
   Contrôle de l'arbre avant validation
   ===================================================================== */
function treeChecks(a = S.a) {
  const blocking = [], warnings = [];
  const work = graphModel(a, 'travail'), ret = graphModel(a, 'retenu');
  const ft = id => '« ' + trunc(factById(id, a)?.text, 70) + ' »';
  if (!work.root) blocking.push('Aucun fait ultime (dommage) n\'est défini.');
  else {
    const r = factById(work.root, a);
    if (!isEst(r, a)) blocking.push(`Le fait ultime ${ft(r.id)} n'est pas un fait établi (statut : ${STATUS[effStatus(r, a)].short}).`);
    if (!ins(work.root, a).length) blocking.push('Le fait ultime n\'a aucun antécédent.');
  }
  independenceIssues(a).forEach(i => blocking.push(`${i.type === 'conjonction' ? 'Conjonction' : 'Disjonction'} au niveau de ${ft(i.at)} : ${ft(i.a)} et ${ft(i.b)} ne sont pas indépendants.`));
  ret.links.forEach(l => { if (l.necessity !== 'confirmee') blocking.push(`Nécessité non confirmée pour le lien ${ft(l.from)} → ${ft(l.to)}.`); });
  if (work.excluded === undefined) { /* rien */ }
  const excl = ret.excluded;
  if (excl.length) warnings.push(`${excl.length} fait(s) de l'arbre de travail ne figurent pas dans l'arbre retenu (non établis, en contradiction, ou reliés au dommage uniquement par des faits non établis) : ${excl.map(ft).join(', ')}.`);
  ret.links.forEach(l => { if (l.uncertain) warnings.push(`Lien en pointillé (incertitude) : ${ft(l.from)} → ${ft(l.to)}.`); const c = chronoIssue(l, a); if (c) warnings.push(`Chronologie à vérifier pour ${ft(l.from)} → ${ft(l.to)} : ${c}`); });
  [...ret.nodeIds].forEach(id => {
    const f = factById(id, a);
    const w = wordingIssues(f.text); if (w.length) warnings.push(`Formulation à revoir : ${ft(id)}.`);
    if (f.kind === 'indetermine') warnings.push(`Type (état / variation) non précisé : ${ft(id)}.`);
    if ((f.source?.type || 'apreciser') === 'apreciser') warnings.push(`Source non précisée : ${ft(id)}.`);
  });
  return { blocking, warnings, ret };
}

/* =====================================================================
   Composants d'interface
   ===================================================================== */
function toast(msg, type = '', ms = 4500) {
  const el = document.createElement('div'); el.className = 'toast ' + type; el.textContent = msg;
  $('#toasts').appendChild(el); setTimeout(() => el.remove(), ms);
}
function stBadge(s) { const d = STATUS[s] || STATUS.rapporte; return `<span class="st st-${s}"><span class="g" aria-hidden="true">${d.g}</span>${esc(d.short)}</span>`; }
function factBadge(f, a = S.a) {
  const e = effStatus(f, a);
  return e === 'contradiction' && f.status !== 'contradiction' ? stBadge('contradiction') + ' <span class="xs muted">(saisi : ' + esc(STATUS[f.status].short) + ')</span>' : stBadge(e);
}
function kindTag(k) { return `<span class="kind ${k}"><i aria-hidden="true"></i>${esc(KINDS[k]?.short || '')}</span>`; }
function srcTxt(f) { const s = f.source || {}; return (SOURCES[s.type] || 'À préciser') + (s.detail ? ' – ' + s.detail : ''); }
function opts(obj, sel, labelFn) { return Object.entries(obj).map(([k, v]) => `<option value="${esc(k)}" ${k === sel ? 'selected' : ''}>${esc(labelFn ? labelFn(k, v) : (v.label || v))}</option>`).join(''); }

function modal({ title, body, buttons = [{ label: 'Fermer', value: 'close' }], wide = false, onOpen, onAction }) {
  return new Promise(resolve => {
    const d = document.createElement('dialog'); if (wide) d.className = 'wide';
    const tid = uid('dt'); d.setAttribute('aria-labelledby', tid);
    d.innerHTML = `<div class="dlg"><header><h2 id="${tid}">${esc(title)}</h2><button type="button" class="icon-btn" data-x aria-label="Fermer la fenêtre">✕</button></header><div class="dlg-body">${body}</div><footer>${buttons.map(b => `<button type="button" class="btn ${b.cls || ''}" data-v="${esc(b.value)}">${b.icon ? icon(b.icon) : ''}${esc(b.label)}</button>`).join('')}</footer></div>`;
    document.body.appendChild(d);
    let done = false;
    const finish = v => { if (done) return; done = true; try { d.close(); } catch (e) { } d.remove(); resolve(v); };
    d.addEventListener('cancel', e => { e.preventDefault(); finish(null); });
    d.addEventListener('click', async e => {
      if (e.target.closest('[data-x]')) { finish(null); return; }
      const b = e.target.closest('footer [data-v]'); if (!b) return;
      const v = b.dataset.v;
      if (onAction) { const r = await onAction(v, d); if (r === false) return; if (r !== undefined && r !== true) { finish(r); return; } }
      finish(v);
    });
    d.showModal();
    if (onOpen) onOpen(d);
    const ff = d.querySelector('.dlg-body [autofocus]') || d.querySelector('.dlg-body textarea, .dlg-body input:not([type=radio]):not([type=checkbox]), .dlg-body select');
    if (ff) ff.focus();
  });
}
async function confirmBox(text, { title = 'Confirmation', ok = 'Confirmer', danger = false } = {}) {
  const v = await modal({ title, body: `<p>${text}</p>`, buttons: [{ label: 'Annuler', value: 'no' }, { label: ok, value: 'yes', cls: danger ? 'danger solid' : 'primary' }] });
  return v === 'yes';
}
async function askText(title, label, { required = false, value = '', hint = '', multiline = false, ok = 'Valider' } = {}) {
  const id = uid('ask');
  const field = multiline ? `<textarea id="${id}" rows="3">${esc(value)}</textarea>` : `<input type="text" id="${id}" value="${esc(value)}">`;
  const v = await modal({
    title, body: `<div class="field"><label for="${id}">${esc(label)}</label>${field}${hint ? `<div class="hint">${esc(hint)}</div>` : ''}<div class="err" id="${id}-e" role="alert" hidden>Ce champ est obligatoire.</div></div>`,
    buttons: [{ label: 'Annuler', value: 'cancel' }, { label: ok, value: 'ok', cls: 'primary' }],
    onAction: (v, d) => { if (v !== 'ok') return; const t = d.querySelector('#' + id).value.trim(); if (required && !t) { d.querySelector('#' + id + '-e').hidden = false; d.querySelector('#' + id).setAttribute('aria-invalid', 'true'); return false; } return { text: t }; }
  });
  return v && typeof v === 'object' ? v.text : null;
}

/* ---------------- Éditeur de fait ---------------- */
async function factEditor(fid, defaults = {}, opt = {}) {
  const isNew = !fid;
  const base = isNew ? newFact(defaults) : clone(factById(fid));
  if (!base) return null;
  const atts = S.a.attachments;
  const linkedAtt = isNew ? (defaults._att || []) : atts.filter(x => x.factIds.includes(fid)).map(x => x.id);
  const body = `
  ${opt.intro ? `<div class="note info">${icon('info')}<div>${opt.intro}</div></div>` : ''}
  <div class="field"><label for="fe-text">Description du fait <span class="muted">(obligatoire)</span></label>
    <textarea id="fe-text" rows="3" aria-describedby="fe-text-h fe-check" autofocus>${esc(base.text)}</textarea>
    <div class="hint" id="fe-text-h">Une seule information, concise, observable ou vérifiable. Pas de jugement, pas d'interprétation, pas de « manque de… ».</div>
    <div class="err" id="fe-text-err" role="alert" hidden>Décrivez le fait.</div>
    <div class="check-msgs" id="fe-check" aria-live="polite"></div></div>
  <fieldset style="margin-top:12px"><legend>Statut de l'information</legend><div class="radio-cards">
    ${['rapporte', 'corrobore', 'averifier', 'manquant', 'hypothese'].map(s => `<label><input type="radio" name="fe-st" value="${s}" ${base.status === s ? 'checked' : ''}><span>${stBadge(s)}<br><span class="xs muted">${esc(STATUS[s].help)}</span></span></label>`).join('')}
  </div><div class="hint">Le statut « Contradiction » est attribué automatiquement quand une contradiction est signalée. Un fait rapporté ne devient jamais corroboré automatiquement.</div></fieldset>
  <div class="field" style="margin-top:10px"><label for="fe-ev">Élément probant <span class="muted" id="fe-ev-req">(obligatoire pour un fait corroboré)</span></label>
    <textarea id="fe-ev" rows="2" placeholder="Ex. : photo n°2 montrant le carter ouvert ; rapport de maintenance du 12/03">${esc(base.evidence)}</textarea>
    <div class="err" id="fe-ev-err" role="alert" hidden>Indiquez l'élément probant qui confirme ce fait, ou choisissez un autre statut.</div></div>
  <div class="grid g2" style="margin-top:10px">
    <div class="field"><label for="fe-kind">Habituel ou inhabituel ?</label><select id="fe-kind">${opts(KINDS, base.kind)}</select><div class="hint">Variation = écart par rapport à l'habituel (cercle). État = situation habituelle (rectangle).</div></div>
    <div class="field"><label for="fe-fam">Famille (5M)</label><select id="fe-fam">${opts(FAMILIES, base.family, (k, v) => v.label + (k !== 'NC' ? ' (INRS : ' + v.inrs + ')' : ''))}</select></div>
    <div class="field"><label for="fe-phase">Moment dans la chronologie</label><select id="fe-phase">${opts(PHASES, base.chrono.phase || '')}</select></div>
    <div class="grid g2" style="gap:10px">
      <div class="field"><label for="fe-order">N° d'ordre</label><input type="number" id="fe-order" min="0" step="1" value="${base.chrono.order ?? ''}"><div class="hint">1, 2, 3… dans l'ordre des événements</div></div>
      <div class="field"><label for="fe-moment">Heure / moment</label><input type="text" id="fe-moment" value="${esc(base.chrono.moment || '')}" placeholder="ex. vers 9 h 40"></div>
    </div>
    <div class="field"><label for="fe-src">Source de l'information</label><select id="fe-src">${opts(SOURCES, base.source.type || 'apreciser')}</select></div>
    <div class="field"><label for="fe-srcd">Précision sur la source</label><input type="text" id="fe-srcd" value="${esc(base.source.detail || '')}" placeholder="Fonction, document… (pas de nom de personne)"></div>
    <div class="field"><label for="fe-cert">Degré de certitude</label><select id="fe-cert">${opts(CERTAINTY, base.certainty)}</select></div>
  </div>
  ${atts.length ? `<fieldset style="margin-top:10px"><legend>Photos et documents associés</legend><div class="radio-list">${atts.map(x => `<label><input type="checkbox" name="fe-att" value="${x.id}" ${linkedAtt.includes(x.id) ? 'checked' : ''}> ${x.kind === 'photo' ? '📷' : '📄'} ${esc(x.caption || x.name)}</label>`).join('')}</div></fieldset>` : ''}
  <div class="field" style="margin-top:10px"><label for="fe-notes">Observations complémentaires</label><textarea id="fe-notes" rows="2">${esc(base.notes)}</textarea></div>
  ${!isNew ? `<div class="field" style="margin-top:10px"><label for="fe-reason">Motif de la modification</label><input type="text" id="fe-reason" placeholder="Ex. : précision apportée par le chef d'équipe"><div class="hint">L'ancienne version est conservée dans l'historique du fait.</div></div>` : ''}`;
  const res = await modal({
    title: isNew ? 'Nouveau fait' : 'Modifier le fait', body, wide: true,
    buttons: [{ label: 'Annuler', value: 'cancel' }, { label: isNew ? 'Enregistrer le fait' : 'Enregistrer les modifications', value: 'save', cls: 'primary', icon: 'check' }],
    onOpen: d => {
      const upd = () => {
        const t = d.querySelector('#fe-text').value; const w = wordingIssues(t);
        d.querySelector('#fe-check').innerHTML = w.map(m => `<div>⚠ ${esc(m)}</div>`).join('');
        const st = d.querySelector('input[name=fe-st]:checked')?.value;
        d.querySelector('#fe-ev-req').textContent = st === 'corrobore' ? '(obligatoire pour un fait corroboré)' : '(facultatif)';
      };
      d.querySelector('#fe-text').addEventListener('input', upd);
      d.querySelectorAll('input[name=fe-st]').forEach(r => r.addEventListener('change', upd)); upd();
    },
    onAction: (v, d) => {
      if (v !== 'save') return;
      const g = s => d.querySelector(s);
      const text = g('#fe-text').value.trim(); const status = g('input[name=fe-st]:checked')?.value || 'rapporte';
      const evidence = g('#fe-ev').value.trim();
      let ok = true;
      g('#fe-text-err').hidden = !!text; g('#fe-text').setAttribute('aria-invalid', !text); if (!text) ok = false;
      const evBad = status === 'corrobore' && !evidence;
      g('#fe-ev-err').hidden = !evBad; g('#fe-ev').setAttribute('aria-invalid', evBad); if (evBad) ok = false;
      if (!ok) { (text ? g('#fe-ev') : g('#fe-text')).focus(); return false; }
      const ord = g('#fe-order').value;
      const vals = {
        text, status, evidence, kind: g('#fe-kind').value, family: g('#fe-fam').value,
        'chrono.phase': g('#fe-phase').value, 'chrono.order': ord === '' ? null : Number(ord), 'chrono.moment': g('#fe-moment').value.trim(),
        'source.type': g('#fe-src').value, 'source.detail': g('#fe-srcd').value.trim(), certainty: g('#fe-cert').value, notes: g('#fe-notes').value.trim()
      };
      const attSel = $$('input[name=fe-att]:checked', d).map(i => i.value);
      let id;
      if (isNew) {
        const f = newFact({ origin: base.origin, questionId: base.questionId });
        Object.entries(vals).forEach(([p, x]) => setPath(f, p, x));
        addFact(f, opt.why); id = f.id;
      } else {
        updateFact(fid, vals, g('#fe-reason').value.trim()); id = fid;
      }
      atts.forEach(x => {
        const has = x.factIds.includes(id), want = attSel.includes(x.id);
        if (has && !want) { x.factIds = x.factIds.filter(i => i !== id); log('piece', `Pièce « ${trunc(x.caption || x.name, 40)} » dissociée du fait « ${trunc(text, 50)} »`); }
        if (!has && want) { x.factIds.push(id); log('piece', `Pièce « ${trunc(x.caption || x.name, 40)} » associée au fait « ${trunc(text, 50)} »`); }
      });
      changed();
      return { id };
    }
  });
  return res && typeof res === 'object' ? res.id : null;
}

/* ---------------- Contradictions ---------------- */
async function contradictionDialog(fid) {
  const f = factById(fid);
  const others = liveFacts().filter(x => x.id !== fid);
  if (!others.length) { toast('Il faut au moins deux faits pour signaler une contradiction.', 'warn'); return; }
  const v = await modal({
    title: 'Signaler une contradiction', wide: true,
    body: `<p>Fait concerné : <b>« ${esc(f.text)} »</b></p>
    <fieldset><legend>Avec quel(s) fait(s) est-il incompatible ?</legend><input type="search" id="cd-q" placeholder="Filtrer…" aria-label="Filtrer les faits" style="margin-bottom:8px">
    <div class="radio-list" id="cd-list" style="max-height:260px;overflow:auto">${others.map(o => `<label data-t="${esc(o.text.toLowerCase())}"><input type="checkbox" value="${o.id}"> <span>${esc(o.text)} ${factBadge(o)}</span></label>`).join('')}</div>
    <div class="err" id="cd-e1" role="alert" hidden>Sélectionnez au moins un fait.</div></fieldset>
    <div class="field" style="margin-top:10px"><label for="cd-desc">En quoi ces informations sont-elles incompatibles ?</label><textarea id="cd-desc" rows="2" placeholder="Ex. : le témoin 1 situe le poussoir sur l'établi, le témoin 2 sur son support."></textarea></div>
    <div class="note warn">${icon('alert')}<div>Tant que la contradiction n'est pas résolue, les faits concernés sont signalés et exclus de l'arbre retenu. Aucun fait n'est supprimé.</div></div>`,
    buttons: [{ label: 'Annuler', value: 'cancel' }, { label: 'Signaler la contradiction', value: 'ok', cls: 'primary' }],
    onOpen: d => { d.querySelector('#cd-q').addEventListener('input', e => { const q = e.target.value.toLowerCase(); $$('#cd-list label', d).forEach(l => l.hidden = !l.dataset.t.includes(q)); }); },
    onAction: (v, d) => {
      if (v !== 'ok') return;
      const sel = $$('#cd-list input:checked', d).map(i => i.value);
      if (!sel.length) { d.querySelector('#cd-e1').hidden = false; return false; }
      const c = { id: uid('c'), factIds: [fid, ...sel], description: d.querySelector('#cd-desc').value.trim(), status: 'ouverte', createdAt: nowISO(), resolution: null };
      S.a.contradictions.push(c);
      log('contradiction', `Contradiction signalée entre ${c.factIds.length} faits : ${c.factIds.map(i => '« ' + trunc(factById(i).text, 40) + ' »').join(' / ')}`);
      if (c.factIds.some(i => inTree(i))) treeTouched('contradiction signalée');
      changed(); return { ok: 1 };
    }
  });
  if (v) { toast('Contradiction enregistrée.', 'ok'); render(); }
}
async function resolveContradiction(cid) {
  const c = S.a.contradictions.find(x => x.id === cid); if (!c) return;
  const v = await modal({
    title: 'Résoudre la contradiction', wide: true,
    body: `${c.description ? `<p class="muted">${esc(c.description)}</p>` : ''}
    <p>Pour chaque fait, indiquez la conclusion retenue. Aucune donnée n'est effacée : les faits écartés restent consultables dans l'historique.</p>
    <table class="tbl"><thead><tr><th>Fait</th><th>Conclusion</th></tr></thead><tbody>${c.factIds.map(id => { const f = factById(id); return `<tr><td>${esc(f?.text || '(fait supprimé)')}<br>${f ? stBadge(f.status) : ''}</td><td><select data-f="${id}" aria-label="Conclusion pour ce fait"><option value="keep">Retenu (statut inchangé)</option><option value="verify">À vérifier</option><option value="drop">Écarté (retiré de l'analyse)</option></select></td></tr>`; }).join('')}</tbody></table>
    <div class="field" style="margin-top:12px"><label for="rc-txt">Sur quoi repose cette conclusion ? <span class="muted">(obligatoire)</span></label><textarea id="rc-txt" rows="2" placeholder="Ex. : photo prise par le chef d'équipe à 10 h montrant le poussoir sur son support."></textarea><div class="err" id="rc-e" role="alert" hidden>Indiquez l'élément qui permet de trancher.</div></div>
    <div class="grid g2" style="margin-top:8px"><div class="field"><label for="rc-src">Source</label><select id="rc-src">${opts(SOURCES, 'apreciser')}</select></div><div class="field"><label for="rc-srcd">Précision</label><input type="text" id="rc-srcd"></div></div>`,
    buttons: [{ label: 'Annuler', value: 'cancel' }, { label: 'Enregistrer la résolution', value: 'ok', cls: 'primary' }],
    onAction: (v, d) => {
      if (v !== 'ok') return;
      const txt = d.querySelector('#rc-txt').value.trim();
      if (!txt) { d.querySelector('#rc-e').hidden = false; return false; }
      const decisions = {};
      $$('select[data-f]', d).forEach(s => decisions[s.dataset.f] = s.value);
      c.status = 'resolue'; c.resolution = { text: txt, source: { type: d.querySelector('#rc-src').value, detail: d.querySelector('#rc-srcd').value.trim() }, decisions, date: nowISO() };
      log('contradiction', `Contradiction résolue : ${txt}`);
      Object.entries(decisions).forEach(([id, dec]) => {
        if (dec === 'verify') updateFact(id, { status: 'averifier' }, 'Résolution de contradiction : ' + txt);
        if (dec === 'drop') deleteFact(id, 'Écarté lors de la résolution d\'une contradiction : ' + txt);
      });
      if (c.factIds.some(i => inTree(i))) treeTouched('résolution d\'une contradiction');
      changed(); return { ok: 1 };
    }
  });
  if (v) { toast('Contradiction résolue. Les éléments concernés ont été réexaminés.', 'ok'); render(); }
}

/* ---------------- Assistant de liaison (questionnement INRS) ---------------- */
async function linkWizard({ to = null, from = null }) {
  const mode = to ? 'ante' : 'cons';
  const fixed = factById(to || from);
  const L = activeLinks();
  const candidates = () => liveFacts().filter(f => {
    if (f.id === fixed.id) return false;
    if (mode === 'ante') return !L.some(l => l.from === f.id && l.to === to) && !isAncestor(to, f.id);
    return !L.some(l => l.from === from && l.to === f.id) && !isAncestor(f.id, from);
  }).sort((x, y) => (inTree(y.id) - inTree(x.id)) || ((PHASES[y.chrono.phase || '']?.rank ?? -1) - (PHASES[x.chrono.phase || '']?.rank ?? -1)));
  const existing = mode === 'ante' ? ins(to).map(l => factById(l.from)) : outs(from).map(l => factById(l.to));
  const listHTML = sel => candidates().map(f => `<label data-t="${esc(f.text.toLowerCase())}"><input type="radio" name="lw-f" value="${f.id}" ${sel === f.id ? 'checked' : ''}> <span>${esc(f.text)} ${factBadge(f)} ${kindTag(f.kind)}${inTree(f.id) ? ' <span class="pill">dans l\'arbre</span>' : ''}</span></label>`).join('') || '<p class="muted">Aucun fait disponible : saisissez un nouveau fait.</p>';
  const q = mode === 'ante'
    ? `Qu'a-t-il fallu pour que « ${esc(fixed.text)} » se produise ?`
    : `Pour quel fait « ${esc(fixed.text)} » a-t-il été nécessaire ?`;
  let newId = null;
  const res = await modal({
    title: mode === 'ante' ? 'Ajouter un antécédent' : 'Relier à un fait conséquent', wide: true,
    body: `<div class="note info">${icon('q')}<div><b>${q}</b><br><span class="small">Choisissez un fait recueilli ou saisissez-en un nouveau. N'ajoutez que des faits rapportés par l'entreprise : l'application n'invente aucun fait intermédiaire.</span></div></div>
    ${existing.length ? `<p class="small">${mode === 'ante' ? 'Antécédents déjà reliés' : 'Conséquents déjà reliés'} : ${existing.map(f => '« ' + esc(trunc(f.text, 60)) + ' »').join(', ')}. ${mode === 'ante' ? 'Le nouveau fait formera avec eux une <b>conjonction</b> (ET) : ils doivent être indépendants.' : 'Ce fait formera une <b>disjonction</b> (ET) : les conséquents doivent être indépendants.'}</p>` : ''}
    <fieldset><legend>1. Le fait ${mode === 'ante' ? 'antécédent' : 'conséquent'}</legend>
      <div class="row" style="margin-bottom:8px"><input type="search" id="lw-q" placeholder="Filtrer les faits…" aria-label="Filtrer les faits" style="flex:1;min-width:180px"><button type="button" class="btn sm" id="lw-new">${icon('plus')}Saisir un nouveau fait…</button></div>
      <div class="radio-list" id="lw-list" style="max-height:240px;overflow:auto">${listHTML(null)}</div>
      <div class="err" id="lw-e1" role="alert" hidden>Choisissez un fait.</div></fieldset>
    <fieldset style="margin-top:10px"><legend>2. Relation de nécessité</legend><div class="radio-list">
      <label><input type="radio" name="lw-n" value="confirmee"> <span><b>Oui</b> : sans ${mode === 'ante' ? 'ce fait' : '« ' + esc(trunc(fixed.text, 50)) + ' »'}, ${mode === 'ante' ? '« ' + esc(trunc(fixed.text, 50)) + ' »' : 'le fait choisi'} ne se serait pas produit.</span></label>
      <label><input type="radio" name="lw-n" value="a-verifier" checked> <span><b>À confirmer</b> par le groupe d'analyse.</span></label></div></fieldset>
    <fieldset style="margin-top:10px"><legend>3. Certitude sur la façon dont le fait est apparu</legend><div class="radio-list">
      <label><input type="radio" name="lw-u" value="0" checked> <span>Le lien est établi par les informations recueillies (trait plein).</span></label>
      <label><input type="radio" name="lw-u" value="1"> <span>Une part d'incertitude subsiste (trait en pointillé).</span></label></div></fieldset>
    <div class="field" style="margin-top:10px"><label for="lw-j">Sur quelles informations repose ce lien ? <span class="muted">(recommandé)</span></label><textarea id="lw-j" rows="2" placeholder="Ex. : récit de la victime ; photo n°1"></textarea></div>`,
    buttons: [{ label: 'Annuler', value: 'cancel' }, { label: 'Ajouter le lien', value: 'ok', cls: 'primary', icon: 'link' }],
    onOpen: d => {
      const filt = () => { const qq = d.querySelector('#lw-q').value.toLowerCase(); $$('#lw-list label', d).forEach(l => l.hidden = !l.dataset.t.includes(qq)); };
      d.querySelector('#lw-q').addEventListener('input', filt);
      d.querySelector('#lw-new').addEventListener('click', async () => {
        const defaults = mode === 'ante' ? { chrono: { phase: fixed.chrono.phase === 'dommage' ? 'moment' : (fixed.chrono.phase || ''), order: null, moment: '' } } : {};
        const id = await factEditor(null, Object.assign({ origin: { type: 'arbre' } }, defaults), { why: 'saisi lors de la construction de l\'arbre', intro: mode === 'ante' ? `Fait nécessaire pour que « ${esc(fixed.text)} » se produise.` : '' });
        if (id) { newId = id; d.querySelector('#lw-list').innerHTML = listHTML(id); d.querySelector('#lw-q').value = ''; d.querySelector('input[name=lw-f]:checked')?.scrollIntoView({ block: 'nearest' }); }
      });
    },
    onAction: async (v, d) => {
      if (v !== 'ok') return;
      const sel = d.querySelector('input[name=lw-f]:checked')?.value;
      if (!sel) { d.querySelector('#lw-e1').hidden = false; return false; }
      const x = mode === 'ante' ? sel : from, y = mode === 'ante' ? to : sel;
      // Indépendance (conjonction / disjonction)
      const siblings = mode === 'ante' ? ins(y).map(l => l.from) : outs(x).map(l => l.to);
      const other = mode === 'ante' ? x : y;
      const dep = siblings.find(s => isAncestor(s, other) || isAncestor(other, s));
      if (dep) {
        const okDep = await confirmBox(`« ${esc(trunc(factById(other).text, 70))} » et « ${esc(trunc(factById(dep).text, 70))} » sont déjà reliés par un enchaînement : ils ne sont pas indépendants. Selon la méthode, les faits d'une ${mode === 'ante' ? 'conjonction' : 'disjonction'} doivent être indépendants. Il est généralement préférable de ne pas créer ce lien direct.<br><br>Créer quand même ce lien ? Il sera signalé et bloquera la validation de l'arbre.`, { title: 'Faits non indépendants', ok: 'Créer quand même', danger: true });
        if (!okDep) return false;
      }
      const r = addLink(x, y, { necessity: d.querySelector('input[name=lw-n]:checked').value, uncertain: d.querySelector('input[name=lw-u]:checked').value === '1', justification: d.querySelector('#lw-j').value.trim() });
      if (r.err) { toast(r.err, 'bad'); return false; }
      return { link: r.link.id, x, y };
    }
  });
  if (!res || typeof res !== 'object') { if (newId) render(); return null; }
  S.sel = { type: 'fact', id: res.x };
  render();
  if (mode === 'ante') {
    const more = await modal({
      title: "A-t-il fallu autre chose ?",
      body: `<p>Pour que « <b>${esc(fixed.text)}</b> » se produise, a-t-il fallu <b>autre chose</b> que « ${esc(factById(res.x).text)} » ?</p><p class="small muted">Si oui, le fait suivant formera une conjonction (ET) : les deux faits, indépendants l'un de l'autre, auront été conjointement nécessaires.</p>`,
      buttons: [{ label: 'Je ne sais pas encore', value: 'later' }, { label: 'Non, rien d\'autre', value: 'no' }, { label: 'Oui, ajouter un autre fait (ET)', value: 'yes', cls: 'primary' }]
    });
    if (more === 'yes') return linkWizard({ to });
    if (more === 'later') { log('arbre', `Question « A-t-il fallu autre chose pour que « ${trunc(fixed.text, 50)} » ? » laissée en suspens`); changed(); }
  }
  return res;
}
