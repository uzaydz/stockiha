#!/bin/bash

TOKEN="e9bc9a7b832395e016ef8a8eca6dae20e098437590bcd105a2be3675253c2e04"
KEY="1b64d4579643438c912acca809375a15"

echo "استعلام عن معلومات Procolis"
echo "=========================="

# محاولة جلب التعريفة
echo "جلب معلومات التعريفة..."
curl -v -X POST "https://procolis.com/tarification" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-API-Key: $KEY" \
  -H "Accept: application/json" \
  -d '{
    "wilaya_depart": "16",
    "wilaya_arrive": "31",
    "type_livraison": "0",
    "poids": 1,
    "longueur": 10,
    "largeur": 10,
    "hauteur": 10
  }' | jq '.' 