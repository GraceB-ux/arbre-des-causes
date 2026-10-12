'use strict';
/* =====================================================================
   Arbre des causes – application autonome
   Référence méthodologique : INRS ED 6163, « La méthode de l'arbre des
   causes – L'analyse de l'accident du travail », 3e édition (2025),
   révisée en novembre 2025.
   ===================================================================== */
const APP = { name: 'Arbre des causes', format: 'adc-ed6163-analyse', formatVersion: 1, build: '1.0.0' };
const INRS_URL = 'https://www.inrs.fr/media.html?refINRS=ED+6163';
const PDFJS_VER = '3.11.174';
const PDFJS_URL = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VER}/pdf.min.js`;
const PDFJS_WORKER = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VER}/pdf.worker.min.js`;
const API_ENTREPRISES = 'https://recherche-entreprises.api.gouv.fr/search';
const MAX_FILE = 30 * 1024 * 1024;

/* ---------------- Référentiels ---------------- */
const STATUS = {
  rapporte:     { label: 'Fait rapporté', short: 'Rapporté', g: 'R', help: "Information déclarée par l'entreprise, la victime ou un témoin." },
  corrobore:    { label: 'Fait corroboré', short: 'Corroboré', g: '✔', help: "Information confirmée par un élément probant communiqué (photo, document, constat sur place…). L'élément probant doit être indiqué." },
  averifier:    { label: 'Information à vérifier', short: 'À vérifier', g: '?', help: "Information dont l'exactitude reste incertaine." },
  manquant:     { label: 'Information manquante', short: 'Manquante', g: '∅', help: "Élément nécessaire à l'analyse qui n'a pas été fourni. Décrivez ce qui manque (ex. « Réglage du carter au moment de l'accident : inconnu »)." },
  contradiction:{ label: 'Contradiction', short: 'Contradiction', g: '!', help: "Des informations incompatibles ont été rapportées. Ce statut est attribué automatiquement lorsqu'une contradiction est signalée et non résolue." },
  hypothese:    { label: 'Hypothèse à examiner', short: 'Hypothèse', g: 'H', help: "Piste de questionnement, pas un fait établi. Une hypothèse n'entre jamais dans l'arbre retenu." }
};
const ESTABLISHED = ['rapporte', 'corrobore'];
const KINDS = {
  variation:  { label: 'Variation (fait inhabituel)', short: 'Variation', help: "Écart par rapport à l'habituel, du point de vue de l'opérateur. Représenté par un cercle." },
  etat:       { label: 'État (fait habituel, permanent)', short: 'État', help: "Fait habituel, préexistant à l'accident. Représenté par un rectangle." },
  indetermine:{ label: 'À déterminer', short: 'Type à préciser', help: "On ne sait pas encore si ce fait était habituel ou inhabituel." }
};
const FAMILIES = {
  MO: { label: "Main-d'œuvre", inrs: 'I – Individu', letter: 'M' },
  ME: { label: 'Méthodes', inrs: 'T/A – Tâche / activité', letter: 'M' },
  MA: { label: 'Matériel', inrs: 'Ma – Matériel', letter: 'M' },
  MI: { label: 'Milieu', inrs: 'Mi – Milieu', letter: 'M' },
  MT: { label: 'Matière', inrs: 'Ma – Matériel (matières, produits)', letter: 'M' },
  NC: { label: 'Non classé', inrs: '—', letter: '·' }
};
const PHASES = {
  habituel:   { label: 'Travail habituel', rank: 0 },
  avant:      { label: "Avant l'accident", rank: 1 },
  justeavant: { label: "Juste avant l'accident", rank: 2 },
  moment:     { label: "Au moment de l'accident", rank: 3 },
  dommage:    { label: 'Dommage constaté', rank: 4 },
  apres:      { label: "Juste après l'accident", rank: 5 },
  '':         { label: 'Non situé dans le temps', rank: -1 }
};
const SOURCES = {
  apreciser: 'À préciser',
  victime: 'Victime',
  temoin: 'Témoin',
  collegue: 'Collègue de travail',
  encadrement: 'Encadrement',
  maintenance: 'Service maintenance',
  observation: 'Observation sur les lieux',
  document: 'Document',
  photo: 'Photographie',
  donnees: 'Données machine / registre',
  groupe: "Groupe d'analyse",
  autre: 'Autre'
};
const CERTAINTY = { certain: 'Certain', probable: 'Probable', incertain: 'Incertain' };

