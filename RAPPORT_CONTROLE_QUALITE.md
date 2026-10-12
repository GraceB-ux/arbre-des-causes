# Rapport de contrôle qualité – application « Arbre des causes » v1.0.0

Date des tests : 12/10/2026. Les tests ont été faits dans un navigateur Chromium, l'application étant servie en local.
Tous les jeux d'essai sont **fictifs** et identifiés comme tels (« CAS FICTIF », « TEST FICTIF »). Ils servent à vérifier le fonctionnement de l'application. **Ils ne prouvent pas la conformité méthodologique d'une analyse réelle.**

## 1. Analyse méthodologique : source consultée

La brochure INRS ED 6163 a été lue en entier : 28 pages, texte extrait de la visionneuse officielle `ressources.inrs.fr`. Le colophon indique « 3ᵉ édition (2025) révisée en novembre 2025 ».

| Règle de la brochure | Mise en œuvre dans l'application |
|---|---|
| Un fait est concis, observable ou vérifiable. Ce n'est ni une interprétation, ni une opinion, ni un jugement, ni un « fait négatif » (absence de…, manque de…). | Contrôle de formulation en direct, avec des messages explicatifs. Les écarts de formulation dans l'arbre sont signalés comme « informations manquantes ». |
| Distinguer les états (faits habituels) et les variations (faits inhabituels). Les variations guident l'analyse. | Champ « Habituel ou inhabituel ? ». Question « Comment ce travail se déroule-t-il habituellement ? ». Question « Qu'y avait-il d'inhabituel ? ». |
| Construction rétrospective, de droite à gauche ou de bas en haut, à partir du dommage. | Fait ultime obligatoire. Deux orientations proposées : dommage à droite ou dommage en bas. |
| Questions : « Qu'a-t-il fallu pour que Y ? », « X a-t-il été nécessaire à lui seul ? », « A-t-il fallu autre chose ? ». | Assistant de liaison qui pose ces questions, avec la confirmation de la nécessité par le groupe. |
| Trois liens logiques : enchaînement, conjonction (ET), disjonction (ET). Les faits d'une conjonction ou d'une disjonction sont indépendants. | Le type de lien est déduit de la structure de l'arbre. L'indépendance est **vérifiée automatiquement** : alerte à la création, blocage de la validation. |
| Rectangle = état, cercle = variation, un seul fait par forme, pointillé = part d'incertitude. | Conventions graphiques respectées. Signalement des phrases qui contiennent plusieurs faits. |
| Le nombre de faits n'est pas limité. Rester pragmatique sur la profondeur de l'analyse. | Les variations sans antécédent sont signalées. Le groupe peut écarter un point en le justifiant. |
| Recueil : observations et entretiens, sans jugement ni recherche de responsabilité. Cadre d'observation I, T/A, Ma, Mi. | Le questionnaire 5M demandé est affiché avec sa **correspondance** avec le cadre I, T/A, Ma, Mi. |
| Étape 2 : mesures pour chaque fait, quelle que soit sa position. Aucune proposition n'est rejetée a priori. Le choix revient à la direction, selon 7 critères. Niveaux d'action (technique, organisation, stratégie, EPI et consignes). Facteurs potentiels d'accident (FPA). | Pistes « à examiner », séparées de l'arbre. Les 7 critères, les niveaux d'action et le champ FPA sont repris. Aucune piste n'est générée automatiquement. |

**Écarts signalés par rapport à la demande :**

- Les **5M** et les **5 pourquoi** ne figurent pas dans la brochure. Ils sont présentés comme des outils d'aide au recueil, distincts de la méthode.
- La brochure ne définit **pas de grille de vérification des liens**. Les contrôles de l'application (nécessité confirmée, faits établis, provenance, contradictions, chronologie, indépendance) sont des aides. Seule l'indépendance découle directement d'une règle de la brochure.
- La brochure ne fixe pas de règle graphique pour le dommage. Le cadre épais du « fait ultime » est un simple repère visuel.

## 2. Tests fonctionnels

