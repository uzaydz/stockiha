#!/bin/bash

TOKEN="e9bc9a7b832395e016ef8a8eca6dae20e098437590bcd105a2be3675253c2e04"
KEY="1b64d4579643438c912acca809375a15"
BASE_URL="https://procolis.com/api_v1"

echo "اختبار API Procolis"
echo "=================="

# 1. اختبار بيانات الاعتماد
echo -e "\n1. اختبار بيانات الاعتماد"
curl -v -X GET "$BASE_URL/token" \
  -H "Content-Type: application/json" \
  -H "token: $TOKEN" \
  -H "key: $KEY" | jq '.'

# 2. حساب التعريفة
echo -e "\n2. حساب التعريفة"
curl -v -X POST "$BASE_URL/tarification" \
  -H "Content-Type: application/json" \
  -H "token: $TOKEN" \
  -H "key: $KEY" \
  -d '{
    "IDWilaya": "16",
    "TypeLivraison": "0"
  }' | jq '.'

# 3. إنشاء طلبية جديدة
echo -e "\n3. إنشاء طلبية جديدة"
curl -v -X POST "$BASE_URL/add_colis" \
  -H "Content-Type: application/json" \
  -H "token: $TOKEN" \
  -H "key: $KEY" \
  -d '{
    "Colis": [
      {
        "Tracking": "TEST001",
        "TypeLivraison": "0",
        "TypeColis": "0",
        "Confrimee": "1",
        "Client": "محمد أمين",
        "MobileA": "0550123456",
        "MobileB": "0770123456",
        "Adresse": "حي 20 أوت",
        "IDWilaya": "16",
        "Commune": "باب الزوار",
        "Total": "5000",
        "Note": "اختبار",
        "TProduit": "هاتف ذكي",
        "id_Externe": "EXT001",
        "Source": "API Test"
      }
    ]
  }' | jq '.'

# 4. قراءة معلومات الطلبية
echo -e "\n4. قراءة معلومات الطلبية"
curl -v -X POST "$BASE_URL/lire" \
  -H "Content-Type: application/json" \
  -H "token: $TOKEN" \
  -H "key: $KEY" \
  -d '{
    "Colis": [
      {
        "Tracking": "TEST001"
      }
    ]
  }' | jq '.'