const CHRONO_Q = [
  { id: 'c0', phase: 'habituel', q: 'Comment ce travail se déroule-t-il habituellement ?', ex: 'Ex. : « Le nettoyage se fait machine arrêtée, une fois par poste. »', help: "Décrire le travail tel qu'il se fait d'habitude aide à repérer ce qui était inhabituel ce jour-là." },
  { id: 'c1', phase: 'avant', q: "Que faisait la victime avant l'accident ?", ex: 'Ex. : « Elle alimentait la presse en tôles depuis 7 h 30. »' },
  { id: 'c2', phase: 'avant', q: 'Quelle opération devait-elle effectuer ?', ex: 'Ex. : « Changer la bobine de film de la banderoleuse. »' },
  { id: 'c7', phase: 'avant', q: "Qu'y avait-il d'inhabituel ce jour-là ?", ex: 'Ex. : « Pièce d\'un nouveau fournisseur », « remplaçant au poste », « panne du chariot ».', help: "Changement de matériel, de pièce, de personne, d'horaire, de méthode… Ces écarts sont appelés « variations »." },
  { id: 'c3', phase: 'justeavant', q: "Quel événement s'est produit immédiatement avant l'accident ?", ex: 'Ex. : « La pièce s\'est coincée dans le guide. »' },
  { id: 'c4', phase: 'moment', q: "Que s'est-il passé au moment de l'accident ?", ex: 'Ex. : « Sa main droite est entrée en contact avec la lame. »' },
  { id: 'c5', phase: 'dommage', q: 'Quel dommage a été constaté ?', ex: 'Ex. : « Coupure à l\'index gauche ».', help: 'Sans détail médical : indiquez seulement la nature et la localisation de la blessure.' },
  { id: 'c6', phase: 'apres', q: "Que s'est-il passé juste après l'accident ?", ex: 'Ex. : « Le chef d\'équipe a donné l\'alerte à 9 h 50. »' }
];
const M5_Q = {
  MO: [
    { id: 'mo1', q: 'Quelles personnes étaient présentes ?', ex: 'Indiquez les fonctions, pas les noms (ex. « 2 opérateurs, 1 régleur »).' },
    { id: 'mo2', q: 'Quelles tâches réalisaient-elles ?' },
    { id: 'mo3', q: 'Qui intervenait sur la situation de travail ?', ex: 'Ex. : « Un technicien de maintenance réglait la machine voisine. »' },
    { id: 'mo4', q: 'Quelles informations factuelles sont disponibles sur les compétences, la formation ou les consignes utiles à l\'analyse ?', ex: 'Ex. : « Formation au poste réalisée le 03/02 (fiche signée) », « 2e jour au poste ».' }
  ],
  ME: [
    { id: 'me1', q: 'Quelle opération était prévue ?' },
    { id: 'me2', q: 'Comment devait-elle être réalisée ?', ex: 'Mode opératoire, fiche de poste, habitude de l\'équipe…' },
    { id: 'me3', q: 'Quelle procédure ou consigne était applicable ?' },
    { id: 'me4', q: 'Comment le travail a-t-il réellement été effectué ?', ex: 'Décrivez le travail réel, même s\'il diffère de ce qui était prévu.' }
  ],
  MA: [
    { id: 'ma1', q: 'Quelle machine, quel équipement, quel outil ou quel produit était utilisé ?' },
    { id: 'ma2', q: 'Dans quel état se trouvait-il ?', ex: 'Ex. : « Lame changée la veille », « voyant de défaut allumé ».' },
    { id: 'ma3', q: 'Quels dispositifs de protection étaient présents et dans quelle configuration ?', ex: 'Ex. : « Carter ouvert à 90° », « barrage immatériel actif ».' },
    { id: 'ma4', q: 'Des opérations de réglage, de maintenance ou de dépannage étaient-elles en cours ?' }
  ],
  MI: [
    { id: 'mi1', q: 'Quelle était la configuration des lieux ?' },
    { id: 'mi2', q: "Quelles étaient les conditions d'éclairage, de circulation ou de visibilité ?" },
    { id: 'mi3', q: 'Quelles conditions ambiantes ou contraintes environnementales ont été rapportées ?', ex: 'Bruit, température, sol mouillé, poussières…' },
    { id: 'mi4', q: 'Y avait-il une coactivité ou une contrainte spatiale particulière ?' }
  ],
  MT: [
    { id: 'mt1', q: 'Quels matériaux, pièces, substances ou produits étaient manipulés ?' },
    { id: 'mt2', q: "Quelles étaient leurs caractéristiques utiles à la compréhension de l'accident ?", ex: 'Poids, dimensions, température, aspect…' },
    { id: 'mt3', q: 'Dans quel état se trouvaient-ils ?' },
    { id: 'mt4', q: 'Quels mouvements, transformations ou comportements ont été observés ?', ex: 'Ex. : « La palette a basculé vers l\'avant. »' }
  ]
};
const NAF_SECTIONS = {
  A: 'Agriculture, sylviculture et pêche', B: 'Industries extractives', C: 'Industrie manufacturière',
  D: "Production et distribution d'électricité, de gaz, de vapeur et d'air conditionné",
  E: "Production et distribution d'eau ; assainissement, gestion des déchets et dépollution", F: 'Construction',
  G: "Commerce ; réparation d'automobiles et de motocycles", H: 'Transports et entreposage', I: 'Hébergement et restauration',
  J: 'Information et communication', K: "Activités financières et d'assurance", L: 'Activités immobilières',
  M: 'Activités spécialisées, scientifiques et techniques', N: 'Activités de services administratifs et de soutien',
  O: 'Administration publique', P: 'Enseignement', Q: 'Santé humaine et action sociale', R: 'Arts, spectacles et activités récréatives',
  S: 'Autres activités de services', T: "Activités des ménages en tant qu'employeurs", U: 'Activités extra-territoriales'
};
/* Critères de choix des mesures de prévention (INRS ED 6163, étape 2) */
const CRITERIA = [
  { id: 'regl', q: 'Conforme à la réglementation ?' },
  { id: 'stable', q: 'Stable dans le temps ?' },
  { id: 'integ', q: 'Facilement intégrable dans le travail quotidien ?' },
  { id: 'deplace', q: "N'entraîne pas de déplacement du risque ni de nouveau risque ?" },
  { id: 'portee', q: "Portée : applicable à d'autres postes ou ateliers ?" },
  { id: 'profond', q: 'Agit sur les causes profondes (faits en amont) ?' },
  { id: 'delai', q: "Délai d'application connu et réaliste ?" }
];
const LEVELS = {
  technique: 'Solution technique / protection collective',
  organisation: 'Organisation (moyens, compétences, outils de maîtrise)',
  strategie: "Intégration de la prévention dans la stratégie de l'entreprise",
  reaction: 'Réaction à l\'événement (EPI, consignes)'
};

