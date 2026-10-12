
/* =====================================================================
   Étape 5 – Arbre des causes : disposition et rendu
   Conventions INRS ED 6163 : état = rectangle, variation = cercle,
   un seul fait par forme, pointillé = part d'incertitude, construction
   de droite à gauche (ou de bas en haut) à partir du dommage.
   ===================================================================== */
const TFONT = "'Segoe UI', system-ui, -apple-system, Roboto, Arial, sans-serif";
const MCTX = document.createElement('canvas').getContext('2d');
function wrapText(text, maxW, size = 13, weight = '400') {
  MCTX.font = `${weight} ${size}px ${TFONT}`;
  const words = String(text || '').split(/\s+/).filter(Boolean); const lines = []; let cur = '';
  for (const w of words) {
    const t = cur ? cur + ' ' + w : w;
    if (MCTX.measureText(t).width <= maxW) { cur = t; continue; }
    if (cur) lines.push(cur);
    if (MCTX.measureText(w).width > maxW) { let part = ''; for (const ch of w) { if (MCTX.measureText(part + ch).width > maxW) { lines.push(part); part = ch; } else part += ch; } cur = part; }
    else cur = w;
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : ['(fait sans texte)'];
}
const NODE_STYLE = {
  etat: { fill: '#EAF1FB', stroke: '#1D58A6' }, variation: { fill: '#FDEEEC', stroke: '#B42318' }, indetermine: { fill: '#FFFFFF', stroke: '#5A6577' }
};
const ST_STYLE = {
  averifier: { fill: '#FFF6DD', stroke: '#B07000', dash: '6 4', badge: '? À VÉRIFIER', bc: '#8A5300' },
  manquant: { fill: '#F1F3F6', stroke: '#4E5968', dash: '6 4', badge: '∅ INFORMATION MANQUANTE', bc: '#4E5968' },
  hypothese: { fill: '#F4EDFC', stroke: '#6A3B9E', dash: '6 4', badge: 'H HYPOTHÈSE', bc: '#6A3B9E' },
  contradiction: { fill: '#FDE7E5', stroke: '#B42318', dash: '', badge: '! CONTRADICTION', bc: '#B42318', width: 3 },
  corrobore: { badge: '✔ CORROBORÉ', bc: '#1B7342' }
};
function nodeGeom(f, a, isRoot) {
  const st = effStatus(f, a); const shape = f.kind === 'variation' ? 'ellipse' : 'rect';
  const badge = [ST_STYLE[st]?.badge, f.kind === 'indetermine' ? 'TYPE À PRÉCISER' : ''].filter(Boolean).join(' · ');
  const tw = shape === 'ellipse' ? 150 : 170;
  const lines = wrapText(f.text, tw);
  const top = (isRoot ? 1 : 0) + (badge ? 1 : 0);
  const th = lines.length * 17 + top * 15;
  let w, h;
  if (shape === 'rect') { w = tw + 24; h = th + 22; } else { w = Math.round(tw * 1.42); h = Math.max(64, Math.round(th * 1.42 + 10)); }
  return { shape, lines, badge, w, h, st, isRoot, th };
}
function layoutModel(model, a, orient) {
  const ids = [...model.nodeIds]; const geo = new Map();
  ids.forEach(id => geo.set(id, nodeGeom(model.facts.get(id), a, id === model.root)));
  const IN = new Map(ids.map(i => [i, []])), OUT = new Map(ids.map(i => [i, []]));
  model.links.forEach(l => { if (OUT.has(l.from) && IN.has(l.to)) { OUT.get(l.from).push(l); IN.get(l.to).push(l); } });
  const col = new Map(), vis = new Set();
  const colOf = id => { if (col.has(id)) return col.get(id); if (vis.has(id)) return 0; vis.add(id); const o = OUT.get(id); const c = o.length ? Math.max(...o.map(l => colOf(l.to) + 1)) : 0; col.set(id, c); return c; };
  ids.forEach(colOf);
  const maxCol = ids.length ? Math.max(...col.values()) : 0;
  const comp = new Map(); let cn = 0;
  for (const id of ids) {
    if (comp.has(id)) continue; comp.set(id, cn); const st = [id];
    while (st.length) { const n = st.pop(); [...IN.get(n).map(l => l.from), ...OUT.get(n).map(l => l.to)].forEach(m => { if (!comp.has(m)) { comp.set(m, cn); st.push(m); } }); }
    cn++;
  }
  const comps = [...Array(cn)].map((_, i) => ids.filter(id => comp.get(id) === i));
  comps.sort((x, y) => (y.includes(model.root) - x.includes(model.root)) || (y.length - x.length));
  const H = orient !== 'v';
  const bs = id => H ? geo.get(id).h : geo.get(id).w;
  const ds = id => H ? geo.get(id).w : geo.get(id).h;
  const maxDs = Math.max(100, ...ids.map(ds));
  const GAPB = H ? 26 : 30, STEP = maxDs + (H ? 86 : 74), PAD = 40;
  let cursor = 0; const B = new Map(); const labels = [];
  comps.forEach((cids, ci) => {
    const start = cursor;
    const lbl = ci > 0 || (model.root && !cids.includes(model.root));
    if (lbl) { labels.push({ at: start, text: 'Faits reliés entre eux mais pas au fait ultime' }); cursor += 30; }
    const sinks = cids.filter(id => !OUT.get(id).length).sort((x, y) => (y === model.root) - (x === model.root));
    const placed = new Map();
    const place = id => {
      if (placed.has(id)) return placed.get(id);
      placed.set(id, NaN); const ys = [];
      for (const l of IN.get(id)) { const was = placed.has(l.from); const y = place(l.from); if (!was && !isNaN(y)) ys.push(y); }
      let y; if (ys.length) y = (Math.min(...ys) + Math.max(...ys)) / 2; else { y = cursor + bs(id) / 2; cursor += bs(id) + GAPB; }
      placed.set(id, y); return y;
    };
    sinks.forEach(place); cids.forEach(place);
    const byCol = {}; cids.forEach(id => (byCol[col.get(id)] = byCol[col.get(id)] || []).push(id));
    Object.values(byCol).forEach(list => { list.sort((x, y) => placed.get(x) - placed.get(y)); for (let i = 1; i < list.length; i++) { const p = list[i - 1], c = list[i]; const min = placed.get(p) + bs(p) / 2 + GAPB + bs(c) / 2; if (placed.get(c) < min) placed.set(c, min); } });
    const top = Math.min(...cids.map(id => placed.get(id) - bs(id) / 2)), bottom = Math.max(...cids.map(id => placed.get(id) + bs(id) / 2));
    const off = (lbl ? start + 30 : start) - top;
    cids.forEach(id => B.set(id, placed.get(id) + off));
    cursor = bottom + off + 56;
  });
  const P = new Map();
  ids.forEach(id => { const d = (maxCol - col.get(id)) * STEP + maxDs / 2 + PAD; const b = B.get(id) + PAD; P.set(id, H ? { x: d, y: b } : { x: b, y: d }); });
  const depthLen = maxCol * STEP + maxDs + 2 * PAD, breadthLen = Math.max(cursor - 56, 0) + 2 * PAD;
  const edges = model.links.filter(l => P.has(l.from) && P.has(l.to)).map(l => {
    const p = P.get(l.from), q = P.get(l.to), g1 = geo.get(l.from), g2 = geo.get(l.to);
    const conj = IN.get(l.to).length > 1, disj = OUT.get(l.from).length > 1;
    let d, mid;
    if (H) { const sx = p.x + g1.w / 2, sy = p.y, ex = q.x - g2.w / 2, ey = q.y; const bx = conj ? ex - 32 : disj ? sx + 32 : (sx + ex) / 2; d = `M${sx},${sy} H${bx} V${ey} H${ex - 2}`; mid = Math.abs(sy - ey) < 1 ? { x: (sx + ex) / 2, y: sy } : { x: bx, y: (sy + ey) / 2 }; }
    else { const sx = p.x, sy = p.y + g1.h / 2, ex = q.x, ey = q.y - g2.h / 2; const by = conj ? ey - 32 : disj ? sy + 32 : (sy + ey) / 2; d = `M${sx},${sy} V${by} H${ex} V${ey - 2}`; mid = Math.abs(sx - ex) < 1 ? { x: sx, y: (sy + ey) / 2 } : { x: (sx + ex) / 2, y: by }; }
    return { l, d, mid };
  });
  const ets = [];
  ids.forEach(id => {
    const p = P.get(id), g = geo.get(id);
    if (IN.get(id).length > 1) ets.push(H ? { x: p.x - g.w / 2 - 32, y: p.y, k: 'conjonction' } : { x: p.x, y: p.y - g.h / 2 - 32, k: 'conjonction' });
    if (OUT.get(id).length > 1) ets.push(H ? { x: p.x + g.w / 2 + 32, y: p.y, k: 'disjonction' } : { x: p.x, y: p.y + g.h / 2 + 32, k: 'disjonction' });
  });
  return { P, geo, edges, ets, labels: labels.map(lb => H ? { x: PAD, y: lb.at + PAD + 14, text: lb.text } : { x: lb.at + PAD, y: 22, text: lb.text }), width: H ? depthLen : breadthLen, height: H ? breadthLen : depthLen, H };
}
function treeMarkup(L, a, { interactive = true, sel = null } = {}) {
  const out = [];
  out.push(`<defs><marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#3C4656"/></marker><marker id="arr-g" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#8A94A3"/></marker></defs>`);
  L.labels.forEach(lb => out.push(`<text x="${lb.x}" y="${lb.y}" font-family="${TFONT}" font-size="12" font-weight="700" fill="#8A5300">${esc(lb.text)}</text>`));
  L.edges.forEach(({ l, d, mid }) => {
    const unc = l.necessity !== 'confirmee'; const isSel = sel && sel.type === 'link' && sel.id === l.id;
    out.push(`<path class="edge${isSel ? ' sel' : ''}" d="${d}" fill="none" stroke="${unc ? '#8A94A3' : '#3C4656'}" stroke-width="1.8" ${l.uncertain ? 'stroke-dasharray="7 5"' : ''} marker-end="url(#${unc ? 'arr-g' : 'arr'})"/>`);
    if (unc) out.push(`<g><circle cx="${mid.x}" cy="${mid.y}" r="8" fill="#fff" stroke="#8A94A3"/><text x="${mid.x}" y="${mid.y + 4}" text-anchor="middle" font-family="${TFONT}" font-size="11" font-weight="700" fill="#556072">?</text></g>`);
    if (interactive) out.push(`<path class="edge-hit" d="${d}" data-act="selLink" data-id="${l.id}"><title>Lien : ${esc(trunc(factById(l.from, a)?.text, 50))} → ${esc(trunc(factById(l.to, a)?.text, 50))}</title></path>`);
  });
  L.ets.forEach(e => out.push(`<g><rect x="${e.x - 14}" y="${e.y - 9}" width="28" height="18" rx="9" fill="#fff" stroke="#3C4656" stroke-width="1.3"/><text x="${e.x}" y="${e.y + 4}" text-anchor="middle" font-family="${TFONT}" font-size="10.5" font-weight="800" fill="#18202E">ET</text></g>`));
  for (const [id, p] of L.P) {
    const f = factById(id, a), g = L.geo.get(id);
    const base = NODE_STYLE[f.kind] || NODE_STYLE.indetermine, ss = ST_STYLE[g.st] || {};
    const fill = ss.fill || base.fill, stroke = ss.stroke || base.stroke;
    const dash = ss.dash != null ? ss.dash : (f.kind === 'indetermine' ? '2 3' : '');
    const sw = g.isRoot ? 3.5 : (ss.width || 2);
    const isSel = sel && sel.type === 'fact' && sel.id === id;
    const shape = g.shape === 'rect'
      ? `<rect class="shape" x="${-g.w / 2}" y="${-g.h / 2}" width="${g.w}" height="${g.h}" rx="3" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" ${dash ? `stroke-dasharray="${dash}"` : ''}/>`
      : `<ellipse class="shape" cx="0" cy="0" rx="${g.w / 2}" ry="${g.h / 2}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" ${dash ? `stroke-dasharray="${dash}"` : ''}/>`;
    let y = -g.th / 2 + 12; const tx = [];
    if (g.isRoot) { tx.push(`<text x="0" y="${y}" text-anchor="middle" font-family="${TFONT}" font-size="10" font-weight="800" fill="#18202E" letter-spacing=".5">FAIT ULTIME (DOMMAGE)</text>`); y += 15; }
    if (g.badge) { tx.push(`<text x="0" y="${y}" text-anchor="middle" font-family="${TFONT}" font-size="9.5" font-weight="800" fill="${ss.bc || '#556072'}" letter-spacing=".3">${esc(g.badge)}</text>`); y += 15; }
    y += 2;
    tx.push(`<text text-anchor="middle" font-family="${TFONT}" font-size="13" fill="#18202E">${g.lines.map((ln, i) => `<tspan x="0" y="${y + i * 17}">${esc(ln)}</tspan>`).join('')}</text>`);
    const aria = `${KINDS[f.kind].short}, ${STATUS[g.st].short}${g.isRoot ? ', fait ultime' : ''} : ${f.text}`;
    out.push(`<g class="node${isSel ? ' sel' : ''}" transform="translate(${p.x},${p.y})" ${interactive ? `data-act="selNode" data-id="${id}" tabindex="0" role="button" aria-label="${esc(aria)}"` : ''}>${shape}${tx.join('')}</g>`);
  }
  return out.join('');
}

/* ---------------- Vue « Arbre » ---------------- */
function treeStatusLine(a) {
  const t = a.tree;
  if (t.status === 'valide') return `Validé – version ${t.validatedVersion} du ${fmtDT(t.validatedAt)}`;
  return `Provisoire – mis à jour le ${fmtDT(a.updatedAt)}${t.validatedVersion ? ` (dernière version validée : v${t.validatedVersion})` : ''}`;
}
VIEWS.tree = () => {
  const a = S.a, t = a.tree;
  const model = graphModel(a, t.view);
  const chk = treeChecks();
  return `<div class="row" style="margin-bottom:8px"><h1 style="margin:0">5. Arbre des causes</h1><span class="spacer"></span>
    ${t.status === 'valide' ? `<span class="tag ok">${icon('check')} ${esc(treeStatusLine(a))}</span>` : `<span class="tag warn">${icon('alert')} ${esc(treeStatusLine(a))}</span>`}</div>
  ${window.innerWidth < 760 ? `<div class="note info small">${icon('info')}<div>Petit écran : utilisez « Dommage en bas », le plein écran et le zoom (boutons ou deux doigts). La version texte de l'arbre est disponible sous le diagramme.</div></div>` : ''}
  <p class="small muted" style="margin-top:0">On part du dommage et on se demande, pour chaque fait : <b>« Qu'a-t-il fallu pour qu'il se produise ? »</b> puis <b>« A-t-il fallu autre chose ? »</b>. Seuls les faits recueillis sont utilisés.</p>
  <div class="tree-shell">
    <div class="tree-box" id="tree-box">
      <div class="tree-tools" role="toolbar" aria-label="Outils de l'arbre">
        <div class="seg" role="group" aria-label="Arbre affiché"><button data-act="treeView" data-v="travail" aria-pressed="${t.view === 'travail'}" title="Tous les faits reliés, y compris non vérifiés">Arbre de travail</button><button data-act="treeView" data-v="retenu" aria-pressed="${t.view === 'retenu'}" title="Uniquement les faits établis reliés au dommage">Arbre retenu</button></div>
        <div class="seg" role="group" aria-label="Sens de lecture"><button data-act="treeOrient" data-v="h" aria-pressed="${t.orient !== 'v'}" title="Construit de droite à gauche, dommage à droite">Dommage à droite</button><button data-act="treeOrient" data-v="v" aria-pressed="${t.orient === 'v'}" title="Construit de bas en haut, dommage en bas">Dommage en bas</button></div>
        <span class="sep"></span>
        <button class="icon-btn" data-act="zoom" data-v="0.8" aria-label="Zoom arrière" title="Zoom arrière">${icon('zout')}</button>
        <button class="icon-btn" data-act="zoom" data-v="1.25" aria-label="Zoom avant" title="Zoom avant">${icon('zin')}</button>
        <button class="icon-btn" data-act="fit" aria-label="Ajuster à l'écran" title="Ajuster à l'écran">${icon('fit')}</button>
        <button class="icon-btn" data-act="fullscreen" aria-label="Plein écran" title="Plein écran">${icon('full')}</button>
        <span class="sep"></span>
        <button class="btn sm" data-act="exportSVG">${icon('download')}SVG</button>
        <button class="btn sm" data-act="exportPNG">${icon('download')}PNG</button>
        <span class="spacer"></span>
        <button class="btn sm primary" data-act="validateTree">${icon('check')}Valider l'arbre</button>
      </div>
      <div class="tree-canvas" id="tree-canvas" tabindex="0" aria-label="Zone de travail de l'arbre. Glisser pour déplacer, molette ou touches plus et moins pour zoomer, flèches pour déplacer."></div>
      <div class="legend" aria-label="Légende">
        <span><i class="lg-rect"></i>État (habituel)</span><span><i class="lg-circ"></i>Variation (inhabituelle)</span>
        <span><i class="lg-line"></i>Lien établi</span><span><i class="lg-dash"></i>Part d'incertitude</span>
        <span><b style="border:1px solid #8A94A3;border-radius:50%;width:16px;height:16px;display:inline-grid;place-items:center;font-size:.7rem">?</b>Nécessité à confirmer</span>
        <span><b style="border:1px solid #3C4656;border-radius:9px;padding:0 5px;font-size:.7rem">ET</b>Conjonction / disjonction</span>
        <span><i class="lg-nv"></i>Fait non établi (à vérifier, hypothèse, manquant)</span>
      </div>
    </div>
    <aside class="side">${treePanel(model, chk)}</aside>
  </div>
  ${t.view === 'retenu' && model.excluded.length ? `<section class="card" style="margin-top:12px"><h2>${icon('alert')}Éléments présents dans l'arbre de travail mais exclus de l'arbre retenu</h2><p class="small muted">Faits non établis (à vérifier, hypothèse, manquant, en contradiction), ou reliés au dommage seulement par de tels faits.</p><ul class="facts">${model.excluded.map(id => factItem(factById(id))).join('')}</ul></section>` : ''}
  <section class="card" style="margin-top:12px"><h2>${icon('list')}Lecture de l'arbre (version texte)</h2>${outlineHTML(model, a)}</section>`;
};
function outlineHTML(model, a) {
  if (!model.root || !model.nodeIds.has(model.root)) return '<p class="small muted">Définissez d\'abord le fait ultime (dommage).</p>';
  const seen = new Set();
  const node = id => {
    const f = model.facts.get(id); const ants = model.links.filter(l => l.to === id);
    const again = seen.has(id); seen.add(id);
    let s = `<li><button class="btn ghost sm" data-act="selNode" data-id="${id}" style="text-align:left">${esc(f.text)}</button> ${factBadge(f, a)} ${kindTag(f.kind)}`;
    if (again) return s + ' <span class="rel">(déjà décrit plus haut : ce fait a été nécessaire à plusieurs faits – disjonction)</span></li>';
    if (ants.length) s += `<div class="rel">${ants.length > 1 ? 'a nécessité conjointement (conjonction ET) :' : 'a nécessité :'}</div><ul>${ants.map(l => node(l.from) + (l.uncertain ? '<li class="rel">↑ lien avec part d\'incertitude</li>' : '')).join('')}</ul>`;
    return s + '</li>';
  };
  const main = node(model.root);
  const rest = [...model.nodeIds].filter(id => !seen.has(id));
  return `<div class="outline"><ul>${main}</ul>${rest.length ? `<p class="small" style="margin-top:10px"><b>Faits reliés entre eux mais pas au fait ultime :</b> ${rest.map(id => '« ' + esc(trunc(factById(id, a).text, 60)) + ' »').join(', ')}</p>` : ''}</div>`;
}
function treePanel(model, chk) {
  const a = S.a;
  if (!model.root) {
    const F = liveFacts().sort((x, y) => (y.chrono.phase === 'dommage') - (x.chrono.phase === 'dommage'));
    return `<div class="card"><h3>${icon('tree')} Commencer par le dommage</h3><p class="small">L'arbre se construit à partir du <b>dommage</b> (blessure physique ou psychique) : c'est le « fait ultime ».</p>
    ${F.length ? `<div class="radio-list" style="max-height:260px;overflow:auto">${F.map(f => `<label><input type="radio" name="root-pick" value="${f.id}"> <span>${esc(f.text)} ${f.chrono.phase === 'dommage' ? '<span class="pill">dommage</span>' : ''}</span></label>`).join('')}</div>
    <button class="btn primary" style="margin-top:10px" data-act="setRootPick">Définir comme fait ultime</button><hr>` : ''}
    <button class="btn" data-act="newRoot">${icon('plus')}Saisir le fait « dommage »</button>
    ${a.accident.dommage ? `<p class="xs muted">Dommage indiqué à l'étape 1 : « ${esc(a.accident.dommage)} »</p>` : ''}</div>`;
  }
  if (S.sel?.type === 'fact' && factById(S.sel.id) && !factById(S.sel.id).deleted) return factPanel(factById(S.sel.id));
  if (S.sel?.type === 'link' && linkById(S.sel.id) && !linkById(S.sel.id).deleted) return linkPanel(linkById(S.sel.id));
  const orphans = liveFacts().filter(f => !inTree(f.id));
  return `<div class="card"><h3>${icon('info')} Mode d'emploi</h3><ul class="small"><li>Cliquez sur un fait pour l'examiner et lui ajouter un antécédent.</li><li>Cliquez sur un trait pour vérifier le lien.</li><li>Glissez le fond pour déplacer, utilisez la molette ou les boutons pour zoomer.</li></ul>
    <p class="small"><b>${chk.blocking.length}</b> point(s) bloquant(s) avant validation, <b>${chk.warnings.length}</b> point(s) d'attention.</p>
    <button class="btn sm" data-act="selNode" data-id="${model.root}">Sélectionner le fait ultime</button></div>
    ${orphans.length ? `<div class="card"><h3>Faits recueillis non placés <span class="pill">${orphans.length}</span></h3><p class="xs muted">Un fait n'a pas à être placé s'il n'a pas contribué à l'accident.</p><ul class="facts" style="max-height:340px;overflow:auto">${orphans.map(f => `<li class="fact"><div class="ftxt small">${esc(f.text)}<div class="fmeta">${factBadge(f)} ${kindTag(f.kind)}</div></div><button class="btn sm" data-act="linkFrom" data-id="${f.id}" title="Relier à un fait de l'arbre">${icon('link')}Relier</button></li>`).join('')}</ul></div>` : ''}`;
}
function factPanel(f) {
  const a = S.a; const isRoot = a.tree.rootId === f.id;
  const I = ins(f.id), O = outs(f.id);
  const w = wordingIssues(f.text);
  const atts = a.attachments.filter(x => x.factIds.includes(f.id));
  return `<div class="card"><div class="row"><span class="xs muted">${isRoot ? 'Fait ultime (dommage)' : 'Fait sélectionné'}</span><span class="spacer"></span><button class="icon-btn" data-act="unsel" aria-label="Fermer le panneau">✕</button></div>
  <h3 style="margin-top:4px">${esc(f.text)}</h3>
  <div class="row" style="gap:6px">${factBadge(f)} ${kindTag(f.kind)}</div>
  <dl class="small" style="display:grid;grid-template-columns:110px 1fr;gap:3px 8px;margin:10px 0">
    <dt class="muted">Source</dt><dd style="margin:0">${esc(srcTxt(f))}</dd>
    <dt class="muted">Certitude</dt><dd style="margin:0">${esc(CERTAINTY[f.certainty])}</dd>
    <dt class="muted">Moment</dt><dd style="margin:0">${esc(PHASES[f.chrono.phase || ''].label)}${f.chrono.order != null ? ' · n°' + esc(f.chrono.order) : ''}${f.chrono.moment ? ' · ' + esc(f.chrono.moment) : ''}</dd>
    <dt class="muted">Famille</dt><dd style="margin:0">${esc(FAMILIES[f.family]?.label)}</dd>
    ${f.evidence ? `<dt class="muted">Élément probant</dt><dd style="margin:0">${esc(f.evidence)}</dd>` : ''}
    ${f.notes ? `<dt class="muted">Observations</dt><dd style="margin:0">${esc(f.notes)}</dd>` : ''}
    <dt class="muted">Provenance</dt><dd style="margin:0">${esc(originTxt(f))}</dd>
  </dl>
  ${atts.length ? `<div class="row" style="gap:6px">${atts.map(x => x.kind === 'photo' ? `<img src="${safeImg(x.dataUrl)}" alt="${esc(x.caption || x.name)}" style="width:64px;height:48px;object-fit:cover;border-radius:6px;cursor:zoom-in" data-act="viewPhoto" data-id="${x.id}">` : `<span class="pill">📄 ${esc(trunc(x.name, 24))}</span>`).join('')}</div>` : ''}
  ${w.length ? `<div class="check-msgs">${w.map(m => `<div>⚠ ${esc(m)}</div>`).join('')}</div>` : ''}
  <div style="display:flex;flex-direction:column;gap:6px;margin-top:12px">
    <button class="btn primary" data-act="linkTo" data-id="${f.id}">${icon('q')}Qu'a-t-il fallu pour que ce fait se produise ?</button>
    ${!isRoot ? `<button class="btn" data-act="linkFrom" data-id="${f.id}">${icon('link')}Relier à un fait conséquent</button>` : ''}
    <div class="row" style="gap:6px"><button class="btn sm" data-act="editFact" data-id="${f.id}">${icon('edit')}Modifier</button><button class="btn sm" data-act="contradict" data-id="${f.id}">${icon('alert')}Contradiction</button>${f.history.length ? `<button class="btn sm" data-act="factHist" data-id="${f.id}">${icon('clock')}Historique (${f.history.length})</button>` : ''}</div>
    <div class="row" style="gap:6px">${!isRoot ? `<button class="btn sm" data-act="setRoot" data-id="${f.id}">Définir comme fait ultime</button>` : ''}${inTree(f.id) && (I.length || O.length) ? `<button class="btn sm danger" data-act="unlinkNode" data-id="${f.id}">Retirer de l'arbre</button>` : ''}<button class="btn sm danger" data-act="delFact" data-id="${f.id}">${icon('trash')}Retirer le fait</button></div>
  </div>
  <hr><h4>Antécédents (${I.length})</h4>${I.length ? `<ul class="small" style="padding-left:18px">${I.map(l => `<li><button class="btn ghost sm" data-act="selLink" data-id="${l.id}" style="text-align:left">${esc(trunc(factById(l.from).text, 70))}</button> <span class="xs muted">${linkKind(l).join(' + ')}</span></li>`).join('')}</ul>` : '<p class="xs muted">Aucun : qu\'a-t-il fallu pour que ce fait se produise ?</p>'}
  <h4>Conséquents (${O.length})</h4>${O.length ? `<ul class="small" style="padding-left:18px">${O.map(l => `<li><button class="btn ghost sm" data-act="selLink" data-id="${l.id}" style="text-align:left">${esc(trunc(factById(l.to).text, 70))}</button></li>`).join('')}</ul>` : '<p class="xs muted">Aucun.</p>'}</div>`;
}
function originTxt(f) {
  const o = f.origin || {}; const map = { questionnaire: 'Questionnaire', recit: 'Récit initial (étape 1)', document: 'Document joint', photo: 'Photographie', '5pourquoi': 'Questionnement « 5 pourquoi »', complement: 'Complément d\'enquête', arbre: 'Saisi pendant la construction de l\'arbre', manuel: 'Saisie directe', demo: 'Cas fictif de démonstration' };
  let s = map[o.type] || 'Saisie directe';
  if (o.type === 'questionnaire' && f.questionId) s += ' – « ' + trunc(qMeta(f.questionId).q, 60) + ' »';
  if (o.type === 'document' || o.type === 'photo') { const x = S.a.attachments.find(t => t.id === o.ref); s += x ? ' – ' + (x.caption || x.name) : ' (pièce supprimée)'; }
  return s + ' · saisi le ' + fmtDT(f.createdAt);
}
function linkPanel(l) {
  const x = factById(l.from), y = factById(l.to);
  const kinds = linkKind(l);
  const ind = independenceIssues().filter(i => (i.type === 'conjonction' && i.at === l.to && (i.a === l.from || i.b === l.from)) || (i.type === 'disjonction' && i.at === l.from && (i.a === l.to || i.b === l.to)));
  const openC = openContradictionIds();
  const ci = chronoIssue(l);
  const ok = (c, t) => `<li style="list-style:none;margin:3px 0">${c === true ? '<span class="tag ok">✔</span>' : c === false ? '<span class="tag bad">✖</span>' : '<span class="tag warn">!</span>'} ${t}</li>`;
  const wd = wordingIssues(x.text).length + wordingIssues(y.text).length;
  return `<div class="card"><div class="row"><span class="xs muted">Lien sélectionné</span><span class="spacer"></span><button class="icon-btn" data-act="unsel" aria-label="Fermer le panneau">✕</button></div>
  <p class="small" style="margin-top:6px"><b>Antécédent :</b> ${esc(x.text)} ${factBadge(x)}</p>
  <p class="small"><b>Fait conséquent :</b> ${esc(y.text)} ${factBadge(y)}</p>
  <div class="note info small">${icon('info')}<div>${kinds.map(k => esc(KIND_TXT[k])).join('<br>')}</div></div>
  <h4>Vérification du lien</h4><ul style="padding:0;margin:0" class="small">
    ${ok(wd ? 'warn' : true, wd ? 'Formulation à revoir pour au moins un des deux faits' : 'Les deux faits sont formulés de façon factuelle')}
    ${ok(isEst(x) && isEst(y) ? true : 'warn', isEst(x) && isEst(y) ? 'Les deux faits sont établis (rapportés ou corroborés)' : 'Au moins un fait n\'est pas établi : le lien reste hors de l\'arbre retenu')}
    ${ok((x.source.type !== 'apreciser' && y.source.type !== 'apreciser') ? true : 'warn', 'Provenance précisée pour les deux faits')}
    ${ok(l.necessity === 'confirmee' ? true : 'warn', l.necessity === 'confirmee' ? 'Nécessité confirmée par le groupe' : 'Nécessité à confirmer : sans l\'antécédent, le fait se serait-il produit ?')}
    ${ok(!(openC.has(x.id) || openC.has(y.id)), openC.has(x.id) || openC.has(y.id) ? 'Une contradiction non résolue concerne ce lien' : 'Aucune contradiction connue')}
    ${ok(ci ? 'warn' : true, ci ? 'Chronologie à vérifier : ' + esc(ci) : 'Chronologie compatible (ou non renseignée)')}
    ${ok(ind.length ? false : true, ind.length ? 'Faits non indépendants dans une ' + ind[0].type : 'Indépendance respectée')}
    ${ok('warn', "Fait intermédiaire : l'application n'en invente aucun. Si un maillon indispensable manque, insérez un fait recueilli.")}
  </ul>
  <fieldset style="margin-top:10px"><legend class="small">Nécessité</legend><div class="seg"><button data-act="linkNec" data-id="${l.id}" data-v="confirmee" aria-pressed="${l.necessity === 'confirmee'}">Confirmée</button><button data-act="linkNec" data-id="${l.id}" data-v="a-verifier" aria-pressed="${l.necessity !== 'confirmee'}">À confirmer</button></div></fieldset>
  <fieldset style="margin-top:8px"><legend class="small">Tracé</legend><div class="seg"><button data-act="linkUnc" data-id="${l.id}" data-v="0" aria-pressed="${!l.uncertain}">Trait plein</button><button data-act="linkUnc" data-id="${l.id}" data-v="1" aria-pressed="${!!l.uncertain}">Pointillé (incertitude)</button></div></fieldset>
  <div class="field" style="margin-top:8px"><label for="lj-${l.id}" class="small">Sur quelles informations repose ce lien ?</label><textarea id="lj-${l.id}" rows="2" data-linkj="${l.id}">${esc(l.justification || '')}</textarea><div class="hint">Enregistré à la sortie du champ ; les versions précédentes sont conservées.</div></div>
  <div style="display:flex;flex-direction:column;gap:6px;margin-top:10px">
    <button class="btn sm" data-act="insertMid" data-id="${l.id}">${icon('plus')}Insérer un fait intermédiaire</button>
    <button class="btn sm danger" data-act="delLink" data-id="${l.id}">${icon('trash')}Supprimer ce lien</button>
  </div>
  <p class="xs muted" style="margin-top:8px">Créé le ${esc(fmtDT(l.createdAt))}${l.history.length ? ' · ' + l.history.length + ' modification(s)' : ''}</p></div>`;
}

/* ---------------- Interaction : déplacement et zoom ---------------- */
function applyVP() { const g = $('#vp'); if (g) g.setAttribute('transform', `translate(${S.vp.x},${S.vp.y}) scale(${S.vp.k})`); }
function fitTree() {
  const cv = $('#tree-canvas'), L = S.lastLayout; if (!cv || !L) return;
  const cw = cv.clientWidth, ch = cv.clientHeight; if (!cw || !ch) return;
  const k = Math.max(0.15, Math.min(1.1, Math.min(cw / L.width, ch / L.height) * 0.96));
  S.vp = { k, x: (cw - L.width * k) / 2, y: (ch - L.height * k) / 2 }; applyVP();
}
function zoomAt(f, cx, cy) {
  const cv = $('#tree-canvas'); if (!cv) return;
  if (cx == null) { cx = cv.clientWidth / 2; cy = cv.clientHeight / 2; }
  const k2 = Math.max(0.15, Math.min(3, S.vp.k * f));
  S.vp.x = cx - (cx - S.vp.x) * (k2 / S.vp.k); S.vp.y = cy - (cy - S.vp.y) * (k2 / S.vp.k); S.vp.k = k2; applyVP();
}
AFTER.tree = () => {
  const cv = $('#tree-canvas'); if (!cv) return;
  const a = S.a, model = graphModel(a, a.tree.view);
  if (!model.nodeIds.size) {
    S.lastLayout = null;
    cv.innerHTML = `<div class="tree-empty"><div>${icon('tree')}<p><b>${a.tree.view === 'retenu' ? 'L\'arbre retenu est vide.' : 'L\'arbre est vide.'}</b><br>${a.tree.view === 'retenu' ? 'Il ne contient que des faits établis reliés au fait ultime.' : 'Commencez par définir le fait ultime (dommage) dans le panneau.'}</p></div></div>`;
    return;
  }
  const L = layoutModel(model, a, a.tree.orient); S.lastLayout = L;
  cv.innerHTML = `<svg id="tree-svg" role="group" aria-label="Diagramme de l'arbre des causes"><g id="vp">${treeMarkup(L, a, { sel: S.sel })}</g></svg>`;
  if (S.needFit) { S.needFit = false; requestAnimationFrame(fitTree); } else applyVP();
  let drag = null, pinch = null; const pts = new Map();
  const pinchDist = () => { const [p, q] = [...pts.values()]; return Math.hypot(p.x - q.x, p.y - q.y); };
  cv.addEventListener('pointerdown', e => {
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 2) { pinch = { d: pinchDist() }; drag = null; S.dragMoved = true; return; }
    if (e.button !== 0) return;
    drag = { x: e.clientX, y: e.clientY, vx: S.vp.x, vy: S.vp.y, moved: false, id: e.pointerId };
  });
  cv.addEventListener('pointermove', e => {
    if (pts.has(e.pointerId)) pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch && pts.size === 2) { const d = pinchDist(); const [p, q] = [...pts.values()]; const r = cv.getBoundingClientRect(); if (pinch.d > 0) zoomAt(d / pinch.d, (p.x + q.x) / 2 - r.left, (p.y + q.y) / 2 - r.top); pinch.d = d; return; }
    if (!drag) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) > 5) { drag.moved = true; cv.classList.add('dragging'); try { cv.setPointerCapture(drag.id); } catch (er) { } }
    if (drag.moved) { S.vp.x = drag.vx + dx; S.vp.y = drag.vy + dy; applyVP(); }
  });
  const end = e => {
    pts.delete(e.pointerId); if (pts.size < 2 && pinch) { pinch = null; setTimeout(() => S.dragMoved = false, 80); }
    if (drag && drag.moved) { S.dragMoved = true; setTimeout(() => S.dragMoved = false, 50); } drag = null; cv.classList.remove('dragging');
  };
  cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
  cv.addEventListener('wheel', e => { e.preventDefault(); const r = cv.getBoundingClientRect(); zoomAt(e.deltaY < 0 ? 1.12 : 1 / 1.12, e.clientX - r.left, e.clientY - r.top); }, { passive: false });
  cv.addEventListener('keydown', e => {
    if (e.target.closest && e.target.closest('.node') && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); S.sel = { type: 'fact', id: e.target.closest('.node').dataset.id }; S.focusNode = S.sel.id; render(); return; }
    const m = { ArrowLeft: [40, 0], ArrowRight: [-40, 0], ArrowUp: [0, 40], ArrowDown: [0, -40] }[e.key];
    if (m && e.target === cv) { e.preventDefault(); S.vp.x += m[0]; S.vp.y += m[1]; applyVP(); }
    if (e.key === '+' || e.key === '=') { e.preventDefault(); zoomAt(1.2); }
    if (e.key === '-') { e.preventDefault(); zoomAt(1 / 1.2); }
  });
  if (S.focusNode) { const n = cv.querySelector(`.node[data-id="${S.focusNode}"]`); if (n) n.focus({ preventScroll: true }); S.focusNode = null; }
  $$('[data-linkj]').forEach(t => t.addEventListener('change', () => { updateLink(t.dataset.linkj, { justification: t.value.trim() }, 'Justification modifiée'); renderStepper(); }));
};
document.addEventListener('fullscreenchange', () => { setTimeout(fitTree, 120); });

/* ---------------- Exports graphiques ---------------- */
function treeSVGString(a, view, orient) {
  const model = graphModel(a, view); const L = layoutModel(model, a, orient);
  const head = 78, foot = 46; const W = Math.max(L.width, 760), Hh = L.height + head + foot;
  const title = titleOf(a);
  const leg = [['rect', 'État (habituel)'], ['ell', 'Variation (inhabituelle)'], ['dash', "Part d'incertitude"], ['q', 'Nécessité à confirmer'], ['et', 'Conjonction / disjonction'], ['nv', 'Fait non établi']];
  let lx = 20; const legM = leg.map(([k, t]) => {
    let s = '';
    if (k === 'rect') s = `<rect x="${lx}" y="${Hh - 30}" width="22" height="13" fill="#EAF1FB" stroke="#1D58A6" stroke-width="2"/>`;
    if (k === 'ell') s = `<ellipse cx="${lx + 11}" cy="${Hh - 23}" rx="11" ry="8" fill="#FDEEEC" stroke="#B42318" stroke-width="2"/>`;
    if (k === 'dash') s = `<line x1="${lx}" y1="${Hh - 23}" x2="${lx + 22}" y2="${Hh - 23}" stroke="#3C4656" stroke-width="2" stroke-dasharray="6 4"/>`;
    if (k === 'q') s = `<circle cx="${lx + 11}" cy="${Hh - 23}" r="8" fill="#fff" stroke="#8A94A3"/><text x="${lx + 11}" y="${Hh - 19}" text-anchor="middle" font-size="11" font-weight="700" fill="#556072">?</text>`;
    if (k === 'et') s = `<rect x="${lx - 2}" y="${Hh - 32}" width="26" height="18" rx="9" fill="#fff" stroke="#3C4656"/><text x="${lx + 11}" y="${Hh - 19}" text-anchor="middle" font-size="10" font-weight="800">ET</text>`;
    if (k === 'nv') s = `<rect x="${lx}" y="${Hh - 30}" width="22" height="13" fill="#FFF6DD" stroke="#B07000" stroke-width="2" stroke-dasharray="5 3"/>`;
    s += `<text x="${lx + 28}" y="${Hh - 19}" font-size="12" fill="#556072">${esc(t)}</text>`;
    lx += 40 + t.length * 6.4; return s;
  }).join('');
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${Hh}" viewBox="0 0 ${W} ${Hh}" font-family="${TFONT}">
<rect width="100%" height="100%" fill="#ffffff"/>
<text x="20" y="28" font-size="18" font-weight="700" fill="#143F7A">Arbre des causes – ${esc(title)}</text>
<text x="20" y="49" font-size="12.5" fill="#18202E">${esc(view === 'retenu' ? 'Arbre retenu (faits établis reliés au dommage)' : 'Arbre de travail (inclut les éléments non vérifiés, signalés)')} · ${esc(treeStatusLine(a))}</text>
<text x="20" y="67" font-size="11" fill="#556072">Méthode : INRS ED 6163 (3e éd. 2025, révisée nov. 2025) · Export du ${esc(fmtDT(nowISO()))}${a.fictif ? ' · CAS FICTIF' : ''}</text>
<g transform="translate(0,${head})">${model.nodeIds.size ? treeMarkup(L, a, { interactive: false }) : `<text x="20" y="30" font-size="13" fill="#556072">Arbre vide.</text>`}</g>
${legM}
</svg>`;
}
function svgToPngBlob(svg) {
  return new Promise((res, rej) => {
    const m = svg.match(/width="(\d+(?:\.\d+)?)" height="(\d+(?:\.\d+)?)"/);
    const w = +m[1], h = +m[2]; const scale = Math.min(2, 15000 / Math.max(w, h));
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    const img = new Image();
    img.onload = () => { const c = document.createElement('canvas'); c.width = Math.round(w * scale); c.height = Math.round(h * scale); const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url); c.toBlob(b => b ? res(b) : rej(new Error('conversion impossible')), 'image/png'); };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('rendu de l\'image impossible')); };
    img.src = url;
  });
}

