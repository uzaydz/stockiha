const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3333;

// تكوين الخادم
app.use(cors());
app.use(express.json());

// تهيئة عميل واتساب
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  }
});

// حالة الاتصال
let isClientReady = false;

// عند إنشاء رمز QR
client.on('qr', (qr) => {
  
  qrcode.generate(qr, { small: true });
});

// عند الاستعداد
client.on('ready', () => {
  isClientReady = true;
  
});

// عند فقدان الاتصال
client.on('disconnected', (reason) => {
  isClientReady = false;
  
  // إعادة تهيئة العميل عند فقدان الاتصال
  client.initialize();
});

// تهيئة العميل
client.initialize();

// واجهة API لإرسال الرسائل
app.post('/send-message', async (req, res) => {
  try {
    const { phone, message } = req.body;
    
    if (!phone || !message) {
      return res.status(400).json({ 
        success: false, 
        error: 'Phone number and message are required' 
      });
    }

    if (!isClientReady) {
      return res.status(503).json({ 
        success: false, 
        error: 'WhatsApp client is not ready. Please scan QR code in the server console.' 
      });
    }
    
    // تنسيق رقم الهاتف (إزالة + وإضافة @c.us)
    const formattedPhone = phone.replace('+', '').replace(/\D/g, '') + '@c.us';
    
    // إرسال الرسالة
    const result = await client.sendMessage(formattedPhone, message);
    
    return res.status(200).json({ 
      success: true, 
      messageId: result.id._serialized,
      info: 'Message sent successfully'
    });
  } catch (error) {
    console.error('Error sending message:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'Error sending the message' 
    });
  }
});

// طريق للتحقق من حالة الاتصال
app.get('/status', (req, res) => {
  res.json({ 
    connected: isClientReady,
    status: isClientReady ? 'WhatsApp is connected' : 'WhatsApp is not connected' 
  });
});

// تشغيل الخادم
app.listen(port, () => {
  
  
}); 