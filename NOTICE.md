# Arbre des causes – Notice d'utilisation

Application autonome d'aide à l'analyse des accidents du travail par la méthode de l'arbre des causes.
Référence : INRS ED 6163, *La méthode de l'arbre des causes – L'analyse de l'accident du travail*, 3ᵉ édition (2025), révisée en novembre 2025.

## 1. Ouvrir l'application

- Double-cliquez sur **`arbre-des-causes.html`**. Il s'ouvre dans votre navigateur (Edge, Chrome, Firefox ou Safari récents).
- Aucune installation n'est nécessaire. L'application fonctionne sans Internet, sauf pour deux fonctions facultatives (voir la section 5).
- Pour découvrir l'outil, cliquez sur **« Découvrir avec un cas fictif »**. Ce cas est entièrement inventé et marqué « CAS FICTIF ».

## 2. Mener une analyse

| Étape | Ce que vous faites |
|---|---|
| 1. Entreprise & accident | Décrivez l'entreprise, le lieu, le poste, la tâche et le dommage, puis rédigez un premier récit. Tous les champs sont facultatifs. Ne saisissez ni le nom de la victime ni de détails médicaux. |
| 2. Recueil des faits | Répondez aux questions de chronologie, au questionnement 5M et, si besoin, aux « 5 pourquoi ». **Une réponse correspond à un fait.** Pour chaque fait, indiquez sa source, sa certitude et son statut (rapporté, corroboré, à vérifier, manquant, hypothèse). |
| 3. Photos & documents | Ajoutez vos photos et documents. Décrivez ce que chaque photo montre réellement, puis extrayez les faits des documents en sélectionnant un passage. |
| 4. Synthèse | Relisez tous les faits classés et corrigez-les si nécessaire. |
| 5. Arbre des causes | Choisissez d'abord le **dommage** (le fait ultime). Pour chaque fait, cliquez sur **« Qu'a-t-il fallu pour que ce fait se produise ? »**, puis répondez à **« A-t-il fallu autre chose ? »**. Quand l'arbre est prêt, faites-le valider par le groupe d'analyse. |
| 6. Compléments | Traitez les informations manquantes, en commençant par la priorité haute. Enregistrez chaque réponse avec sa source. |
| 7. Historique | Consultez les versions, le journal des modifications et les éléments retirés. Vous pouvez restaurer une version antérieure. |
| 8. Prévention & dossier | Le groupe propose des pistes de prévention pour chaque fait. Imprimez ou téléchargez ensuite le dossier complet. |

Dans l'arbre :
- un **rectangle** représente un état (fait habituel) ;
- un **cercle** représente une variation (fait inhabituel) ;
- **« ET »** signale une conjonction ou une disjonction ;
- un **trait en pointillé** signale une part d'incertitude ;
- un **« ? »** signale un lien dont la nécessité reste à confirmer ;
- un **cadre en tirets** signale un fait non établi.

L'**arbre de travail** contient tous les faits reliés. L'**arbre retenu** ne garde que les faits établis reliés au dommage.

## 3. Sauvegarder et reprendre

- L'analyse est **enregistrée automatiquement** dans le navigateur de cet ordinateur. Pour la reprendre, rouvrez le fichier, puis cliquez sur **« Ouvrir »** dans la liste des analyses enregistrées.
- **Attention :** ce stockage n'est pas une sauvegarde garantie. Il peut disparaître si l'on nettoie le navigateur, si l'on change de poste ou de navigateur, ou en navigation privée.
- Cliquez régulièrement sur **« Sauvegarder (.json) »**, en haut à droite. Le fichier contient toute l'analyse, y compris les photos, les documents et les versions. Rangez-le dans un dossier sécurisé de l'entreprise.
- Pour reprendre une analyse sur un autre poste, utilisez **« Importer une sauvegarde (.json) »** sur la page d'accueil.

## 4. Exporter

- **Arbre** : boutons SVG (vectoriel, net à toute taille) et PNG, à l'étape 5.
- **Dossier d'analyse** : à l'étape 8, cliquez sur « Imprimer / enregistrer en PDF » (choisissez ensuite « Enregistrer au format PDF » dans la fenêtre d'impression) ou sur « Télécharger le dossier (.html) ».
- **Données** : la sauvegarde .json.

## 5. Fonctions qui utilisent Internet (facultatives, avec votre accord)

| Fonction | Ce qui est envoyé | Sans Internet |
|---|---|---|
| Recherche des informations publiques sur l'entreprise (étape 1) | La raison sociale **ou** le SIRET uniquement, à `recherche-entreprises.api.gouv.fr` (service public). Aucune information sur l'accident n'est envoyée. | L'application reste utilisable : renseignez le secteur vous-même. |
| Lecture du texte des fichiers PDF (étape 3) | Rien : seul le module de lecture pdf.js 3.11.174 est téléchargé depuis `cdnjs.cloudflare.com`. Le PDF est lu sur votre ordinateur. | Le PDF est conservé mais non lu : collez son texte avec le bouton « Coller le texte du document ». |
| Liens vers la brochure INRS, la fiche INSEE du code NAF et l'annuaire des entreprises | Rien, sauf si vous cliquez sur le lien. | — |

## 6. Confidentialité

- Aucune donnée n'est envoyée à un serveur. L'application ne contient ni traceur, ni publicité, ni outil de mesure d'audience.
- Les photos sont enregistrées en copie réduite (1 800 pixels au maximum). Leurs métadonnées, dont la position GPS, sont supprimées. Conservez les originaux.
- Pour tout effacer, cliquez sur **« Supprimer toutes les données de cet appareil »** sur la page d'accueil.
