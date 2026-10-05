# Backend Supabase proposé

Le frontend livré fonctionne avec `localStorage`. Le fichier `schema.sql` fournit une base de départ pour un environnement Supabase de production.

Ordre recommandé :

1. créer un projet Supabase ;
2. exécuter `schema.sql` dans le SQL Editor ;
3. configurer Google, Apple et/ou le lien magique e-mail ;
4. placer l’URL et la clé publique dans un système de configuration ;
5. remplacer les méthodes de `src/store.js` par un adaptateur Supabase ;
6. stocker les photos dans un bucket modéré ;
7. créer une interface d’administration séparée.

Le schéma sépare volontairement les contacts des données publiques.