| # | Test demandé | Ce qui a été vérifié | Résultat |
|---|---|---|---|
| 1 | Analyse simple avec peu de faits | Nouvelle analyse « TEST FICTIF » : 5 faits saisis par les questions, fait ultime choisi, 4 liens (dont une conjonction et un fait créé depuis l'assistant), validation, version 1 créée. | ✅ Réussi |
| 2 | Circonstances incomplètes | Phases chronologiques vides, variations sans antécédent, « 5 pourquoi » arrêté faute d'information : les points sont détectés et classés par priorité, avec la question à poser, des exemples de preuves et l'impact. L'indicateur de confiance s'adapte. | ✅ Réussi |
| 3 | Plusieurs enchaînements | Cas fictif : 9 faits, 2 conjonctions, branches parallèles. La disposition est lisible dans les deux orientations. Sur une conjonction non indépendante, l'alerte s'affiche et la validation est bloquée. | ✅ Réussi |
| 4 | Information contradictoire | Contradiction entre deux témoins : les faits sont exclus de l'arbre retenu. La résolution exige une justification (fait retenu ou écarté). Aucune suppression silencieuse : le fait écarté peut être rétabli. | ✅ Réussi |
| 5 | Photographie | Ajout par le sélecteur de fichiers, copie réduite, légende, observation, association à des faits, « fait observé ». Une image endommagée ou un fichier qui n'est pas une image donne un message clair. | ✅ Réussi |
| 6 | Relevé des faits importé | Lecture réussie de TXT, de DOCX (décompression sur l'appareil) et de PDF texte (pdf.js, après accord). Extraction d'un fait par sélection : provenance et pièce associée renseignées. Texte collé à la main pris en charge. | ✅ Réussi |
| 7 | Sauvegarde, fermeture et reprise | Enregistrement automatique, rechargement complet de la page, réouverture : faits, photos et versions conservés. | ✅ Réussi |
| 8 | Export et réimportation | Export .json (téléchargement intercepté pendant le test). Réimportation : choix entre copie et remplacement en cas d'identifiant déjà présent. JSON invalide et format étranger refusés avec un message clair. | ✅ Réussi |
| 9 | Écran réduit | Largeur de 375 px : aucun débordement horizontal sur les 8 étapes. Deux défauts corrigés (colonne chronologique, barre du haut). Zoom à deux doigts ajouté. | ✅ Réussi après correction |
| 10 | Erreurs de saisie et fichiers inexploitables | SIRET invalide (clé de contrôle), champs obligatoires des fenêtres (élément probant d'un fait corroboré, motif pour écarter un point, justification d'une résolution), .doc non lu, DOCX endommagé, PDF sans texte. | ✅ Réussi |

**Autres vérifications :**

- Validation de l'arbre bloquée tant que la nécessité d'un lien n'est pas confirmée.
- Retour automatique au statut « provisoire » après toute modification d'un arbre validé.
- Historique des modifications de chaque fait, avec l'ancienne et la nouvelle valeur.
- Restauration d'une version, l'état courant étant d'abord conservé.
- Exports SVG (XML valide) et PNG.
- Dossier HTML complet, sections A à E et annexe photos.
- Navigation au clavier dans l'arbre (Tab puis Entrée).
- Recherche publique réelle sur un SIRET public : la réponse de l'API est reçue et la source est datée.
- Aucune erreur JavaScript après correction.

**Anomalies trouvées et corrigées pendant les tests :**

- Icônes surdimensionnées.
- Mise en page de la chronologie sur mobile.
- Panneau latéral de l'arbre non défilable.
- Faux positif du contrôle « un seul fait par case ».
- Clé SIRET de La Poste mal gérée.
- Bouton d'impression inactif dans l'aperçu du dossier.

## 3. Limites connues

- **Aucune analyse automatique du sens.** L'application ne déduit pas les liens de cause à effet à partir des textes. C'est volontaire, pour ne rien inventer : le groupe construit l'arbre, guidé par les questions de la méthode, et l'application contrôle la structure. Les contrôles de formulation reposent sur des mots-clés : ils peuvent laisser passer ou signaler à tort certaines phrases.
- **Photos :** aucune interprétation automatique de l'image (ni reconnaissance faciale, ni analyse d'image). Seule une copie réduite est conservée.
- **Documents :** pas de reconnaissance de texte (OCR) pour les PDF scannés. Les formats .doc, .xls, .rtf et .pptx sont conservés mais non lus.
- **Stockage :** il dépend du navigateur et du poste. Il n'y a ni synchronisation ni travail à plusieurs en simultané : on échange les fichiers .json. Les fichiers très volumineux alourdissent la sauvegarde ; la limite est de 30 Mo par fichier.
- **PDF du dossier :** il passe par la fonction d'impression du navigateur. Un bloqueur de fenêtres peut empêcher l'impression ; il reste alors le téléchargement .html.
- **Navigateurs :** les tests ont été faits sous Chromium. La lecture DOCX nécessite un navigateur récent (Chrome/Edge 80+, Firefox 113+, Safari 16.4+).

## 4. Dépendances techniques

- **Aucune dépendance pour le fonctionnement de base.** Le fichier HTML est autonome et le code est intégré.
- **pdf.js 3.11.174** (Mozilla, licence Apache 2.0) : chargé à la demande depuis cdnjs, uniquement pour lire les PDF, après accord.
- **API Recherche d'entreprises** (service public, sans clé d'accès) : appelée uniquement à la demande, après accord.
