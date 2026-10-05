# Préparation Google Play et App Store

BliBli démarre comme PWA, mais le même code web peut être empaqueté dans une application Android/iOS avec Capacitor.

## Avant l’emballage mobile

- connecter une vraie base et une vraie authentification ;
- mettre en place une politique de confidentialité publique ;
- permettre la suppression du compte depuis l’application ;
- prévoir une page web de demande de suppression ;
- modérer les photos, textes, numéros et signalements ;
- ajouter des conditions d’utilisation acceptées avant la première contribution ;
- sécuriser les données privées côté serveur, pas uniquement dans l’interface ;
- prévoir des icônes, captures, textes de boutique et coordonnées de support.

## Création des projets natifs

Depuis macOS pour iOS, ou depuis une machine équipée d’Android Studio pour Android :

```bash
npm run build
./scripts/capacitor-setup.sh
```

Après chaque changement web :

```bash
npm run build
npx cap sync
```

Ouvrir ensuite les projets :

```bash
npx cap open android
npx cap open ios
```

## Points techniques déjà préparés

- interface responsive mobile-first ;
- navigation par hash compatible avec un conteneur WebView ;
- manifeste PWA et icônes ;
- `capacitor.config.json` avec `webDir: dist` ;
- géolocalisation via API web ;
- liens d’itinéraire externes ;
- bouton de suppression du compte dans le profil ;
- architecture de données séparée de l’interface.

## À adapter avant publication

- changer `appId` dans `capacitor.config.json` avec un identifiant que vous contrôlez ;
- configurer les permissions de localisation Android/iOS ;
- remplacer les connexions simulées Google/Apple ;
- ajouter les URL officielles de confidentialité et de support ;
- tester l’application sur de vrais téléphones et avec une connexion lente ;
- vérifier les exigences courantes de chaque boutique au moment de la soumission.