/* ---------------- Utilitaires ---------------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function uid(p) { return p + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
const nowISO = () => new Date().toISOString();
function fmtDT(iso) { if (!iso) return ''; const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }); }
function fmtD(iso) { if (!iso) return ''; const d = new Date(iso.length === 10 ? iso + 'T12:00:00' : iso); return isNaN(d) ? iso : d.toLocaleDateString('fr-FR'); }
function fmtSize(n) { if (n == null) return ''; if (n < 1024) return n + ' o'; if (n < 1048576) return (n / 1024).toFixed(0) + ' Ko'; return (n / 1048576).toFixed(1) + ' Mo'; }
function icon(id, cls = '') { return `<svg class="${cls}" aria-hidden="true"><use href="#i-${id}"/></svg>`; }
function clone(o) { return JSON.parse(JSON.stringify(o)); }
function trunc(s, n) { s = String(s || ''); return s.length > n ? s.slice(0, n - 1) + '…' : s; }
function getPath(o, p) { return p.split('.').reduce((x, k) => (x == null ? x : x[k]), o); }
function setPath(o, p, v) { const ks = p.split('.'); let x = o; ks.slice(0, -1).forEach(k => { if (x[k] == null) x[k] = {}; x = x[k]; }); x[ks[ks.length - 1]] = v; }
function slug(s) { return String(s || 'analyse').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'analyse'; }
function stamp() { const d = new Date(); const p = n => String(n).padStart(2, '0'); return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`; }
function download(name, content, mime) {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mime || 'application/octet-stream' });
  const url = URL.createObjectURL(blob); const a = document.createElement('a');
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
function safeImg(src) { return typeof src === 'string' && /^data:image\/(png|jpe?g|gif|webp);base64,/i.test(src) ? src : ''; }

/* ---------------- État global ---------------- */
const S = {
  a: null, step: 0, collectTab: 'chrono', factFilter: { status: '', family: '', q: '', showDeleted: false },
  sel: null, vp: { k: 1, x: 0, y: 0 }, needFit: true, dbOK: false, list: [], saveTimer: null, pdfConsent: false, lastLayout: null
};
const STEPS = [
  { id: 'home', label: 'Accueil' },
  { id: 'ctx', label: 'Entreprise & accident' },
  { id: 'collect', label: 'Recueil des faits' },
  { id: 'files', label: 'Photos & documents' },
  { id: 'synth', label: 'Synthèse' },
  { id: 'tree', label: 'Arbre des causes' },
  { id: 'gaps', label: 'Compléments' },
  { id: 'hist', label: 'Historique' },
  { id: 'final', label: 'Prévention & dossier' }
];

