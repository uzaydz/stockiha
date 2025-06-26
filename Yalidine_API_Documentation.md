# توثيق شامل لـ API ياليدين (Yalidine API Documentation)

## 📋 **جدول المحتويات**
1. [نظرة عامة](#نظرة-عامة)
2. [المعلومات الأساسية](#المعلومات-الأساسية)
3. [التوثيق (Authentication)](#التوثيق-authentication)
4. [نقاط النهاية (Endpoints)](#نقاط-النهاية-endpoints)
5. [إنشاء الطرود](#إنشاء-الطرود)
6. [تتبع الطرود](#تتبع-الطرود)
7. [الأسعار والرسوم](#الأسعار-والرسوم)
8. [إدارة البيانات المرجعية](#إدارة-البيانات-المرجعية)
9. [معالجة الأخطاء](#معالجة-الأخطاء)
10. [أمثلة التطبيق](#أمثلة-التطبيق)

---

## 🌟 **نظرة عامة**

**ياليدين** هي شركة جزائرية رائدة في مجال التوصيل السريع، تأسست عام 2013. تقدم API متقدم لإدارة عمليات الشحن والتوصيل في الجزائر.

### 🏆 **المميزات الرئيسية**
- تتبع الطرود في الوقت الفعلي
- تغطية شاملة لكافة الولايات الجزائرية
- دعم خدمة الدفع عند الاستلام (COD)
- شبكة مكاتب توقف (Stop Desk)
- حساب أسعار الشحن تلقائياً
- دعم اللغتين العربية والفرنسية

---

## 🔧 **المعلومات الأساسية**

### **Base URL**
```
https://api.yalidine.app/v1/
```

### **البروتوكولات المدعومة**
- **HTTP Methods**: GET, POST, PUT, DELETE
- **Content-Type**: application/json
- **Character Encoding**: UTF-8
- **JSON Format**: مطلوب في جميع الطلبات

### **الشهادات والجودة**
- **ISO 9001:2015** - إدارة الجودة
- **ISO 14001:2015** - إدارة البيئة
- **ISO 45001:2015** - الصحة والسلامة المهنية

---

## 🔐 **التوثيق (Authentication)**

يستخدم API ياليدين نظام API Key مع Headers مخصصة للتوثيق.

### **Headers مطلوبة**
```http
X-API-ID: your_api_id_here
X-API-TOKEN: your_api_token_here
Content-Type: application/json
```

### **الحصول على API Credentials**
1. سجل دخولك إلى [موقع ياليدين](https://yalidine.com/)
2. اذهب إلى قسم "API Management" أو "إدارة API"
3. أنشئ مفاتيح API جديدة
4. احتفظ بـ `API_ID` و `API_TOKEN` في مكان آمن

### **اختبار صحة المعلومات**
```php
// في CourierDZ
$isValid = $yalidineProvider->testCredentials();
```

```http
GET /v1/wilayas/
X-API-ID: your_api_id
X-API-TOKEN: your_api_token
```

**Response**:
- `200 OK`: المعلومات صحيحة
- `401 Unauthorized`: المعلومات غير صحيحة
- `500 Internal Server Error`: خطأ في الخادم

---

## 🌐 **نقاط النهاية (Endpoints)**

### **1. Wilayas (الولايات)**

#### **جلب جميع الولايات**
```http
GET /v1/wilayas/
```

**Response Example**:
```json
[
  {
    "id": 1,
    "name": "Adrar",
    "name_ar": "أدرار",
    "code": "01"
  },
  {
    "id": 16,
    "name": "Alger", 
    "name_ar": "الجزائر",
    "code": "16"
  }
]
```

### **2. Communes (البلديات)**

#### **جلب جميع البلديات**
```http
GET /v1/communes/
```

### **3. Centers (المراكز)**

#### **جلب جميع المراكز**
```http
GET /v1/centers/
```

### **4. Stop Desks (مكاتب التوقف)**

#### **جلب مكاتب التوقف**
```http
GET /v1/stopdesks/
```

---

## 📦 **إنشاء الطرود**

### **Endpoint**
```http
POST /v1/parcels/
```

### **Headers**
```http
X-API-ID: your_api_id
X-API-TOKEN: your_api_token
Content-Type: application/json
```

### **Request Body**
يجب إرسال مصفوفة من الطرود:

```json
[
  {
    "order_id": "ORD-001",
    "from_wilaya_name": "Alger",
    "firstname": "أحمد",
    "familyname": "بن علي",
    "contact_phone": "0555123456",
    "address": "حي النصر، شارع الاستقلال رقم 123",
    "to_commune_name": "Bordj El Kiffan",
    "to_wilaya_name": "Alger",
    "product_list": "هاتف ذكي + كفر حماية",
    "Price": 25000,
    "do_insurance": true,
    "declared_value": 25000,
    "Length": 15,
    "Width": 8,
    "Height": 2,
    "Weight": 0.3,
    "freeshipping": false,
    "is_stopdesk": false,
    "stopdesk_id": null,
    "has_exchange": false,
    "product_to_collect": false
  }
]
```

### **معايير التحقق المطلوبة**

| الحقل | النوع | المطلوب | الوصف |
|-------|------|---------|--------|
| `order_id` | string | ✅ | معرف الطلب الفريد |
| `from_wilaya_name` | string | ✅ | اسم ولاية المرسل |
| `firstname` | string | ✅ | الاسم الأول للمستلم |
| `familyname` | string | ✅ | اسم العائلة للمستلم |
| `contact_phone` | string | ✅ | رقم هاتف المستلم |
| `address` | string | ✅ | عنوان التسليم |
| `to_commune_name` | string | ✅ | اسم بلدية الوجهة |
| `to_wilaya_name` | string | ✅ | اسم ولاية الوجهة |
| `product_list` | array | ✅ | قائمة المنتجات |
| `Price` | numeric | ✅ | السعر (0-150000) |
| `do_insurance` | boolean | ✅ | هل يتم التأمين |
| `declared_value` | numeric | ✅ | القيمة المصرح بها |
| `Length` | numeric | ✅ | الطول (سم) |
| `Width` | numeric | ✅ | العرض (سم) |
| `Height` | numeric | ✅ | الارتفاع (سم) |
| `Weight` | numeric | ✅ | الوزن (كجم) |
| `freeshipping` | boolean | ✅ | شحن مجاني |
| `is_stopdesk` | boolean | ✅ | التوصيل لمكتب توقف |
| `stopdesk_id` | string | شرطي* | معرف مكتب التوقف |
| `has_exchange` | boolean | ✅ | إمكانية الاستبدال |
| `product_to_collect` | boolean | ✅ | منتج للتحصيل |

*مطلوب إذا كان `is_stopdesk = true`

### **Response Example**
```json
{
  "ORD-001": {
    "status": "true",
    "message": "Parcel created successfully",
    "tracking": "YAL-123456789",
    "order_id": "ORD-001",
    "import_id": 123456,
    "label": "https://api.yalidine.app/labels/YAL-123456789.pdf"
  }
}
```

### **حالات الأخطاء**
```json
{
  "ORD-001": {
    "status": "false",
    "message": "Invalid wilaya name",
    "errors": [
      "from_wilaya_name not found",
      "to_commune_name not found"
    ]
  }
}
```

---

## 🔍 **تتبع الطرود**

### **جلب تفاصيل طرد واحد**

```http
GET /v1/parcels/{tracking_id}
```

**Example Request**:
```http
GET /v1/parcels/YAL-123456789
X-API-ID: your_api_id
X-API-TOKEN: your_api_token
```

**Response Example**:
```json
{
  "total_data": 1,
  "data": [
    {
      "id": 123456,
      "order_id": "ORD-001",
      "tracking": "YAL-123456789",
      "firstname": "أحمد",
      "familyname": "بن علي",
      "contact_phone": "0555123456",
      "address": "حي النصر، شارع الاستقلال رقم 123",
      "to_commune_name": "Bordj El Kiffan",
      "to_wilaya_name": "Alger",
      "from_wilaya_name": "Alger",
      "status": "En cours de livraison",
      "status_ar": "قيد التوصيل",
      "price": 25000,
      "weight": 0.3,
      "length": 15,
      "width": 8,
      "height": 2,
      "created_at": "2024-01-15 10:30:00",
      "updated_at": "2024-01-16 14:22:00",
      "label": "https://api.yalidine.app/labels/YAL-123456789.pdf",
      "delivery_history": [
        {
          "status": "Colis créé",
          "status_ar": "تم إنشاء الطرد",
          "date": "2024-01-15 10:30:00",
          "location": "Alger"
        },
        {
          "status": "Colis collecté",
          "status_ar": "تم جمع الطرد",
          "date": "2024-01-15 16:45:00",
          "location": "Alger"
        },
        {
          "status": "En transit",
          "status_ar": "في الطريق",
          "date": "2024-01-16 08:15:00",
          "location": "Alger Hub"
        },
        {
          "status": "En cours de livraison",
          "status_ar": "قيد التوصيل",
          "date": "2024-01-16 14:22:00",
          "location": "Bordj El Kiffan"
        }
      ]
    }
  ]
}
```

### **حالات التتبع**

| الحالة بالفرنسية | الحالة بالعربية | الوصف |
|-----------------|-----------------|--------|
| `Colis créé` | `تم إنشاء الطرد` | تم إنشاء الطرد في النظام |
| `Colis collecté` | `تم جمع الطرد` | تم جمع الطرد من المرسل |
| `En transit` | `في الطريق` | الطرد في الطريق |
| `Arrivé au centre` | `وصل للمركز` | وصل لمركز التوزيع |
| `En cours de livraison` | `قيد التوصيل` | سيتم توصيله اليوم |
| `Livré` | `تم التوصيل` | تم التوصيل بنجاح |
| `Retourné` | `مُرتجع` | تم إرجاع الطرد |
| `Annulé` | `ملغي` | تم إلغاء الطرد |

---

## 💰 **الأسعار والرسوم**

### **حساب أسعار الشحن**

```http
GET /v1/fees/?from_wilaya_id={from_id}&to_wilaya_id={to_id}
```

**Example Request**:
```http
GET /v1/fees/?from_wilaya_id=16&to_wilaya_id=1
X-API-ID: your_api_id
X-API-TOKEN: your_api_token
```

**Response Example**:
```json
{
  "success": true,
  "data": {
    "from_wilaya": {
      "id": 16,
      "name": "Alger"
    },
    "to_wilaya": {
      "id": 1,
      "name": "Adrar"
    },
    "fees": {
      "home_delivery": {
        "price": 600,
        "currency": "DZD",
        "description": "التوصيل للمنزل"
      },
      "stopdesk_delivery": {
        "price": 450,
        "currency": "DZD", 
        "description": "التوصيل لمكتب التوقف"
      }
    },
    "estimated_delivery_days": "2-3",
    "insurance_rate": "1%",
    "max_weight": "30kg",
    "max_dimensions": "100x100x100cm"
  }
}
```

### **أنواع الأسعار**

| النوع | الوصف | السعر النموذجي |
|------|--------|----------------|
| **Home Delivery** | التوصيل للمنزل | 400-800 دج |
| **Stop Desk** | التوصيل لمكتب التوقف | 300-600 دج |
| **Express** | التوصيل السريع | +100 دج |
| **Insurance** | التأمين | 1% من القيمة |
| **COD Fee** | رسوم الدفع عند الاستلام | 50-100 دج |

---

## 📊 **إدارة البيانات المرجعية**

### **معرفات الولايات**

| ID | الولاية (العربية) | الولاية (Français) | الكود |
|----|------------------|-------------------|------|
| 1 | أدرار | Adrar | 01 |
| 2 | الشلف | Chlef | 02 |
| 3 | الأغواط | Laghouat | 03 |
| 4 | أم البواقي | Oum El Bouaghi | 04 |
| 5 | باتنة | Batna | 05 |
| 6 | بجاية | Béjaïa | 06 |
| 7 | بسكرة | Biskra | 07 |
| 8 | بشار | Béchar | 08 |
| 9 | البليدة | Blida | 09 |
| 10 | البويرة | Bouira | 10 |
| 11 | تمنراست | Tamanrasset | 11 |
| 12 | تبسة | Tébessa | 12 |
| 13 | تلمسان | Tlemcen | 13 |
| 14 | تيارت | Tiaret | 14 |
| 15 | تيزي وزو | Tizi Ouzou | 15 |
| 16 | الجزائر | Alger | 16 |
| ... | ... | ... | ... |

### **الحد الأقصى للأوزان والأبعاد**

| المعيار | الحد الأقصى |
|---------|-------------|
| **الوزن** | 30 كيلوغرام |
| **الطول** | 100 سم |
| **العرض** | 100 سم |
| **الارتفاع** | 100 سم |
| **القيمة** | 150,000 دج |

---

## ⚠️ **معالجة الأخطاء**

### **رموز الاستجابة HTTP**

| الكود | المعنى | الوصف |
|-------|--------|--------|
| `200` | نجح | الطلب تم بنجاح |
| `201` | تم الإنشاء | تم إنشاء الطرد بنجاح |
| `400` | خطأ في الطلب | بيانات غير صحيحة |
| `401` | غير مخول | API credentials خاطئة |
| `404` | غير موجود | الطرد غير موجود |
| `422` | خطأ في التحقق | فشل في التحقق من البيانات |
| `429` | كثرة الطلبات | تجاوز معدل الطلبات المسموح |
| `500` | خطأ في الخادم | خطأ داخلي |

### **أمثلة الأخطاء**

#### **خطأ في المعلومات**
```json
{
  "error": true,
  "message": "Invalid API credentials",
  "code": 401
}
```

#### **خطأ في التحقق**
```json
{
  "error": true,
  "message": "Validation failed",
  "code": 422,
  "details": {
    "firstname": ["الاسم الأول مطلوب"],
    "contact_phone": ["رقم الهاتف غير صحيح"],
    "to_wilaya_name": ["اسم الولاية غير موجود"]
  }
}
```

#### **طرد غير موجود**
```json
{
  "error": true,
  "message": "Tracking ID not found: YAL-123456789",
  "code": 404
}
```

---

## 🔧 **أمثلة التطبيق**

### **1. استخدام مع CourierDZ (PHP)**

```php
<?php

use CourierDZ\CourierDZ;
use CourierDZ\Enum\ShippingProvider;

// إنشاء instance
$courier = new CourierDZ(ShippingProvider::YALIDINE, [
    'id' => 'your_api_id',
    'token' => 'your_api_token'
]);

// اختبار المعلومات
$isValid = $courier->testCredentials();

// إنشاء طرد
$orderData = [
    'order_id' => 'ORD-' . time(),
    'from_wilaya_name' => 'Alger',
    'firstname' => 'أحمد',
    'familyname' => 'بن علي',
    'contact_phone' => '0555123456',
    'address' => 'حي النصر، شارع الاستقلال رقم 123',
    'to_commune_name' => 'Bordj El Kiffan',
    'to_wilaya_name' => 'Alger',
    'product_list' => ['هاتف ذكي', 'كفر حماية'],
    'Price' => 25000,
    'do_insurance' => true,
    'declared_value' => 25000,
    'Length' => 15,
    'Width' => 8,
    'Height' => 2,
    'Weight' => 0.3,
    'freeshipping' => false,
    'is_stopdesk' => false,
    'stopdesk_id' => null,
    'has_exchange' => false,
    'product_to_collect' => false
];

try {
    $result = $courier->createOrder($orderData);
    echo "تم إنشاء الطرد بنجاح: " . $result['tracking'];
} catch (Exception $e) {
    echo "خطأ: " . $e->getMessage();
}

// تتبع طرد
$tracking = 'YAL-123456789';
try {
    $order = $courier->getOrder($tracking);
    echo "حالة الطرد: " . $order['status'];
} catch (Exception $e) {
    echo "خطأ في التتبع: " . $e->getMessage();
}

// حساب الأسعار
$rates = $courier->getRates(16, 1); // من الجزائر إلى أدرار
print_r($rates);
```

### **2. استخدام مع cURL (Bash)**

```bash
#!/bin/bash

API_ID="your_api_id"
API_TOKEN="your_api_token"
BASE_URL="https://api.yalidine.app/v1"

# اختبار المعلومات
curl -X GET "$BASE_URL/wilayas/" \
  -H "X-API-ID: $API_ID" \
  -H "X-API-TOKEN: $API_TOKEN"

# إنشاء طرد
curl -X POST "$BASE_URL/parcels/" \
  -H "X-API-ID: $API_ID" \
  -H "X-API-TOKEN: $API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '[{
    "order_id": "ORD-001",
    "from_wilaya_name": "Alger",
    "firstname": "أحمد",
    "familyname": "بن علي",
    "contact_phone": "0555123456",
    "address": "حي النصر، شارع الاستقلال رقم 123",
    "to_commune_name": "Bordj El Kiffan",
    "to_wilaya_name": "Alger",
    "product_list": "هاتف ذكي",
    "Price": 25000,
    "do_insurance": true,
    "declared_value": 25000,
    "Length": 15,
    "Width": 8,
    "Height": 2,
    "Weight": 0.3,
    "freeshipping": false,
    "is_stopdesk": false,
    "has_exchange": false,
    "product_to_collect": false
  }]'

# تتبع طرد
curl -X GET "$BASE_URL/parcels/YAL-123456789" \
  -H "X-API-ID: $API_ID" \
  -H "X-API-TOKEN: $API_TOKEN"
```

### **3. استخدام مع JavaScript/Node.js**

```javascript
const axios = require('axios');

class YalidineAPI {
    constructor(apiId, apiToken) {
        this.apiId = apiId;
        this.apiToken = apiToken;
        this.baseURL = 'https://api.yalidine.app/v1';
        
        this.client = axios.create({
            baseURL: this.baseURL,
            headers: {
                'X-API-ID': this.apiId,
                'X-API-TOKEN': this.apiToken,
                'Content-Type': 'application/json'
            }
        });
    }

    async testCredentials() {
        try {
            const response = await this.client.get('/wilayas/');
            return response.status === 200;
        } catch (error) {
            return false;
        }
    }

    async createParcel(orderData) {
        try {
            const response = await this.client.post('/parcels/', [orderData]);
            return response.data;
        } catch (error) {
            throw new Error(`خطأ في إنشاء الطرد: ${error.message}`);
        }
    }

    async trackParcel(trackingId) {
        try {
            const response = await this.client.get(`/parcels/${trackingId}`);
            return response.data;
        } catch (error) {
            throw new Error(`خطأ في تتبع الطرد: ${error.message}`);
        }
    }

    async getRates(fromWilayaId, toWilayaId) {
        try {
            const response = await this.client.get(
                `/fees/?from_wilaya_id=${fromWilayaId}&to_wilaya_id=${toWilayaId}`
            );
            return response.data;
        } catch (error) {
            throw new Error(`خطأ في حساب الأسعار: ${error.message}`);
        }
    }
}

// الاستخدام
const yalidine = new YalidineAPI('your_api_id', 'your_api_token');

// مثال على إنشاء طرد
async function createExample() {
    const orderData = {
        order_id: 'ORD-' + Date.now(),
        from_wilaya_name: 'Alger',
        firstname: 'أحمد',
        familyname: 'بن علي',
        contact_phone: '0555123456',
        address: 'حي النصر، شارع الاستقلال رقم 123',
        to_commune_name: 'Bordj El Kiffan',
        to_wilaya_name: 'Alger',
        product_list: 'هاتف ذكي',
        Price: 25000,
        do_insurance: true,
        declared_value: 25000,
        Length: 15,
        Width: 8,
        Height: 2,
        Weight: 0.3,
        freeshipping: false,
        is_stopdesk: false,
        has_exchange: false,
        product_to_collect: false
    };

    try {
        const result = await yalidine.createParcel(orderData);
        console.log('تم إنشاء الطرد بنجاح:', result);
    } catch (error) {
        console.error('خطأ:', error.message);
    }
}

createExample();
```

### **4. استخدام مع Python**

```python
import requests
import json

class YalidineAPI:
    def __init__(self, api_id, api_token):
        self.api_id = api_id
        self.api_token = api_token
        self.base_url = 'https://api.yalidine.app/v1'
        self.headers = {
            'X-API-ID': self.api_id,
            'X-API-TOKEN': self.api_token,
            'Content-Type': 'application/json'
        }
    
    def test_credentials(self):
        """اختبار صحة معلومات API"""
        try:
            response = requests.get(
                f'{self.base_url}/wilayas/',
                headers=self.headers
            )
            return response.status_code == 200
        except:
            return False
    
    def create_parcel(self, order_data):
        """إنشاء طرد جديد"""
        try:
            response = requests.post(
                f'{self.base_url}/parcels/',
                headers=self.headers,
                json=[order_data]
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            raise Exception(f'خطأ في إنشاء الطرد: {e}')
    
    def track_parcel(self, tracking_id):
        """تتبع طرد"""
        try:
            response = requests.get(
                f'{self.base_url}/parcels/{tracking_id}',
                headers=self.headers
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            raise Exception(f'خطأ في تتبع الطرد: {e}')
    
    def get_rates(self, from_wilaya_id, to_wilaya_id):
        """حساب أسعار الشحن"""
        try:
            response = requests.get(
                f'{self.base_url}/fees/?from_wilaya_id={from_wilaya_id}&to_wilaya_id={to_wilaya_id}',
                headers=self.headers
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            raise Exception(f'خطأ في حساب الأسعار: {e}')

# الاستخدام
yalidine = YalidineAPI('your_api_id', 'your_api_token')

# اختبار المعلومات
if yalidine.test_credentials():
    print("✅ معلومات API صحيحة")
else:
    print("❌ معلومات API غير صحيحة")

# إنشاء طرد
order_data = {
    'order_id': f'ORD-{int(time.time())}',
    'from_wilaya_name': 'Alger',
    'firstname': 'أحمد',
    'familyname': 'بن علي',
    'contact_phone': '0555123456',
    'address': 'حي النصر، شارع الاستقلال رقم 123',
    'to_commune_name': 'Bordj El Kiffan',
    'to_wilaya_name': 'Alger',
    'product_list': 'هاتف ذكي',
    'Price': 25000,
    'do_insurance': True,
    'declared_value': 25000,
    'Length': 15,
    'Width': 8,
    'Height': 2,
    'Weight': 0.3,
    'freeshipping': False,
    'is_stopdesk': False,
    'has_exchange': False,
    'product_to_collect': False
}

try:
    result = yalidine.create_parcel(order_data)
    print(f"تم إنشاء الطرد بنجاح: {result}")
except Exception as e:
    print(f"خطأ: {e}")
```

---

## 📞 **الدعم التقني**

### **معلومات الاتصال**
- **الموقع**: https://yalidine.com/
- **البريد الإلكتروني**: contact@yalidine.com
- **الهاتف**: (+213) 0982 30 80 80
- **العنوان**: Zone d'activité Kaidi, lot N°63, Bordj El Kiffan, Alger

### **ساعات العمل**
- **الأحد - الخميس**: 08:00 - 17:00
- **السبت**: 08:00 - 12:00
- **الجمعة**: مغلق

### **الدعم الفني للـ API**
- **وثائق API**: متوفرة في منطقة العضو
- **أمثلة الكود**: متوفرة بعدة لغات برمجة
- **المجتمع**: Discord/Telegram للمطورين

---

## 🔄 **تحديثات وإصدارات**

### **الإصدار الحالي: v1**
- **تاريخ الإطلاق**: 2020
- **الاستقرار**: مستقر وموثوق
- **التوافق مع الماضي**: محتفظ به

### **التحسينات المستقبلية**
- إضافة WebHooks للتحديثات الفورية
- تحسين أداء API
- إضافة endpoints جديدة
- دعم أفضل للرسائل بالعربية

---

## ⚡ **أفضل الممارسات**

### **الأمان**
1. **احتفظ بـ API credentials في متغيرات البيئة**
2. **استخدم HTTPS دائماً**
3. **لا تشارك API credentials في الكود العام**
4. **استخدم rate limiting في تطبيقك**

### **الأداء**
1. **استخدم connection pooling**
2. **cache البيانات المرجعية (الولايات والبلديات)**
3. **معالجة الأخطاء بكفاءة**
4. **استخدم timeouts مناسبة**

### **التطوير**
1. **اختبر في بيئة sandbox أولاً**
2. **سجل جميع الطلبات والاستجابات**
3. **استخدم validation للبيانات قبل الإرسال**
4. **معالجة حالات الأخطاء المختلفة**

---

**© 2024 Yalidine El Djazair Service - جميع الحقوق محفوظة**

*هذا التوثيق محدث حسب آخر المعلومات المتاحة من API ياليدين وتطبيق CourierDZ*