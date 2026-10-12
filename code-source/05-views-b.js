
/* =====================================================================
   Étape 3 – Photos et documents
   ===================================================================== */
const DOC_ACCEPT = '.pdf,.docx,.odt,.txt,.md,.csv,.log,.rtf,.doc,.xls,.xlsx,.odp,.pptx,application/pdf,text/plain';
const EXTRACT_LBL = { ok: ['ok', 'Contenu lu'], manuel: ['ok', 'Texte saisi manuellement'], vide: ['warn', 'Aucun texte trouvé'], echec: ['bad', 'Lecture impossible'], 'non-supporte': ['bad', 'Format non exploitable'], refus: ['warn', 'Lecture non autorisée'], cours: ['info', 'Lecture en cours…'] };
function totalSize() { return S.a.attachments.reduce((s, x) => s + (x.dataUrl ? x.dataUrl.length * 0.75 : 0), 0); }
VIEWS.files = () => {
  const P = S.a.attachments.filter(x => x.kind === 'photo'), D = S.a.attachments.filter(x => x.kind === 'document');
  const okD = D.filter(x => ['ok', 'manuel'].includes(x.extract?.status)).length;
  const tot = totalSize();
  return `<h1>3. Photos et documents</h1>
  <p class="lead">Ajoutez les photos des lieux et de l'équipement, et les documents utiles (relevé des faits déjà rédigé, compte rendu, fiche de maintenance…).</p>
  <div class="note warn">${icon('alert')}<div><b>Ce que l'application ne fait pas :</b> elle n'analyse pas automatiquement les images, n'utilise aucune reconnaissance faciale et n'identifie pas les personnes. Décrivez vous-même ce qui est <b>effectivement visible</b>. Une photo seule ne permet pas d'établir une vitesse, une chronologie, un état technique ou une cause.</div></div>
  ${tot > 25e6 ? `<div class="note warn">${icon('alert')}<div>Les pièces jointes occupent environ ${fmtSize(tot)}. La sauvegarde .json sera volumineuse et le stockage du navigateur peut saturer.</div></div>` : ''}
  <section class="card">
    <div class="card-head"><h2>${icon('camera')}Photographies <span class="pill">${P.length}</span></h2></div>
    <label class="drop" data-drop="photo" for="ph-in">${icon('upload')} <b>Ajouter des photos</b> – cliquez ou déposez les fichiers ici<br><span class="small muted">JPEG, PNG, WebP. Une copie réduite (1800 px max.) est conservée dans l'analyse ; gardez les originaux. Les métadonnées (dont la localisation GPS) ne sont pas conservées.</span></label>
    <input type="file" id="ph-in" accept="image/*" multiple hidden>
    <div class="att-grid">${P.map(photoCard).join('')}</div>
  </section>
  <section class="card">
    <div class="card-head"><h2>${icon('file')}Documents <span class="pill">${D.length} reçu(s) · ${okD} exploité(s)</span></h2>
      <button class="btn sm" data-act="pasteDoc">${icon('plus')}Coller le texte d'un relevé des faits</button></div>
    <label class="drop" data-drop="document" for="doc-in">${icon('upload')} <b>Ajouter des documents</b> – cliquez ou déposez les fichiers ici<br><span class="small muted">Lus sur cet appareil : TXT, MD, CSV, DOCX, ODT, PDF contenant du texte (PDF : module de lecture téléchargé depuis Internet, après accord). Les autres formats sont conservés mais non lus.</span></label>
    <input type="file" id="doc-in" accept="${DOC_ACCEPT}" multiple hidden>
    ${D.map(docRow).join('')}
  </section>`;
};
function phaseOpts(sel) { return opts(PHASES, sel || ''); }
function linkedFactsTxt(x) { const F = x.factIds.map(id => factById(id)).filter(f => f && !f.deleted); return F.length ? F.map(f => '« ' + esc(trunc(f.text, 60)) + ' »').join(', ') : '<span class="muted">aucun</span>'; }
function photoCard(x) {
  return `<article class="att"><img src="${safeImg(x.dataUrl)}" alt="${esc(x.caption || 'Photographie ' + x.name)}" data-act="viewPhoto" data-id="${x.id}" tabindex="0" role="button">
  <div class="att-b">
    <div class="field"><label for="pc-${x.id}" class="small">Légende</label><input type="text" id="pc-${x.id}" data-att="${x.id}" data-k="caption" value="${esc(x.caption)}" placeholder="Ex. : Photo 1 – vue de face de la scie"></div>
    <div class="field"><label for="po-${x.id}" class="small">Ce que la photo permet d'observer</label><textarea id="po-${x.id}" rows="2" data-att="${x.id}" data-k="observation" placeholder="Uniquement ce qui est visible. Ex. : carter relevé en position haute.">${esc(x.observation)}</textarea></div>
    <div class="field"><label for="pp-${x.id}" class="small">Étape chronologique</label><select id="pp-${x.id}" data-att="${x.id}" data-k="phase">${phaseOpts(x.phase)}</select></div>
    <div class="small">Faits associés : ${linkedFactsTxt(x)}</div>
    <div class="xs muted">${esc(x.name)} · ${fmtSize(x.size)}${x.w ? ` · copie ${x.w}×${x.h}` : ''} · ajoutée le ${esc(fmtDT(x.addedAt))}</div>
    <div class="row"><button class="btn sm" data-act="attFacts" data-id="${x.id}">${icon('link')}Associer à des faits</button><button class="btn sm" data-act="photoFact" data-id="${x.id}">${icon('plus')}Fait observé</button><button class="btn sm danger" data-act="delAtt" data-id="${x.id}" aria-label="Supprimer la photo">${icon('trash')}</button></div>
  </div></article>`;
}
function docRow(x) {
  const e = x.extract || { status: 'non-supporte' }; const [cls, lbl] = EXTRACT_LBL[e.status] || ['bad', e.status];
  const hasText = ['ok', 'manuel'].includes(e.status) && e.text;
  const nf = liveFacts().filter(f => f.origin?.type === 'document' && f.origin.ref === x.id).length;
  return `<div class="doc-row"><div class="row"><b>📄 ${esc(x.name)}</b><span class="tag ${cls}">${esc(lbl)}</span>${x.isReleve ? '<span class="tag info">Relevé des faits de l\'entreprise</span>' : ''}<span class="spacer"></span><span class="xs muted">${x.size ? fmtSize(x.size) + ' · ' : ''}ajouté le ${esc(fmtDT(x.addedAt))}</span></div>
  ${e.message ? `<p class="small ${cls === 'bad' ? 'err' : 'muted'}" style="font-weight:400">${esc(e.message)}</p>` : ''}
  <div class="row small" style="margin:6px 0"><label class="check"><input type="checkbox" data-att="${x.id}" data-k="isReleve" ${x.isReleve ? 'checked' : ''}> Il s'agit du relevé des faits rédigé par l'entreprise</label></div>
  ${hasText ? `<details><summary class="small">Afficher le texte lu (${e.text.length} caractères${e.method ? ', ' + esc(e.method) : ''})</summary><div class="doc-text" style="margin-top:6px">${esc(e.text)}</div></details>` : ''}
  <div class="row" style="margin-top:8px">
    ${hasText ? `<button class="btn sm primary" data-act="extractDoc" data-id="${x.id}">${icon('list')}Extraire des faits</button>` : ''}
    ${!hasText ? `<button class="btn sm primary" data-act="manualDoc" data-id="${x.id}">${icon('edit')}Coller le texte du document</button>` : ''}
    ${['echec', 'refus', 'vide'].includes(e.status) && x.dataUrl ? `<button class="btn sm" data-act="retryDoc" data-id="${x.id}">Réessayer la lecture</button>` : ''}
    ${x.dataUrl ? `<button class="btn sm" data-act="dlAtt" data-id="${x.id}">${icon('download')}Original</button>` : ''}
    <button class="btn sm" data-act="attFacts" data-id="${x.id}">${icon('link')}Associer à des faits</button>
    <button class="btn sm danger" data-act="delAtt" data-id="${x.id}" aria-label="Supprimer le document">${icon('trash')}Supprimer</button>
    <span class="xs muted">${nf} fait(s) extrait(s)</span>
  </div></div>`;
}
/* ---------- Lecture des fichiers (sur l'appareil) ---------- */
function readAs(file, how) { return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(r.error || new Error('Lecture du fichier impossible')); r[how](file); }); }
function decodeText(buf) {
  try { return new TextDecoder('utf-8', { fatal: true }).decode(buf).replace(/^﻿/, ''); }
  catch (e) { return new TextDecoder('windows-1252').decode(buf); }
}
function xmlEntities(s) { return s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (m, n) => String.fromCodePoint(+n)).replace(/&#x([0-9a-f]+);/gi, (m, n) => String.fromCodePoint(parseInt(n, 16))).replace(/&amp;/g, '&'); }
async function unzipEntry(buf, name) {
  const dv = new DataView(buf); let eocd = -1;
  for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 65557); i--) if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error("le fichier n'est pas une archive valide (fichier endommagé ou ancien format .doc ?)");
  const count = dv.getUint16(eocd + 10, true); let p = dv.getUint32(eocd + 16, true);
  const dec = new TextDecoder();
  for (let n = 0; n < count; n++) {
    if (dv.getUint32(p, true) !== 0x02014b50) throw new Error('archive endommagée');
    const method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true);
    const nlen = dv.getUint16(p + 28, true), elen = dv.getUint16(p + 30, true), clen = dv.getUint16(p + 32, true), lho = dv.getUint32(p + 42, true);
    const fname = dec.decode(new Uint8Array(buf, p + 46, nlen));
    if (fname === name) {
      const start = lho + 30 + dv.getUint16(lho + 26, true) + dv.getUint16(lho + 28, true);
      const data = new Uint8Array(buf, start, csize);
      if (method === 0) return dec.decode(data);
      if (method === 8) {
        if (typeof DecompressionStream === 'undefined') throw new Error('navigateur trop ancien pour lire ce format');
        const out = await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer();
        return dec.decode(out);
      }
      throw new Error('méthode de compression non prise en charge');
    }
    p += 46 + nlen + elen + clen;
  }
  throw new Error('contenu principal introuvable');
}
function docxToText(xml) { return xmlEntities(xml.replace(/<w:tab\/>/g, '\t').replace(/<w:br[^>]*\/>/g, '\n').replace(/<\/w:p>/g, '\n').replace(/<[^>]+>/g, '')).replace(/\n{3,}/g, '\n\n').trim(); }
function odtToText(xml) { return xmlEntities(xml.replace(/<text:tab\/>/g, '\t').replace(/<text:line-break\/>/g, '\n').replace(/<text:s\/>/g, ' ').replace(/<\/text:(p|h)>/g, '\n').replace(/<[^>]+>/g, '')).replace(/\n{3,}/g, '\n\n').trim(); }
function loadScript(src) { return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('module de lecture PDF inaccessible (connexion Internet ?)')); document.head.appendChild(s); }); }
async function pdfLib() {
  if (window.pdfjsLib) return window.pdfjsLib;
  await loadScript(PDFJS_URL);
  if (!window.pdfjsLib) throw new Error('module de lecture PDF non chargé');
  try { const w = await (await fetch(PDFJS_WORKER)).text(); window.pdfjsLib.GlobalWorkerOptions.workerSrc = URL.createObjectURL(new Blob([w], { type: 'text/javascript' })); }
  catch (e) { window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER; }
  return window.pdfjsLib;
}
async function pdfToText(buf) {
  const lib = await pdfLib();
  const doc = await lib.getDocument({ data: new Uint8Array(buf.slice(0)) }).promise;
  const pages = [];
  for (let i = 1; i <= doc.numPages; i++) { const pg = await doc.getPage(i); const tc = await pg.getTextContent(); pages.push(`--- Page ${i} ---\n` + tc.items.map(it => (it.str || '') + (it.hasEOL ? '\n' : ' ')).join('').replace(/[ \t]+\n/g, '\n').trim()); }
  return { text: pages.join('\n\n'), pages: doc.numPages };
}
async function extractText(name, buf) {
  const ext = (name.split('.').pop() || '').toLowerCase();
  const done = (text, method) => {
    const t = String(text || '').trim();
    if (t.replace(/--- Page \d+ ---/g, '').trim().length < 15) return { status: 'vide', text: '', method, message: "Aucun texte exploitable n'a été trouvé (document scanné ou image ?). La reconnaissance de texte (OCR) n'est pas disponible : copiez le texte utile avec le bouton « Coller le texte »." , date: nowISO() };
    return { status: 'ok', text: t, method, message: '', date: nowISO() };
  };
  try {
    if (['txt', 'md', 'csv', 'log'].includes(ext)) return done(decodeText(buf), 'texte brut');
    if (ext === 'docx') return done(docxToText(await unzipEntry(buf, 'word/document.xml')), 'DOCX lu sur l\'appareil');
    if (ext === 'odt') return done(odtToText(await unzipEntry(buf, 'content.xml')), 'ODT lu sur l\'appareil');
    if (ext === 'pdf') {
      if (!S.pdfConsent) {
        S.pdfConsent = await confirmBox(`Pour lire « ${esc(name)} », l'application doit télécharger le module de lecture <b>pdf.js ${PDFJS_VER}</b> depuis <b>cdnjs.cloudflare.com</b> (connexion Internet nécessaire).<br><br>Le fichier PDF lui-même <b>n'est pas envoyé</b> : il est lu sur cet appareil.`, { title: 'Lecture d\'un PDF', ok: 'Autoriser et lire' });
        if (!S.pdfConsent) return { status: 'refus', text: '', message: 'Lecture du PDF non autorisée. Vous pouvez réessayer ou coller le texte du document.', date: nowISO() };
      }
      const r = await pdfToText(buf); return done(r.text, `PDF, ${r.pages} page(s), lu avec pdf.js`);
    }
    return { status: 'non-supporte', text: '', message: `Le format « .${ext} » ne peut pas être lu par l'application. Le fichier est conservé, mais son contenu n'a pas été pris en compte. Copiez le texte utile avec « Coller le texte du document », ou fournissez une version TXT, DOCX ou PDF.`, date: nowISO() };
  } catch (e) {
    return { status: 'echec', text: '', message: `Lecture impossible : ${e.message || e}. Le contenu n'a pas été pris en compte. Copiez le texte utile ou fournissez une autre version.`, date: nowISO() };
  }
}
function compressImage(file) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file); const img = new Image();
    img.onload = () => {
      const max = 1800, w = img.naturalWidth, h = img.naturalHeight, r = Math.min(1, max / Math.max(w, h));
      const c = document.createElement('canvas'); c.width = Math.round(w * r); c.height = Math.round(h * r);
      const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url); res({ dataUrl: c.toDataURL('image/jpeg', 0.85), w: c.width, h: c.height });
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('image illisible par ce navigateur (format HEIC ou fichier endommagé ?). Convertissez-la en JPEG ou PNG.')); };
    img.src = url;
  });
}
async function addFiles(files, kind) {
  let ok = 0; const errs = [];
  for (const file of files) {
    if (file.size > MAX_FILE) { errs.push(`« ${file.name} » : fichier trop volumineux (${fmtSize(file.size)}, maximum ${fmtSize(MAX_FILE)}).`); continue; }
    if (kind === 'photo' || (kind === 'document' && /^image\//.test(file.type))) {
      if (!/^image\//.test(file.type)) { errs.push(`« ${file.name} » n'est pas une image.`); continue; }
      try {
        const r = await compressImage(file);
        S.a.attachments.push({ id: uid('p'), kind: 'photo', name: file.name, mime: 'image/jpeg', size: file.size, dataUrl: r.dataUrl, w: r.w, h: r.h, caption: '', observation: '', phase: '', factIds: [], addedAt: nowISO() });
        log('piece', `Photo ajoutée : ${file.name}`); ok++;
      } catch (e) { errs.push(`« ${file.name} » : ${e.message}`); }
      continue;
    }
    try {
      const buf = await readAs(file, 'readAsArrayBuffer');
      const att = { id: uid('d'), kind: 'document', name: file.name, mime: file.type || '', size: file.size, dataUrl: '', caption: '', factIds: [], isReleve: false, addedAt: nowISO(), extract: { status: 'cours' } };
      att.dataUrl = await readAs(file, 'readAsDataURL');
      S.a.attachments.push(att); render();
      att.extract = await extractText(file.name, buf);
      log('piece', `Document ajouté : ${file.name} – ${EXTRACT_LBL[att.extract.status][1]}`); ok++;
    } catch (e) { errs.push(`« ${file.name} » : ${e.message}`); }
  }
  changed(); render();
  if (ok) toast(`${ok} fichier(s) ajouté(s).`, 'ok');
  if (errs.length) modal({ title: 'Certains fichiers n\'ont pas pu être ajoutés', body: `<ul>${errs.map(e => `<li>${esc(e)}</li>`).join('')}</ul>` });
}
AFTER.files = () => {
  const bind = (inp, kind) => { const el = $('#' + inp); if (el) el.addEventListener('change', e => { const fs = [...e.target.files]; e.target.value = ''; if (fs.length) addFiles(fs, kind); }); };
  bind('ph-in', 'photo'); bind('doc-in', 'document');
  $$('[data-drop]').forEach(z => {
    z.addEventListener('dragover', e => { e.preventDefault(); z.classList.add('over'); });
    z.addEventListener('dragleave', () => z.classList.remove('over'));
    z.addEventListener('drop', e => { e.preventDefault(); z.classList.remove('over'); const fs = [...(e.dataTransfer?.files || [])]; if (fs.length) addFiles(fs, z.dataset.drop); });
    z.tabIndex = 0; z.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); $('#' + z.getAttribute('for')).click(); } });
  });
};
async function attFactsDialog(aid) {
  const x = S.a.attachments.find(t => t.id === aid); const F = liveFacts();
  if (!F.length) { toast('Aucun fait enregistré pour le moment.', 'warn'); return; }
  const v = await modal({
    title: 'Associer « ' + trunc(x.caption || x.name, 40) + ' » à des faits', wide: true,
    body: `<p class="small muted">Associer une pièce à un fait n'en fait pas un fait corroboré : c'est vous qui décidez du statut, dans la fiche du fait.</p><div class="radio-list" style="max-height:50vh;overflow:auto">${F.map(f => `<label><input type="checkbox" value="${f.id}" ${x.factIds.includes(f.id) ? 'checked' : ''}> <span>${esc(f.text)} ${factBadge(f)}</span></label>`).join('')}</div>`,
    buttons: [{ label: 'Annuler', value: 'cancel' }, { label: 'Enregistrer', value: 'ok', cls: 'primary' }],
    onAction: (v, d) => { if (v !== 'ok') return; return { ids: $$('input:checked', d).map(i => i.value) }; }
  });
  if (v && v.ids) { x.factIds = v.ids; log('piece', `Associations mises à jour pour « ${trunc(x.caption || x.name, 40)} » (${v.ids.length} fait(s))`); changed(); render(); }
}