/* ---------------- Stockage local (IndexedDB) ---------------- */
const DB = {
  db: null,
  open() {
    return new Promise(res => {
      try {
        const r = indexedDB.open('adc-ed6163', 1);
        r.onupgradeneeded = () => { r.result.createObjectStore('analyses', { keyPath: 'id' }); };
        r.onsuccess = () => { this.db = r.result; res(true); };
        r.onerror = () => res(false); r.onblocked = () => res(false);
      } catch (e) { res(false); }
    });
  },
  req(mode, fn) {
    return new Promise((res, rej) => {
      try { const st = this.db.transaction('analyses', mode).objectStore('analyses'); const r = fn(st); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }
      catch (e) { rej(e); }
    });
  },
  put(a) { return this.req('readwrite', st => st.put(a)); },
  get(id) { return this.req('readonly', st => st.get(id)); },
  all() { return this.req('readonly', st => st.getAll()); },
  del(id) { return this.req('readwrite', st => st.delete(id)); },
  clear() { return this.req('readwrite', st => st.clear()); }
};
function setSaveState(state, text) {
  const el = $('#save-state'); if (!el) return;
  el.className = 'save-state ' + state; el.innerHTML = `<span class="dot"></span><span>${esc(text)}</span>`;
}
function scheduleSave() {
  if (!S.a) return;
  setSaveState('pending', 'Enregistrement…');
  clearTimeout(S.saveTimer);
  S.saveTimer = setTimeout(saveNow, 600);
}
async function saveNow() {
  clearTimeout(S.saveTimer);
  if (!S.a) return;
  if (!S.dbOK) { setSaveState('error', 'Stockage local indisponible – exportez la sauvegarde'); return; }
  try { await DB.put(S.a); setSaveState('', 'Enregistré sur cet appareil à ' + new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })); }
  catch (e) {
    const quota = e && /quota/i.test(e.name + e.message);
    setSaveState('error', quota ? 'Espace de stockage plein' : 'Échec de l\'enregistrement');
    toast(quota ? "L'espace de stockage du navigateur est plein (photos ou documents trop volumineux). Exportez la sauvegarde .json puis supprimez des pièces jointes." : "L'enregistrement local a échoué. Exportez une sauvegarde .json pour ne rien perdre.", 'bad', 9000);
  }
}
function changed() { if (!S.a) return; S.a.updatedAt = nowISO(); scheduleSave(); }
function log(type, text) { if (!S.a) return; S.a.journal.push({ date: nowISO(), type, text }); }
function treeTouched(reason) {
  const t = S.a.tree;
  if (t.status === 'valide') { t.status = 'provisoire'; log('arbre', `L'arbre validé (v${t.validatedVersion}) redevient provisoire : ${reason}`); toast("L'arbre validé redevient provisoire suite à cette modification.", 'warn'); }
}

