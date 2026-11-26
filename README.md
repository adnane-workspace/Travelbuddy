# TravelBuddy

Application mobile de voyage en React Native, Expo et TypeScript. La démonstration propose un programme à Fès, une carte satellite, des itinéraires à pied ou en voiture et un guidage GPS dans l’application.

## Prérequis

- Node.js 24 et pnpm. Les vérifications locales utilisent Node.js 24 et pnpm 11.
- Python 3.12 ou une version compatible pour les services Python.
- Un téléphone avec une version d’Expo Go compatible avec Expo SDK 58, ou un Development Build du projet.
- Une connexion Internet pour les cartes et le calcul des itinéraires.
- Pour les essais locaux, le téléphone et le PC connectés au même réseau Wi-Fi.

Les commandes ci-dessous utilisent PowerShell sous Windows, depuis `C:\PROJECTS\TravelBuddy`. Les versions des dépendances mobiles sont enregistrées dans `mobile/pnpm-lock.yaml`.

## 1. Installer le projet

```powershell
cd C:\PROJECTS\TravelBuddy
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend/requirements.txt
cd mobile
pnpm install --frozen-lockfile
```

L’utilisation directe de `.venv\Scripts\python.exe` permet d’exécuter Python dans l’environnement du projet.

## 2. Configurer l’application mobile

Créer `mobile/.env.local` si ce fichier n’existe pas déjà. Il est ignoré par Git. Pour un premier essai avec Expo Go et le routage public, utiliser cette configuration.

```dotenv
EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN=
EXPO_PUBLIC_CESIUM_VIEWER_URL=
EXPO_PUBLIC_ANDROID_GOOGLE_MAPS_API_KEY=
EXPO_PUBLIC_IOS_GOOGLE_MAPS_API_KEY=
```

`mobile/.env.example` décrit les variables disponibles. Remplacer ses valeurs de démonstration avant de les utiliser, notamment le jeton `pk.replace-with-a-dedicated-public-token` et l’adresse `https://example.com/exploration/`.

| Variable | Usage |
| --- | --- |
| `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN` | Jeton public Mapbox commençant par `pk.`. Active Mapbox Directions pour les itinéraires et permet la carte Mapbox sur les builds compatibles. Une valeur vide utilise OSRM/FOSSGIS pour le routage. |
| `EXPO_PUBLIC_CESIUM_VIEWER_URL` | Adresse de l’aperçu Explorer, utilisée pour Google Maps, MapLibre et Cesium. En développement, une valeur vide permet de déduire l’adresse du PC depuis Metro et d’utiliser le port `8766`. |
| `EXPO_PUBLIC_ANDROID_GOOGLE_MAPS_API_KEY` | Clé Maps SDK for Android pour un build natif du projet. |
| `EXPO_PUBLIC_IOS_GOOGLE_MAPS_API_KEY` | Clé Maps SDK for iOS pour un build natif du projet. |

Les variables `EXPO_PUBLIC_` sont embarquées dans l’application. Utiliser des clés publiques restreintes aux API et applications concernées. Après une modification de `.env.local`, redémarrer Expo. Une modification des clés des SDK natifs demande aussi une reconstruction du build.

## 3. Démarrer sur téléphone

Dans un terminal dédié, depuis `mobile`.

```powershell
pnpm exec expo start --go --clear
```

Ouvrir le projet à partir du QR code affiché par Expo. Sur iPhone, utiliser l’appareil photo puis ouvrir le lien avec Expo Go. Accepter la localisation au moment du calcul du trajet.

Dans Organisation, appuyer sur **Démarrer le voyage**. L’application ouvre la carte et calcule le trajet vers la première étape, en voiture par défaut. Choisir **À pied** pour changer de mode. Après le calcul, **Démarrer le guidage** lance le suivi GPS dans TravelBuddy.

Le guidage affiche la prochaine manœuvre et une estimation de la distance et du temps restants. Le bouton **Recalculer l’itinéraire** apparaît en cas de sortie du parcours. **Quitter** arrête le suivi, puis **Marquer comme terminée** permet de passer à l’étape suivante.

Le suivi actuel fonctionne au premier plan. Les instructions sont visuelles et le recalcul se déclenche manuellement. Les essais GPS sur téléphone restent nécessaires pour valider le comportement sur route. Le temps restant est estimé à partir de la progression sur le trajet calculé.

## 4. Activer Explorer

Le serveur d’aperçu sert les fichiers de `mobile/exploration` sur le port `8766`. Choisir un seul mode par lancement et garder ce terminal ouvert.

### MapLibre

Depuis la racine du projet.

```powershell
.\.venv\Scripts\python.exe backend/exploration_preview.py
```

Ce mode utilise OpenFreeMap et le relief Mapterhorn.

### Google Maps

Préparer une clé navigateur Google Cloud avec Maps JavaScript API et Places API (New) activées. Le projet Google Cloud doit avoir la facturation configurée. Restreindre la clé aux API utilisées et à l’origine de l’aperçu, par exemple `http://192.168.1.7:8766/*`.

```powershell
.\.venv\Scripts\python.exe backend/exploration_preview.py --google
```

Saisir la clé à l’invite. Le serveur fournit cette clé au navigateur pour charger Google Maps. Ce mode propose les couches cartographiques, Street View selon la couverture et une recherche de lieux. Le code utilise `DEMO_MAP_ID` pour les essais.

Dans Explorer, choisir **Restaurants**, **Cafés** ou **Stations** pour rechercher jusqu’à huit lieux dans un rayon de 2 km autour du centre de la carte. Déplacer la carte puis relancer la catégorie pour changer de zone. Sélectionner un résultat et appuyer sur **Ajouter comme prochaine étape**. TravelBuddy revient à l’itinéraire, où **À pied** ou **En voiture** calcule le trajet vers le lieu ajouté. Cette étape apparaît aussi dans Organisation. Les ajouts sont conservés pendant la session et sont réinitialisés au redémarrage de l’application.

