#!/usr/bin/env bash
#
# Crée (ou met à jour) le Container App Cal.diy à partir d'une image déjà poussée dans l'ACR.
# À lancer APRÈS provision.sh et APRÈS avoir buildé/poussé l'image.
#
# Usage :
#   source infra/azure/env.sh
#   IMAGE_TAG=<sha-ou-tag> bash infra/azure/create-app.sh
#
set -euo pipefail

: "${RG:?}" ; : "${ACR_NAME:?}" ; : "${ACA_ENV:?}" ; : "${ACA_APP:?}"
: "${PG_SERVER:?}" ; : "${PG_ADMIN_USER:?}" ; : "${PG_ADMIN_PASSWORD:?}" ; : "${PG_DB:=calcom}"
: "${PUBLIC_URL:?}"
: "${NEXTAUTH_SECRET:?NEXTAUTH_SECRET requis (openssl rand -base64 32)}"
: "${CALENDSO_ENCRYPTION_KEY:?CALENDSO_ENCRYPTION_KEY requis (32 chars)}"
: "${IMAGE_TAG:=latest}"
# SMTP (fournisseur externe : Resend / Postmark / SendGrid)
: "${EMAIL_FROM:=notifications@medianes.org}"
: "${EMAIL_SERVER_HOST:?EMAIL_SERVER_HOST requis (ex: smtp.resend.com)}"
: "${EMAIL_SERVER_PORT:=587}"
: "${EMAIL_SERVER_USER:?EMAIL_SERVER_USER requis}"
: "${EMAIL_SERVER_PASSWORD:?EMAIL_SERVER_PASSWORD requis (clé API SMTP)}"

ACR_SERVER="$(az acr show -n "$ACR_NAME" --query loginServer -o tsv)"
ACR_USER="$(az acr credential show -n "$ACR_NAME" --query username -o tsv)"
ACR_PASS="$(az acr credential show -n "$ACR_NAME" --query 'passwords[0].value' -o tsv)"
PG_HOST="${PG_SERVER}.postgres.database.azure.com"
IMAGE="${ACR_SERVER}/cal-web:${IMAGE_TAG}"
DB_URL="postgresql://${PG_ADMIN_USER}:${PG_ADMIN_PASSWORD}@${PG_HOST}:5432/${PG_DB}?sslmode=require"

echo "==> Création / mise à jour du Container App $ACA_APP → $IMAGE"
az containerapp create \
  --resource-group "$RG" \
  --name "$ACA_APP" \
  --environment "$ACA_ENV" \
  --image "$IMAGE" \
  --registry-server "$ACR_SERVER" \
  --registry-username "$ACR_USER" \
  --registry-password "$ACR_PASS" \
  --target-port 3000 \
  --ingress external \
  --min-replicas 1 \
  --max-replicas 3 \
  --cpu 1.0 --memory 2.0Gi \
  --secrets \
      database-url="$DB_URL" \
      nextauth-secret="$NEXTAUTH_SECRET" \
      encryption-key="$CALENDSO_ENCRYPTION_KEY" \
      email-password="$EMAIL_SERVER_PASSWORD" \
  --env-vars \
      NODE_ENV=production \
      NEXT_PUBLIC_WEBAPP_URL="$PUBLIC_URL" \
      NEXTAUTH_URL="$PUBLIC_URL" \
      DATABASE_HOST="$PG_HOST" \
      DATABASE_URL=secretref:database-url \
      DATABASE_DIRECT_URL=secretref:database-url \
      NEXTAUTH_SECRET=secretref:nextauth-secret \
      CALENDSO_ENCRYPTION_KEY=secretref:encryption-key \
      CALCOM_TELEMETRY_DISABLED=1 \
      EMAIL_FROM="$EMAIL_FROM" \
      EMAIL_SERVER_HOST="$EMAIL_SERVER_HOST" \
      EMAIL_SERVER_PORT="$EMAIL_SERVER_PORT" \
      EMAIL_SERVER_USER="$EMAIL_SERVER_USER" \
      EMAIL_SERVER_PASSWORD=secretref:email-password \
  -o none 2>/dev/null \
  || az containerapp update \
       --resource-group "$RG" --name "$ACA_APP" --image "$IMAGE" -o none

FQDN="$(az containerapp show -g "$RG" -n "$ACA_APP" --query properties.configuration.ingress.fqdn -o tsv)"
echo ""
echo "=================================================================="
echo "Container App déployé : https://${FQDN}"
echo ""
echo "IMPORTANT :"
echo " - Faites pointer votre domaine ($PUBLIC_URL) vers ${FQDN} (CNAME)"
echo "   puis: az containerapp hostname add + binding TLS managé."
echo " - Les migrations Prisma tournent au démarrage du conteneur (start.sh)."
echo "=================================================================="
