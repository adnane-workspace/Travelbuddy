# Cartographie mobile

## Démarrage

Depuis `mobile`, installer les versions verrouillées avec `pnpm install --frozen-lockfile`. RNMapbox exige un Development Build. Android nécessite le SDK Android et un appareil ou émulateur. Pour une compilation iOS locale, utiliser macOS et Xcode. Depuis Windows, EAS peut compiler et signer le build iOS avec un compte Expo et les identifiants Apple requis.

```powershell
pnpm exec expo run:android
pnpm exec expo start --dev-client
pnpm dlx eas-cli build --platform ios --profile development
```

Sur macOS, `pnpm exec expo run:ios` permet aussi un build local. Le profil EAS `production` sert aux builds signés destinés aux boutiques. Confirmer les identifiants `com.travelbuddy.app` avant toute publication.

Si le terminal affiche `@rnmapbox/maps native code not available`, le client ouvert ne contient pas Mapbox. Cela arrive avec Expo Go ou un Development Build compilé avant l’ajout du SDK. Pour activer Mapbox sur iPhone, reconstruire et installer le Development Build, démarrer Metro avec `pnpm exec expo start --dev-client`, puis ouvrir le client TravelBuddy installé. Sans module Mapbox, la carte iOS utilise Apple Maps.

## Fournisseurs

### Aperçu MapLibre dans Expo Go

Depuis la racine du dépôt, exécuter `python backend/exploration_preview.py`. Le viewer MapLibre local utilise OpenFreeMap pour la carte et les bâtiments, et Mapterhorn pour le relief, sans jeton. Le serveur écoute sur le port `8766`. Pour comparer avec Cesium, redémarrer le serveur avec `--cesium`, saisir le jeton public à l’invite et ajouter `/cesium/` à l’URL du viewer. Lancer cet aperçu uniquement sur un réseau privé de confiance.

Depuis `mobile`, définir `EXPO_PUBLIC_CESIUM_VIEWER_URL=http://ADRESSE_IPV4_DU_PC:8766/` dans `.env.local`. Sur Windows, `ipconfig` affiche l’adresse IPv4 de l’adaptateur Wi-Fi. Redémarrer avec `pnpm exec expo start --go --clear`, ouvrir le projet sur l’iPhone connecté au même Wi-Fi et sélectionner **Carte → Explorer en 3D** après le démarrage du voyage. Si le chargement échoue, vérifier d’abord que Safari sur l’iPhone peut ouvrir cette même URL et que le pare-feu autorise Python sur le réseau privé. Le viewer publié utilise HTTPS.

Copier `.env.example` vers `.env.local`. Configurer `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN` avec un jeton public `pk.` dédié à l’environnement et limité aux permissions requises. Le jeton sert au rendu natif et à Directions. Les variables `EXPO_PUBLIC_` sont lisibles dans l’application. Garder les clés secrètes côté serveur ou dans les secrets de build. Signaler l’usage du GPS et du routage externe dans les informations de confidentialité.

Déployer le contenu de `exploration/` sur une origine HTTPS contrôlée. Définir `EXPO_PUBLIC_CESIUM_VIEWER_URL` sur l’URL exacte du document, sans redirection. Sur l’hébergement, renseigner `ionToken` avec un jeton Cesium ion public restreint à l’origine et aux ressources nécessaires. Activer `photorealistic` après validation de l’accès commercial, des quotas et de la couverture des destinations. Le viewer conserve les crédits Cesium et Google. Pour une mise en production, servir la distribution Cesium versionnée depuis l’origine contrôlée et définir une politique CSP adaptée aux fournisseurs activés.

Sans configuration Mapbox, la carte de démonstration utilise Apple Maps sur iOS. Sur Android, le repli `react-native-maps` nécessite `EXPO_PUBLIC_ANDROID_GOOGLE_MAPS_API_KEY`, une clé restreinte à Maps SDK for Android, à l’identifiant de l’application et à l’empreinte du certificat de signature. Reconstruire l’application après avoir ajouté la clé. Tant que Mapbox et cette clé sont absents sur Android, un message indique que la carte est indisponible.

Le routage sans jeton Mapbox utilise le service public OSRM/FOSSGIS, adapté aux essais légers. Configurer Mapbox Directions pour la production. Sans URL de viewer, le sélecteur Explorer est masqué. Une erreur du viewer ramène à la carte native.

La recherche actuelle porte sur les étapes locales du voyage. Mapbox Search Box documente la prise en charge des États-Unis, du Canada et de l’Europe. Pour ajouter des lieux proches à Marrakech, valider un fournisseur qui couvre le Maroc et dont les droits autorisent l’affichage et la conservation nécessaires. [Couverture Search Box](https://docs.mapbox.com/api/search/search-box/#supported-geographies)

## Vérification

```powershell
pnpm exec tsc --noEmit
node --test mapping/mapping.test.mjs
```

Sur chaque plateforme, démarrer la démo de Marrakech, vérifier la sélection, les trajets piétons et routiers à proximité, le GPS accepté ou refusé et la progression dans Organisation. Depuis Explorer, vérifier le survol, la sélection conservée au retour, les crédits visibles, le rendu sans tuiles photoréalistes et le retour à Navigation en cas d’erreur. Tester le mode sombre, la perte de réseau et les changements répétés de mode sur un téléphone moins puissant.
