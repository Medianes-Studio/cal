# Déploiement Cal.diy (Medianes) sur Azure Container Apps

Déploie le fork Cal.diy — avec la réimplémentation MIT des fonctionnalités
d'équipe (Teams, disponibilités centralisées) — sur **Azure Container Apps**,
adossé à **Azure Database for PostgreSQL Flexible Server** et **Azure Container
Registry**, avec e-mails via un **fournisseur SMTP externe** (Resend/Postmark/SendGrid).

> Toute la branche `deploy` contient les 12 PRs + le fix tRPC. C'est elle qu'on build.

## Prérequis
- `az` CLI connecté : `az login` (+ `az extension add --name containerapp`)
- Un domaine (ex. `cal.medianes.org`) et l'accès DNS
- Un compte SMTP (Resend recommandé : simple, bonne délivrabilité)
- Docker (pour un build/push manuel) ou GitHub Actions (recommandé)

## 1. Provisionner l'infrastructure
```bash
cp infra/azure/env.sh.example infra/azure/env.sh
# éditez env.sh (mots de passe, domaine, SMTP…)
source infra/azure/env.sh
bash infra/azure/provision.sh
```
Crée : resource group, ACR, Postgres Flexible Server (B1ms), Container Apps env.

## 2. Builder et pousser l'image

### Option A — GitHub Actions (recommandé)
Créez les secrets de dépôt (Settings → Secrets → Actions) :
| Secret | Valeur |
|---|---|
| `AZURE_CREDENTIALS` | `az ad sp create-for-rbac --name cal-deploy --role contributor --scopes /subscriptions/<SUB>/resourceGroups/<RG> --sdk-auth` |
| `ACR_NAME` | ex. `calmedianesacr` |
| `ACA_RESOURCE_GROUP` | ex. `cal-medianes-rg` |
| `ACA_APP` | ex. `cal-web` |
| `PUBLIC_URL` | ex. `https://cal.medianes.org` |

Puis push sur `deploy` (ou lancez le workflow à la main) → build + push + update.

### Option B — Build local manuel
```bash
source infra/azure/env.sh
ACR_SERVER="$(az acr show -n "$ACR_NAME" --query loginServer -o tsv)"
az acr login --name "$ACR_NAME"
docker build \
  --build-arg NEXT_PUBLIC_WEBAPP_URL="$PUBLIC_URL" \
  --build-arg CALCOM_TELEMETRY_DISABLED=1 \
  --build-arg DATABASE_URL="postgresql://build:build@localhost:5432/build" \
  -t "$ACR_SERVER/cal-web:latest" .
docker push "$ACR_SERVER/cal-web:latest"
```

## 3. Créer le Container App
```bash
source infra/azure/env.sh
IMAGE_TAG=latest bash infra/azure/create-app.sh
```
Affiche l'URL `*.azurecontainerapps.io`. Les **migrations Prisma** et le seed
app-store tournent automatiquement au démarrage du conteneur (`scripts/start.sh`).

## 4. Domaine custom + TLS
```bash
# Ajoutez un CNAME cal.medianes.org -> <fqdn azurecontainerapps.io>, puis :
az containerapp hostname add -g "$RG" -n "$ACA_APP" --hostname cal.medianes.org
az containerapp hostname bind -g "$RG" -n "$ACA_APP" --hostname cal.medianes.org \
  --environment "$ACA_ENV" --validation-method CNAME
```
Certificat TLS managé automatique.

## 5. Créer le premier admin
Pas de seed d'utilisateurs en prod. Deux options :
- **Inscription** puis passage en admin via SQL :
  ```sql
  UPDATE users SET role='ADMIN' WHERE email='vous@medianes.org';
  ```
- Ou connectez-vous à la base (psql depuis une IP autorisée) et créez l'utilisateur.

## Variables d'environnement (rappel)
| Variable | Rôle |
|---|---|
| `NEXT_PUBLIC_WEBAPP_URL` / `NEXTAUTH_URL` | URL publique HTTPS (identiques) |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` — **stable**, ne pas régénérer après coup |
| `CALENDSO_ENCRYPTION_KEY` | 32 chars — chiffre les credentials ; **ne jamais changer** après création de données |
| `DATABASE_URL` / `DATABASE_DIRECT_URL` | chaîne Flexible Server + `?sslmode=require` |
| `DATABASE_HOST` | hôte seul (pour l'attente au démarrage) |
| `EMAIL_SERVER_*`, `EMAIL_FROM` | SMTP externe |

## Notes / pièges
- **Build webpack forcé** : le `Dockerfile` appelle `next build --webpack`
  (Turbopack, défaut Next 16, se bloque sur PostCSS).
- **`min-replicas=1`** : pas de scale-to-zero (session + migrations au boot).
- **Pas de licence commerciale requise** : base MIT (cal.diy) + notre code Teams
  MIT natif. Ne pas réintroduire de code `packages/features/ee/**` de cal.com.
- **SSL Postgres** obligatoire (`sslmode=require`) sur Flexible Server.
- **Sauvegardes** : activées par défaut sur Flexible Server (7 j) ; ajustez si besoin.
