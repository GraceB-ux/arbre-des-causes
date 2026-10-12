# Arbre des causes – Analyse d'accident du travail

Application web autonome d'aide à l'analyse des accidents du travail par la **méthode de l'arbre des causes**. Elle est destinée aux salariés opérationnels des entreprises industrielles.

Référence méthodologique : INRS, brochure **ED 6163** – *La méthode de l'arbre des causes – L'analyse de l'accident du travail*, 3ᵉ édition (2025), révisée en novembre 2025 – <https://www.inrs.fr/media.html?refINRS=ED+6163>.

## Utilisation

1. Téléchargez **`arbre-des-causes.html`**.
2. Ouvrez-le par double-clic dans un navigateur récent (Edge, Chrome, Firefox, Safari). Aucune installation n'est nécessaire.
3. Pour une prise en main, cliquez sur « Découvrir avec un cas fictif ».

Le mode d'emploi détaillé se trouve dans [NOTICE.md](NOTICE.md), et les tests réalisés dans [RAPPORT_CONTROLE_QUALITE.md](RAPPORT_CONTROLE_QUALITE.md).

## Parcours en 8 étapes

1. **Entreprise et accident.** Recherche facultative des informations publiques à partir du SIRET.
2. **Recueil des faits.** Chronologie, questionnement 5M, « 5 pourquoi ». Chaque fait a un statut : rapporté, corroboré, à vérifier, manquant, hypothèse ou contradiction.
3. **Photos et documents.** Lecture des fichiers TXT, DOCX, ODT et PDF contenant du texte.
4. **Synthèse des faits.**
5. **Arbre des causes interactif.**
   - Formes : état = rectangle, variation = cercle.
   - Liens : enchaînement, conjonction et disjonction ET, pointillé en cas d'incertitude.
   - Indépendance des faits d'un même ET vérifiée automatiquement.
   - Validation par le groupe d'analyse.
   - Exports SVG et PNG.
6. **Informations manquantes**, classées par priorité, et compléments d'enquête.
7. **Historique, versions et restauration.**
8. **Pistes de prévention** (critères INRS) et **dossier d'analyse** imprimable (HTML ou PDF).

## Principes

- Les faits proviennent **uniquement des informations fournies par l'entreprise**. L'application n'invente aucun fait ni aucun lien de cause à effet.
- L'analyse ne recherche **pas de responsable** et ne conclut à aucune faute individuelle.
- Traçabilité complète : source de chaque fait, historique des modifications, rien n'est supprimé silencieusement.

## Données et confidentialité

- Les données restent dans le navigateur de l'appareil utilisé. Aucun serveur, aucun traceur.
- Sauvegarde et reprise d'une analyse par fichier `.json`.
- Deux fonctions facultatives utilisent Internet, après accord de l'utilisateur :
  - l'API publique « Recherche d'entreprises », qui ne reçoit que la raison sociale ou le SIRET ;
  - le module de lecture PDF pdf.js 3.11.174, chargé depuis cdnjs. Le fichier PDF n'est pas envoyé.

## Code source

Le fichier `arbre-des-causes.html` est la concaténation, dans l'ordre, des fichiers du dossier [`code-source/`](code-source/) : HTML/CSS, puis les modules JavaScript.

## Avertissement

La brochure INRS n'est pas incluse dans ce dépôt ; consultez-la sur le site de l'INRS. Les contrôles automatiques de l'application sont des aides : ils ne remplacent pas une analyse menée par un groupe formé à la méthode.