La recherche utilise Places API (New) et les quotas de la clé Google configurée. Les champs demandés sont l’identifiant, le nom, l’adresse et la position du lieu.

### Cesium

```powershell
.\.venv\Scripts\python.exe backend/exploration_preview.py --cesium
```

Saisir le jeton public Cesium ion demandé. Utiliser une URL se terminant par `/cesium/` dans la configuration mobile.

### Connecter le téléphone à l’aperçu

Trouver l’adresse IPv4 de la carte Wi-Fi du PC.

```powershell
ipconfig
```

Renseigner l’adresse réelle dans `mobile/.env.local`.

```dotenv
EXPO_PUBLIC_CESIUM_VIEWER_URL=http://192.168.1.7:8766/
```

Pour Cesium, utiliser `http://192.168.1.7:8766/cesium/`. Redémarrer Expo, ouvrir Carte, réduire le panneau Itinéraire, puis choisir **Explorer en 3D**. Le mode guidage utilise la carte native.

Tester la même URL dans Safari sur l’iPhone. L’adresse `localhost` sur le téléphone désigne le téléphone lui-même. Autoriser Python sur le réseau privé dans le pare-feu Windows si la connexion est bloquée. Le serveur d’aperçu écoute sur toutes les interfaces et est destiné aux essais sur un réseau privé de confiance.

## Cartes selon l’environnement

| Environnement | Carte native utilisée |
| --- | --- |
| iPhone avec Expo Go | Apple Maps |
| Android avec Expo Go | Google Maps |
| Build iOS du projet | Apple Maps par défaut, Google Maps avec la clé iOS configurée lors de la compilation |
| Build Android du projet | Google Maps avec la clé Android configurée. Mapbox peut prendre le relais si le module natif et le jeton Mapbox sont disponibles. |

Google Maps dans Explorer est accessible via le serveur d’aperçu, y compris sur iPhone avec Expo Go. La recherche en haut de la carte native porte sur les étapes du voyage. Explorer avec Google Maps propose sa propre recherche de lieux.

## API Python

L’API FastAPI expose actuellement un endpoint de santé. La démonstration mobile utilise les étapes locales et appelle directement les services de routage. Le serveur d’aperçu fonctionne indépendamment de FastAPI.

Depuis la racine du projet, dans un terminal dédié.

```powershell
.\.venv\Scripts\python.exe -m uvicorn backend.main:app --reload
```

- [État de l’API](http://127.0.0.1:8000/health)
- [Documentation interactive](http://127.0.0.1:8000/docs)

## Development Build

Pour utiliser les SDK natifs configurés pour TravelBuddy, construire et installer un Development Build.

Sur Windows avec le SDK Android et un appareil ou émulateur configuré, depuis `mobile`.

```powershell
pnpm exec expo run:android
```

Pour construire iOS avec EAS depuis Windows, un compte Expo et les identifiants Apple nécessaires à la signature sont requis.

```powershell
pnpm dlx eas-cli build --platform ios --profile development
```

Après l’installation du build sur le téléphone, démarrer Metro dans ce mode.

```powershell
pnpm exec expo start --dev-client
```

Sur macOS avec Xcode, `pnpm exec expo run:ios` permet une compilation locale. Les profils EAS sont définis dans `mobile/eas.json`.

## Vérifications

Depuis `mobile`.

```powershell
pnpm exec tsc --noEmit --noUnusedLocals --noUnusedParameters
node --test mapping/mapping.test.mjs
```

Sur téléphone, vérifier le calcul à pied et en voiture, le refus de la localisation, le démarrage et l’arrêt du guidage, la progression entre les étapes, la sortie du parcours et le recalcul. Vérifier aussi Explorer avec le serveur lancé puis arrêté.

## Dépannage

| Symptôme | Vérification |
| --- | --- |
| Expo reste sur `Starting project…` | Arrêter avec `Ctrl+C`, puis lancer `pnpm exec expo start --go --clear`. Pour obtenir les détails dans PowerShell, définir `$env:EXPO_DEBUG='1'` avant la commande. |
| Expo Go refuse le projet | Vérifier la compatibilité du client avec Expo SDK 58, ou utiliser un Development Build compatible. |
| Explorer ne charge pas | Vérifier le serveur sur `8766`, l’adresse IPv4, le Wi-Fi et l’accès à l’URL depuis le navigateur du téléphone. |
| Google Maps indique une erreur de clé | Vérifier les API activées, la facturation et les restrictions de la clé correspondant au navigateur ou au SDK natif utilisé. |
| Le trajet échoue | Vérifier la localisation, Internet, la couverture du service de routage et le jeton Mapbox s’il est renseigné. |
| Le guidage attend la position | Garder l’application au premier plan et vérifier l’autorisation de localisation précise et la réception GPS. |
| Une clé native semble ignorée | Reconstruire et réinstaller le Development Build après la modification de la configuration. |

## Structure

```text
backend/
  main.py                  API FastAPI
  exploration_preview.py   Serveur local des aperçus cartographiques
  requirements.txt         Dépendances Python
mobile/
  App.tsx                  Organisation, itinéraires et état du guidage
  TripMap.native.tsx       Sélection du moteur de carte et commandes
  demoTrip.ts              Étapes du voyage de démonstration
  mapping/                 Cartes natives, routage, guidage et tests
  exploration/             Aperçus Google Maps, MapLibre et Cesium
  app.config.ts            Configuration dynamique des clés natives
  app.json                 Configuration Expo
  eas.json                 Profils de compilation EAS
```