/* ---------------- Modèle ---------------- */
function blankAnalysis() {
  const t = nowISO();
  const m5 = {}; Object.keys(M5_Q).forEach(k => m5[k] = { na: false, naReason: '', custom: [] });
  return {
    format: APP.format, formatVersion: APP.formatVersion, id: uid('an'), createdAt: t, updatedAt: t, fictif: false,
    company: { raisonSociale: '', siret: '', etablissement: '', secteur: '' }, external: null,
    accident: { date: '', heure: '', lieu: '', poste: '', tache: '', description: '', dommage: '' },
    facts: [], links: [], contradictions: [], whys: [], m5, attachments: [], gapsDismissed: {}, complements: [],
    tree: { rootId: null, status: 'provisoire', validatedVersion: null, validatedAt: null, view: 'travail', orient: 'h' },
    versions: [], journal: [{ date: t, type: 'analyse', text: 'Création de l\'analyse' }], prevention: [], notes: {}, limites: ''
  };
}
function normalize(a) { // complète une analyse importée ou ancienne
  const b = blankAnalysis();
  for (const k of Object.keys(b)) if (a[k] === undefined) a[k] = b[k];
  a.company = Object.assign(b.company, a.company); a.accident = Object.assign(b.accident, a.accident);
  a.tree = Object.assign(b.tree, a.tree); a.m5 = Object.assign(b.m5, a.m5);
  ['facts', 'links', 'contradictions', 'whys', 'attachments', 'complements', 'versions', 'journal', 'prevention'].forEach(k => { if (!Array.isArray(a[k])) a[k] = []; });
  a.facts.forEach(f => { f.history = f.history || []; f.attachmentIds = f.attachmentIds || []; f.chrono = f.chrono || { phase: '', order: null, moment: '' }; f.source = f.source || { type: 'apreciser', detail: '' }; f.origin = f.origin || { type: 'manuel' }; });
  a.links.forEach(l => { l.history = l.history || []; });
  a.attachments.forEach(x => { x.factIds = x.factIds || []; });
  return a;
}
function titleOf(a) {
  const n = a.company.raisonSociale || 'Analyse sans nom';
  return (a.fictif && !/fictif/i.test(n) ? '[CAS FICTIF] ' : '') + n + (a.accident.date ? ' – AT du ' + fmtD(a.accident.date) : '');
}
const factById = (id, a = S.a) => a.facts.find(f => f.id === id);
const linkById = (id, a = S.a) => a.links.find(l => l.id === id);
const liveFacts = (a = S.a) => a.facts.filter(f => !f.deleted);
function newFact(p = {}) {
  const t = nowISO();
  return Object.assign({
    id: uid('f'), text: '', status: 'rapporte', kind: 'indetermine', family: 'NC',
    chrono: { phase: '', order: null, moment: '' }, source: { type: 'apreciser', detail: '' }, certainty: 'certain',
    evidence: '', notes: '', attachmentIds: [], origin: { type: 'manuel' }, questionId: null,
    createdAt: t, updatedAt: t, history: [], deleted: false
  }, p);
}
function addFact(f, why) {
  S.a.facts.push(f);
  log('fait', `Fait ajouté (${STATUS[f.status].short}) : « ${trunc(f.text, 90)} »${why ? ' – ' + why : ''}`);
  changed(); return f;
}
const TRACKED = { text: 'Formulation', status: 'Statut', kind: 'Type', family: 'Famille', 'chrono.phase': 'Phase', 'chrono.order': 'Ordre', 'chrono.moment': 'Moment', 'source.type': 'Source', 'source.detail': 'Précision de la source', certainty: 'Certitude', evidence: 'Élément probant', notes: 'Observations', attachmentIds: 'Pièces associées' };
function updateFact(id, changes, reason) {
  const f = factById(id); if (!f) return;
  const diffs = [];
  for (const [path, val] of Object.entries(changes)) {
    const old = getPath(f, path);
    if (JSON.stringify(old) === JSON.stringify(val)) continue;
    diffs.push({ field: path, old: clone(old ?? null), new: clone(val ?? null) });
    setPath(f, path, val);
  }
  if (!diffs.length) return false;
  const t = nowISO();
  f.history.push({ date: t, changes: diffs, reason: reason || '' });
  f.updatedAt = t;
  log('fait', `Fait modifié (${diffs.map(d => TRACKED[d.field] || d.field).join(', ')}) : « ${trunc(f.text, 80)} »${reason ? ' – motif : ' + reason : ''}`);
  if (inTree(id)) treeTouched('modification d\'un fait de l\'arbre');
  changed(); return true;
}
function deleteFact(id, reason) {
  const f = factById(id); if (!f) return;
  const t = nowISO();
  f.deleted = true; f.deletedAt = t; f.deleteReason = reason || '';
  f.history.push({ date: t, changes: [{ field: 'deleted', old: false, new: true }], reason: reason || 'Retrait' });
  S.a.links.filter(l => !l.deleted && (l.from === id || l.to === id)).forEach(l => { l.deleted = true; l.deletedAt = t; l.history.push({ date: t, text: 'Lien retiré avec le fait « ' + trunc(f.text, 50) + ' »' }); });
  if (S.a.tree.rootId === id) S.a.tree.rootId = null;
  log('fait', `Fait retiré de l'analyse : « ${trunc(f.text, 80)} »${reason ? ' – motif : ' + reason : ''}`);
  treeTouched('retrait d\'un fait'); changed();
}
function restoreFact(id) {
  const f = factById(id); if (!f) return;
  f.deleted = false; f.history.push({ date: nowISO(), changes: [{ field: 'deleted', old: true, new: false }], reason: 'Rétabli' });
  log('fait', `Fait rétabli : « ${trunc(f.text, 80)} » (ses anciens liens ne sont pas recréés automatiquement)`); changed();
}

