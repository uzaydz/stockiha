#!/bin/bash

TOKEN="e9bc9a7b832395e016ef8a8eca6dae20e098437590bcd105a2be3675253c2e04"
KEY="1b64d4579643438c912acca809375a15"

echo "استعلام عن معلومات ZR Express"
echo "=========================="

# إرسال طلب بدون معايير
curl -v -X POST "https://zrexpress.dz/api/tarification" \
  -H "Content-Type: application/json" \
  -H "token: $TOKEN" \
  -H "key: $KEY" \
  -d '{}' | jq '.' 