/* ---------------- Validation et versions ---------------- */
function snapshotOf(a) { const c = clone(Object.assign({}, a, { versions: [] })); c.attachments.forEach(x => { x.dataUrl = ''; }); return c; }
function createVersion(label, comment, kind) {
  const a = S.a; const n = a.versions.reduce((m, v) => Math.max(m, v.n), 0) + 1;
  a.versions.push({ n, date: nowISO(), label, comment: comment || '', kind: kind || 'manuel', treeStatus: a.tree.status, snapshot: snapshotOf(a) });
  log('version', `Version ${n} enregistrée : ${label}`); changed(); return n;
}
async function validateTree() {
  const c = treeChecks();
  if (c.blocking.length) {
    await modal({ title: "L'arbre ne peut pas encore être validé", wide: true, body: `<div class="note bad">${icon('alert')}<div><b>Points bloquants</b><ul>${c.blocking.map(b => `<li>${esc(b)}</li>`).join('')}</ul></div></div>${c.warnings.length ? `<div class="note warn">${icon('info')}<div><b>Points d'attention</b><ul>${c.warnings.map(b => `<li>${esc(b)}</li>`).join('')}</ul></div></div>` : ''}<p class="small">Vous pouvez continuer à travailler sur l'arbre : il reste affiché comme provisoire.</p>` });
    return;
  }
  const v = await modal({
    title: "Valider l'arbre retenu", wide: true,
    body: `<p>L'arbre retenu comporte <b>${c.ret.nodeIds.size}</b> fait(s) et <b>${c.ret.links.length}</b> lien(s). Une version datée sera enregistrée.</p>
    ${c.warnings.length ? `<div class="note warn">${icon('info')}<div><b>Points d'attention (non bloquants)</b><ul>${c.warnings.map(b => `<li>${esc(b)}</li>`).join('')}</ul></div></div>` : ''}
    <label class="check"><input type="checkbox" id="vt-ok"> <span>Le groupe d'analyse a relu l'arbre et confirme qu'il est construit <b>uniquement à partir des faits recueillis</b>, sans recherche de responsabilité.</span></label>
    <div class="err" id="vt-e" role="alert" hidden>Cochez la case pour confirmer la relecture.</div>
    <div class="field" style="margin-top:10px"><label for="vt-c">Commentaire (ex. composition du groupe, par fonctions)</label><textarea id="vt-c" rows="2"></textarea></div>`,
    buttons: [{ label: 'Annuler', value: 'cancel' }, { label: 'Valider et enregistrer la version', value: 'ok', cls: 'primary', icon: 'check' }],
    onAction: (v, d) => { if (v !== 'ok') return; if (!d.querySelector('#vt-ok').checked) { d.querySelector('#vt-e').hidden = false; return false; } return { c: d.querySelector('#vt-c').value.trim() }; }
  });
  if (!v || typeof v !== 'object') return;
  const t = S.a.tree; t.status = 'valide'; t.validatedAt = nowISO();
  t.validatedVersion = S.a.versions.reduce((m, x) => Math.max(m, x.n), 0) + 1;
  log('arbre', `Arbre validé par le groupe d'analyse${v.c ? ' – ' + v.c : ''}`);
  createVersion(`Arbre validé (v${t.validatedVersion})`, v.c, 'validation');
  toast(`Arbre validé – version ${t.validatedVersion} enregistrée.`, 'ok'); render();
}
async function chooseFact({ title, question, exclude = () => false }) {
  const F = liveFacts().filter(f => !exclude(f));
  let newId = null;
  const res = await modal({
    title, wide: true,
    body: `<div class="note info">${icon('q')}<div><b>${question}</b></div></div><div class="row" style="margin-bottom:8px"><input type="search" id="cf-q" placeholder="Filtrer…" aria-label="Filtrer les faits" style="flex:1"><button type="button" class="btn sm" id="cf-new">${icon('plus')}Saisir un nouveau fait…</button></div>
    <div class="radio-list" id="cf-list" style="max-height:300px;overflow:auto">${F.map(f => `<label data-t="${esc(f.text.toLowerCase())}"><input type="radio" name="cf" value="${f.id}"> <span>${esc(f.text)} ${factBadge(f)}</span></label>`).join('') || '<p class="muted">Aucun fait disponible.</p>'}</div><div class="err" id="cf-e" role="alert" hidden>Choisissez un fait.</div>`,
    buttons: [{ label: 'Annuler', value: 'cancel' }, { label: 'Choisir', value: 'ok', cls: 'primary' }],
    onOpen: d => {
      d.querySelector('#cf-q').addEventListener('input', e => { const q = e.target.value.toLowerCase(); $$('#cf-list label', d).forEach(l => l.hidden = !l.dataset.t.includes(q)); });
      d.querySelector('#cf-new').addEventListener('click', async () => { const id = await factEditor(null, { origin: { type: 'arbre' } }, { why: 'saisi lors de la construction de l\'arbre' }); if (id) { newId = id; const f = factById(id); d.querySelector('#cf-list').insertAdjacentHTML('afterbegin', `<label data-t="${esc(f.text.toLowerCase())}"><input type="radio" name="cf" value="${f.id}" checked> <span>${esc(f.text)} ${factBadge(f)}</span></label>`); } });
    },
    onAction: (v, d) => { if (v !== 'ok') return; const s = d.querySelector('input[name=cf]:checked')?.value; if (!s) { d.querySelector('#cf-e').hidden = false; return false; } return { id: s }; }
  });
  if (newId && !(res && res.id)) render();
  return res && res.id ? res.id : null;
}
async function insertMid(lid) {
  const l = linkById(lid); const x = l.from, y = l.to;
  const m = await chooseFact({ title: 'Insérer un fait intermédiaire', question: `Quel fait recueilli se situe entre « ${esc(trunc(factById(x).text, 60))} » et « ${esc(trunc(factById(y).text, 60))} » ?`, exclude: f => f.id === x || f.id === y || isAncestor(y, f.id) || isAncestor(f.id, x) });
  if (!m) return;
  deleteLink(lid, 'Remplacé par un enchaînement passant par un fait intermédiaire');
  const r1 = addLink(x, m, { necessity: 'a-verifier', justification: 'Insertion d\'un fait intermédiaire' });
  const r2 = addLink(m, y, { necessity: 'a-verifier', uncertain: l.uncertain, justification: l.justification });
  if (r1.err || r2.err) toast((r1.err || r2.err), 'bad');
  else toast('Fait intermédiaire inséré. Confirmez la nécessité des deux nouveaux liens.', 'ok');
  S.sel = { type: 'fact', id: m }; render();
}