/* ---------------- Contradictions ---------------- */
function openContradictionIds(a = S.a) {
  const s = new Set(); a.contradictions.filter(c => c.status === 'ouverte').forEach(c => c.factIds.forEach(id => s.add(id))); return s;
}
function effStatus(f, a = S.a) { return openContradictionIds(a).has(f.id) ? 'contradiction' : f.status; }
function isEst(f, a = S.a) { return ESTABLISHED.includes(effStatus(f, a)); }

/* ---------------- Graphe ---------------- */
function activeLinks(a = S.a) {
  const alive = new Set(a.facts.filter(f => !f.deleted).map(f => f.id));
  return a.links.filter(l => !l.deleted && alive.has(l.from) && alive.has(l.to));
}
function inTree(id, a = S.a) { return a.tree.rootId === id || activeLinks(a).some(l => l.from === id || l.to === id); }
function ins(id, a = S.a) { return activeLinks(a).filter(l => l.to === id); }
function outs(id, a = S.a) { return activeLinks(a).filter(l => l.from === id); }
function isAncestor(x, y, a = S.a) { // existe-t-il un chemin x → … → y ?
  const L = activeLinks(a); const seen = new Set(); const st = [x];
  while (st.length) { const n = st.pop(); for (const l of L) if (l.from === n && !seen.has(l.to)) { if (l.to === y) return true; seen.add(l.to); st.push(l.to); } }
  return false;
}
function linkKind(l, a = S.a) {
  const k = [];
  if (ins(l.to, a).length > 1) k.push('conjonction');
  if (outs(l.from, a).length > 1) k.push('disjonction');
  return k.length ? k : ['enchaînement'];
}
const KIND_TXT = {
  'enchaînement': "Enchaînement : l'antécédent a été nécessaire, à lui seul, pour que le fait se produise.",
  'conjonction': 'Conjonction : plusieurs faits indépendants ont été conjointement nécessaires (ET).',
  'disjonction': "Disjonction : un même fait a été nécessaire, à lui seul, pour que plusieurs faits indépendants se produisent (ET)."
};
function addLink(from, to, opt = {}) {
  if (from === to) return { err: 'Un fait ne peut pas être son propre antécédent.' };
  if (activeLinks().some(l => l.from === from && l.to === to)) return { err: 'Ce lien existe déjà.' };
  if (isAncestor(to, from)) return { err: 'Ce lien créerait une boucle : le fait choisi découle déjà du fait conséquent.' };
  const l = { id: uid('l'), from, to, uncertain: !!opt.uncertain, necessity: opt.necessity || 'a-verifier', justification: opt.justification || '', createdAt: nowISO(), history: [], deleted: false };
  S.a.links.push(l);
  log('lien', `Lien ajouté : « ${trunc(factById(from).text, 50)} » → « ${trunc(factById(to).text, 50)} »`);
  treeTouched('ajout d\'un lien'); changed(); return { link: l };
}
function updateLink(id, changes, reason) {
  const l = linkById(id); if (!l) return;
  const diffs = [];
  for (const [k, v] of Object.entries(changes)) if (JSON.stringify(l[k]) !== JSON.stringify(v)) { diffs.push({ field: k, old: l[k], new: v }); l[k] = v; }
  if (!diffs.length) return;
  l.history.push({ date: nowISO(), changes: diffs, reason: reason || '' });
  log('lien', `Lien modifié (${diffs.map(d => d.field).join(', ')}) : « ${trunc(factById(l.from)?.text, 40)} » → « ${trunc(factById(l.to)?.text, 40)} »`);
  treeTouched('modification d\'un lien'); changed();
}
function deleteLink(id, reason) {
  const l = linkById(id); if (!l) return;
  l.deleted = true; l.deletedAt = nowISO(); l.history.push({ date: l.deletedAt, text: 'Lien retiré', reason: reason || '' });
  log('lien', `Lien retiré : « ${trunc(factById(l.from)?.text, 40)} » → « ${trunc(factById(l.to)?.text, 40)} »${reason ? ' – motif : ' + reason : ''}`);
  treeTouched('retrait d\'un lien'); changed();
}
function independenceIssues(a = S.a) {
  const L = activeLinks(a); const res = [];
  const byTo = {}, byFrom = {};
  L.forEach(l => { (byTo[l.to] = byTo[l.to] || []).push(l.from); (byFrom[l.from] = byFrom[l.from] || []).push(l.to); });
  for (const [y, xs] of Object.entries(byTo)) for (let i = 0; i < xs.length; i++) for (let j = i + 1; j < xs.length; j++) {
    if (isAncestor(xs[i], xs[j], a) || isAncestor(xs[j], xs[i], a)) res.push({ type: 'conjonction', at: y, a: xs[i], b: xs[j] });
  }
  for (const [x, ys] of Object.entries(byFrom)) for (let i = 0; i < ys.length; i++) for (let j = i + 1; j < ys.length; j++) {
    if (isAncestor(ys[i], ys[j], a) || isAncestor(ys[j], ys[i], a)) res.push({ type: 'disjonction', at: x, a: ys[i], b: ys[j] });
  }
  return res;
}
function chronoIssue(l, a = S.a) {
  const x = factById(l.from, a), y = factById(l.to, a); if (!x || !y) return null;
  if (x.chrono.order != null && y.chrono.order != null && x.chrono.order !== '' && y.chrono.order !== '' && Number(x.chrono.order) > Number(y.chrono.order))
    return `L'antécédent porte le n° d'ordre ${x.chrono.order}, postérieur au fait conséquent (n° ${y.chrono.order}).`;
  const rx = PHASES[x.chrono.phase || '']?.rank ?? -1, ry = PHASES[y.chrono.phase || '']?.rank ?? -1;
  if (rx > 0 && ry > 0 && rx > ry) return `L'antécédent est situé « ${PHASES[x.chrono.phase].label} » et le fait conséquent « ${PHASES[y.chrono.phase].label} ».`;
  return null;
}
/* Modèle d'affichage : arbre de travail (tout) ou arbre retenu (faits établis reliés au fait ultime) */
function graphModel(a, view) {
  const facts = new Map(a.facts.filter(f => !f.deleted).map(f => [f.id, f]));
  let links = activeLinks(a);
  let nodeIds = new Set(); links.forEach(l => { nodeIds.add(l.from); nodeIds.add(l.to); });
  const root = a.tree.rootId && facts.has(a.tree.rootId) ? a.tree.rootId : null;
  if (root) nodeIds.add(root);
  let excluded = [];
  if (view === 'retenu') {
    const est = id => isEst(facts.get(id), a);
    links = links.filter(l => est(l.from) && est(l.to));
    const keep = new Set();
    if (root && est(root)) { keep.add(root); const st = [root]; while (st.length) { const y = st.pop(); links.filter(l => l.to === y).forEach(l => { if (!keep.has(l.from)) { keep.add(l.from); st.push(l.from); } }); } }
    excluded = [...nodeIds].filter(id => !keep.has(id));
    links = links.filter(l => keep.has(l.from) && keep.has(l.to)); nodeIds = keep;
  }
  return { facts, links, nodeIds, root, excluded, view };
}

