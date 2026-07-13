#!/usr/bin/env bash
#
# Provisionne l'infrastructure Azure pour Cal.diy (Medianes) :
#   - Resource Group
#   - Azure Container Registry (ACR)
#   - Azure Database for PostgreSQL Flexible Server
#   - Azure Container Apps Environment + Container App
#
# Prérequis : az CLI connecté (`az login`), extension containerapp installée.
# Idempotent : relançable sans tout recréer (utilise `create` qui échoue proprement si déjà présent).
#
# Usage :
#   cp infra/azure/env.sh.example infra/azure/env.sh   # puis remplir
#   source infra/azure/env.sh
#   bash infra/azure/provision.sh
#
set -euo pipefail

: "${LOCATION:?LOCATION requis (ex: francecentral)}"
: "${RG:?RG requis (nom du resource group)}"
: "${ACR_NAME:?ACR_NAME requis (alphanumérique, unique globalement)}"
: "${PG_SERVER:?PG_SERVER requis (nom du serveur Postgres, unique)}"
: "${PG_ADMIN_USER:?PG_ADMIN_USER requis}"
: "${PG_ADMIN_PASSWORD:?PG_ADMIN_PASSWORD requis}"
: "${PG_DB:=calcom}"
: "${ACA_ENV:=cal-env}"
: "${ACA_APP:=cal-web}"
: "${PUBLIC_URL:?PUBLIC_URL requis (ex: https://cal.medianes.xyz)}"

echo "==> Resource group $RG ($LOCATION)"
az group create --name "$RG" --location "$LOCATION" -o none

echo "==> Container Registry $ACR_NAME"
az acr create --resource-group "$RG" --name "$ACR_NAME" --sku Basic --admin-enabled true -o none

echo "==> PostgreSQL Flexible Server $PG_SERVER (Burstable B1ms)"
az postgres flexible-server create \
  --resource-group "$RG" \
  --name "$PG_SERVER" \
  --location "$LOCATION" \
  --admin-user "$PG_ADMIN_USER" \
  --admin-password "$PG_ADMIN_PASSWORD" \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --storage-size 32 \
  --version 16 \
  --public-access 0.0.0.0 \
  --yes -o none || echo "   (serveur déjà existant, on continue)"

echo "==> Base $PG_DB"
az postgres flexible-server db create \
  --resource-group "$RG" --server-name "$PG_SERVER" --database-name "$PG_DB" -o none || true

echo "==> Autoriser les services Azure à joindre Postgres"
az postgres flexible-server firewall-rule create \
  --resource-group "$RG" --name "$PG_SERVER" \
  --rule-name AllowAzureServices \
  --start-ip-address 0.0.0.0 --end-ip-address 0.0.0.0 -o none || true

echo "==> Container Apps environment $ACA_ENV"
az containerapp env create \
  --resource-group "$RG" --name "$ACA_ENV" --location "$LOCATION" -o none || true

PG_HOST="${PG_SERVER}.postgres.database.azure.com"
DB_URL="postgresql://${PG_ADMIN_USER}:${PG_ADMIN_PASSWORD}@${PG_HOST}:5432/${PG_DB}?sslmode=require"

echo ""
echo "=================================================================="
echo "Infrastructure prête."
echo "DATABASE_HOST = ${PG_HOST}"
echo "DATABASE_URL  = (construit dans les secrets du Container App)"
echo ""
echo "Étapes suivantes :"
echo "  1. Générer les secrets d'app :"
echo "       openssl rand -base64 32   # NEXTAUTH_SECRET"
echo "       openssl rand -base64 24   # CALENDSO_ENCRYPTION_KEY (32 chars)"
echo "  2. Builder+pousser l'image (voir le workflow GitHub Actions)."
echo "  3. Créer le Container App avec infra/azure/create-app.sh"
echo "=================================================================="
