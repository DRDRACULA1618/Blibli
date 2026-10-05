# 🍌🔥 BliBli

**BliBli** est une web app progressive (PWA) participative pour identifier les points de vente de **banane braisée à Abidjan**.

Ce dépôt contient un **premier jet fonctionnel et GitHub-ready** conforme à la direction visuelle validée : jaune banane, orange braise, cartes mobiles, statuts de présence et contribution communautaire.

![Maquette de référence](docs/maquette-reference.png)

## Ce qui fonctionne déjà

- carte des points de vente, avec repli visuel si Leaflet ne charge pas ;
- statuts automatiques : vert, orange « Présence à confirmer », gris ;
- fiche détaillée et lancement d’un itinéraire sans compte ;
- favoris enregistrés dans le navigateur ;
- ajout participatif en trois étapes ;
- géolocalisation et déplacement du marqueur ;
- détection d’un point situé à moins de 80 mètres ;
- connexion de démonstration avant une contribution ;
- confirmation « Je la vois ici maintenant » ;
- signalement d’un problème ;
- numéro de vendeuse facultatif et masqué jusqu’à vérification ;
- profil et historique des contributions ;
- PWA installable avec manifeste et service worker ;
- configuration prête à être enveloppée avec Capacitor pour Android et iOS ;
- workflow GitHub Pages inclus.

> La version actuelle utilise `localStorage`. Elle démontre l’expérience et le modèle de données. Avant un lancement public, branchez l’authentification et la base Supabase décrites dans `supabase/`.

## Lancer le projet

Aucune dépendance JavaScript n’est nécessaire pour le prototype.

```bash
npm run dev
```

Puis ouvrez :

```text
http://localhost:5173
```

Le serveur de développement utilise Python 3. Une autre option consiste à servir le dossier avec n’importe quel serveur HTTP statique.

## Vérifier et construire

```bash
npm run check
npm run build
npm run preview
```

Le build est généré dans `dist/`. Il peut être publié sur GitHub Pages, Cloudflare Pages, Netlify ou tout hébergement statique.

## Mettre sur GitHub

```bash
git init
git add .
git commit -m "Premier jet BliBli"
git branch -M main
git remote add origin https://github.com/VOTRE-COMPTE/blibli.git
git push -u origin main
```

Dans GitHub, ouvrez **Settings → Pages → Source** et sélectionnez **GitHub Actions**. Le fichier `.github/workflows/pages.yml` construira et publiera automatiquement l’application.

## Architecture

```text
blibli-app/
├── index.html                  # coquille de l’application
├── styles.css                 # design system et responsive mobile
├── sw.js                      # service worker PWA
├── manifest.webmanifest       # métadonnées d’installation
├── src/
│   ├── main.js                # navigation et interactions
│   ├── store.js               # état, stockage local et contributions
│   ├── views.js               # écrans et composants HTML
│   ├── map.js                 # Leaflet + carte de secours
│   └── utils.js               # dates, distance, itinéraire, images
├── data/vendors.json          # données de démonstration
├── supabase/schema.sql        # schéma de backend recommandé
├── docs/                      # décisions produit et publication mobile
├── capacitor.config.json      # configuration Android/iOS future
└── .github/workflows/pages.yml
```

## Carte

Le prototype charge Leaflet depuis un CDN et les tuiles interactives depuis OpenStreetMap. Sans accès à ces ressources, BliBli affiche une carte simplifiée de secours, afin que le parcours reste testable.

Pour un lancement à grande échelle, choisissez un fournisseur de tuiles conforme au volume prévu et à ses conditions d’utilisation.

## Authentification

Les boutons Google et Apple sont simulés dans cette première version. La règle produit appliquée est :

> **Consulter librement. Se connecter pour contribuer.**

Le compte est demandé pour :

- ajouter un emplacement ;
- confirmer une présence ;
- signaler un problème ;
- proposer un numéro de téléphone.

L’itinéraire et la consultation restent accessibles sans compte.

## Numéros de téléphone

Lorsqu’un contributeur propose un numéro :

- il doit déclarer l’accord de la vendeuse ;
- le numéro reçoit le statut `proposed` ;
- il n’est pas affiché au public ;
- seule une validation ultérieure peut le faire passer à `verified`.

En production, stockez ce champ dans une table protégée et non dans les données publiques du point de vente.

## Android et iOS plus tard

La PWA est compatible avec un emballage Capacitor. Lorsque le MVP est validé :

```bash
./scripts/capacitor-setup.sh
```

Cette commande installe Capacitor, construit la web app puis crée les projets `android/` et `ios/`. Voir [docs/APP_STORES.md](docs/APP_STORES.md) avant toute publication.

## Prochaines étapes recommandées

1. créer le projet Supabase et appliquer `supabase/schema.sql` ;
2. remplacer la connexion simulée par Supabase Auth ;
3. déplacer les contributions du navigateur vers PostgreSQL ;
4. créer un espace de modération ;
5. tester avec un petit groupe dans deux ou trois communes ;
6. améliorer la couverture des vendeuses avant une publication sur les stores.

## Licence

MIT. Les illustrations locales du prototype ont été créées pour BliBli et sont incluses dans ce dépôt.