/* ---------------- Contrôle de la formulation (INRS ED 6163 : un fait n'est ni une interprétation, ni une opinion, ni un jugement, ni un « fait négatif ») ---------------- */
const WORDING = [
  { re: /(absence|manque|d[ée]faut|insuffisance|carence|non[- ]respect)\s+(de|d['’]|du|des)/i, msg: "« Fait négatif » : la formulation décrit ce qui aurait dû exister (la mesure de prévention) et non ce qui s'est passé. Décrivez la situation réelle observée." },
  { re: /(^|[\s,;(])(ne|n['’])\s?[^\s]+\s+(pas|jamais|plus|aucun|aucune|guère)([\s.,;!)]|$)|(^|\s)pas\s+(de|d['’])\s/i, msg: "Formulation négative : décrivez ce qui a été observé (ex. « travaillait en chaussures de ville ») plutôt que ce qui n'a pas été fait." },
  { re: /(vigilan|inattenti|distrai|n[ée]glig|impruden|inconscien|maladr|erreur humaine|faute|comportement dangereux|mauvaise organisation|d[ée]faut de pr[ée]vention|manque de formation|t[ée]m[ée]rair|laxis|irrespons|n['’]a pas fait attention|ne faisait pas attention|je[- ]m['’]en[- ]foutis|insouciance)/i, msg: "Jugement ou formulation vague : remplacez-la par la description des faits réellement constatés, sans attribuer d'intention ni porter de jugement." },
  { re: /(^|\s)(trop|mauvais|mauvaise|dangereu\w*|insuffisant\w*|inadapt\w*|anormal\w*)(\s|[.,;]|$)/i, msg: "Qualificatif à objectiver : précisez une valeur ou une observation (ex. « roulait à 15 km/h » plutôt que « trop vite »)." },
  { re: /(on peut penser|sans doute|probablement|peut[- ][êe]tre|il semble|semblerai|aurait d[ûu]|aurait pu|aurai[te]nt d[ûu]|devait [êe]tre|certainement|sûrement|surement)/i, msg: "Interprétation ou supposition : si ce n'est pas établi, enregistrez l'information comme « Hypothèse à examiner » ou « À vérifier »." }
];
function wordingIssues(text) {
  const t = String(text || '').trim(); const out = [];
  if (!t) return out;
  WORDING.forEach(w => { if (w.re.test(t)) out.push(w.msg); });
  if (/;|\s(puis|ensuite)\s|,\s*(et|puis)\s|\set\s(il|elle|ils|elles|on|a|est|était|sont|se|s['’]|l['’]|y)\s?/i.test(t)) out.push("Plusieurs informations ? Un seul fait par case : si la phrase décrit plusieurs faits, enregistrez-les séparément.");
  if (t.length > 170) out.push('Formulation longue : un fait doit être exprimé de façon concise.');
  return out;
}
