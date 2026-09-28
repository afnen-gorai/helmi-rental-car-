# Halouma Travel — location de voitures

Application de location de voitures avec une interface React/Vite, une API Node.js/Express et une base de données MySQL.

A car rental platform built with React, Vite, Node.js, Express, and MySQL. It includes car listings, reservations, user authentication, and an admin panel.

## Prérequis

- Node.js et npm
- MySQL

## Installation

1. Créez une base MySQL nommée `car_rental` (ou configurez un autre nom dans `backend/.env`).
2. Copiez `backend/.env.example` vers `backend/.env`, puis renseignez les paramètres MySQL, un secret JWT aléatoire et un mot de passe administrateur fort. Les identifiants OAuth sont facultatifs.
3. Installez les dépendances depuis la racine :

   ```sh
   npm install --prefix backend
   npm install --prefix frontend
   ```

4. Préparez le schéma et les données de démonstration :

   ```sh
   npm run db:setup
   ```

   Cette commande applique les migrations, insère les voitures de démonstration et crée/met à jour le compte admin configuré par `ADMIN_EMAIL` et `ADMIN_PASSWORD`.

## Lancement en développement

Dans deux terminaux, depuis la racine du dépôt :

```sh
npm run dev:backend
npm run dev:frontend
```

L’interface Vite est disponible sur `http://localhost:5173` et l’API sur `http://localhost:5000`.

Pour utiliser une autre URL d’API côté frontend, définissez `VITE_API_URL` dans l’environnement du frontend avant de le lancer.

## Build frontend

```sh
npm run build
```

Les fichiers générés sont placés dans `frontend/dist/` et ne sont pas suivis par Git.

## OAuth

Google et Facebook sont facultatifs. Pour les activer, renseignez les variables de l’`.env` et configurez les URL de callback correspondantes dans les consoles des fournisseurs.

## Scripts utiles

- `npm run db:migrate --prefix backend` : applique les migrations.
- `npm run db:seed --prefix backend` : insère les voitures de démonstration.
- `npm run db:seed-admin --prefix backend` : crée/met à jour le compte admin.
- `npm run integration-test --prefix backend` : exécute le scénario d’intégration; configurez d’abord `ADMIN_EMAIL` et `ADMIN_PASSWORD` dans `backend/.env`.

Ne publiez jamais votre fichier `backend/.env`. Utilisez uniquement des secrets propres à votre environnement.