/* =====================================================================
   Étape 4 – Synthèse des faits
   ===================================================================== */
function synthList(F, empty = 'Aucun élément.') { return F.length ? `<ul class="facts">${F.map(f => factItem(f)).join('')}</ul>` : `<p class="small muted">${empty}</p>`; }
function noteField(k) { return `<div class="field" style="margin-top:8px"><label for="sn-${k}" class="small">Correction ou complément du groupe d'analyse</label><textarea id="sn-${k}" rows="2" data-bind="notes.${k}" placeholder="Facultatif">${esc(S.a.notes[k] || '')}</textarea></div>`; }
VIEWS.synth = () => {
  const a = S.a, F = liveFacts();
  const byPh = (...ph) => F.filter(f => ph.includes(f.chrono.phase) && effStatus(f) !== 'hypothese').sort((x, y) => (PHASES[x.chrono.phase].rank - PHASES[y.chrono.phase].rank) || ((x.chrono.order ?? 999) - (y.chrono.order ?? 999)));
  const gaps = computeGaps().active;
  const enough = F.some(f => f.chrono.phase === 'dommage') && F.filter(f => isEst(f)).length >= 3;
  const sec = (n, title, inner, k) => `<section class="card"><h2><span class="pill">${n}</span> ${esc(title)}</h2>${inner}${k ? noteField(k) : ''}</section>`;
  const unplaced = F.filter(f => !f.chrono.phase && effStatus(f) !== 'hypothese');
  return `<h1>4. Synthèse des faits recueillis</h1>
  <p class="lead">Relisez l'ensemble avant de construire l'arbre. Cliquez sur ${icon('edit')} pour corriger un fait (l'ancienne version est conservée).</p>
  ${!enough ? `<div class="note warn">${icon('alert')}<div>Les informations sont encore <b>insuffisantes pour un arbre définitif</b> (dommage non décrit ou moins de trois faits établis). Vous pouvez construire un arbre partiel : il restera affiché comme <b>provisoire</b>.</div></div>` : ''}
  <div class="kpis" style="margin-bottom:16px">${['rapporte', 'corrobore', 'averifier', 'manquant', 'contradiction', 'hypothese'].map(s => `<div class="kpi"><b>${F.filter(f => effStatus(f) === s).length}</b><span>${stBadge(s)}</span></div>`).join('')}</div>
  ${sec(1, "Circonstances de l'accident", `<dl class="small" style="display:grid;grid-template-columns:200px 1fr;gap:4px 12px;margin:0">
    <dt class="muted">Entreprise</dt><dd>${esc([a.company.raisonSociale, a.company.etablissement].filter(Boolean).join(' – ') || '—')}</dd>
    <dt class="muted">Activité</dt><dd>${esc(a.company.secteur || '—')}</dd>
    <dt class="muted">Date et heure</dt><dd>${esc([fmtD(a.accident.date), a.accident.heure].filter(Boolean).join(' à ') || '—')}</dd>
    <dt class="muted">Lieu</dt><dd>${esc(a.accident.lieu || '—')}</dd>
    <dt class="muted">Poste de la victime</dt><dd>${esc(a.accident.poste || '—')}</dd>
    <dt class="muted">Tâche réalisée</dt><dd>${esc(a.accident.tache || '—')}</dd></dl>
    ${a.accident.description ? `<details style="margin-top:8px"><summary class="small">Récit initial</summary><p class="small" style="white-space:pre-wrap">${esc(a.accident.description)}</p></details>` : ''}`, 's1')}
  ${sec(2, "Faits antérieurs à l'accident", synthList(byPh('habituel', 'avant', 'justeavant')), 's2')}
  ${sec(3, "Déroulement connu de l'accident", synthList(byPh('moment', 'apres')) + (unplaced.length ? `<h4 style="margin-top:10px">Faits non situés dans le temps</h4>${synthList(unplaced)}` : ''), 's3')}
  ${sec(4, 'Dommage constaté', (a.accident.dommage ? `<p class="small">Indiqué à l'étape 1 : <b>${esc(a.accident.dommage)}</b></p>` : '') + synthList(byPh('dommage'), 'Aucun fait « dommage » enregistré.'), 's4')}
  ${sec(5, 'Informations corroborées', synthList(F.filter(f => effStatus(f) === 'corrobore')), 's5')}
  ${sec(6, 'Informations rapportées mais non vérifiées', `<h4>Faits rapportés (non corroborés)</h4>${synthList(F.filter(f => effStatus(f) === 'rapporte'))}<h4>Informations à vérifier</h4>${synthList(F.filter(f => effStatus(f) === 'averifier'))}`, 's6')}
  ${sec(7, 'Informations manquantes', synthList(F.filter(f => effStatus(f) === 'manquant'), 'Aucune information déclarée manquante.') + `<p class="small">Les contrôles automatiques signalent en plus <b>${gaps.filter(g => g.prio === 'haute').length}</b> point(s) prioritaire(s) – voir l'étape 6.</p>`, 's7')}
  ${sec(8, 'Contradictions', a.contradictions.length ? contraList() : '<p class="small muted">Aucune contradiction signalée.</p>', 's8')}
  ${sec(9, 'Questions qui restent à poser', gaps.length ? `<ol class="small">${gaps.filter(g => g.prio !== 'faible').slice(0, 12).map(g => `<li><span class="prio ${g.prio}">${g.prio}</span> ${esc(g.question)}</li>`).join('')}</ol><button class="btn sm" data-act="go" data-step="6">Répondre aux questions (étape 6)</button>` : '<p class="small muted">Aucune question en attente.</p>', 's9')}
  <section class="card"><h2>${stBadge('hypothese')} Hypothèses à examiner (hors faits établis)</h2>${synthList(F.filter(f => effStatus(f) === 'hypothese'), 'Aucune hypothèse.')}</section>`;
};
