// تبديل اللغة
const langBtn = document.getElementById('lang-btn');
let currentLang = 'ar';

langBtn.addEventListener('click', () => {
    currentLang = currentLang === 'ar' ? 'en' : 'ar';
    document.documentElement.lang = currentLang;
    document.documentElement.dir = currentLang === 'ar' ? 'rtl' : 'ltr';

    // تحديث النصوص
    document.querySelectorAll('[data-ar]').forEach(el => {
        el.textContent = el.getAttribute(`data-${currentLang}`);
    });

    // تحديث الـ Placeholder
    document.querySelectorAll('input, textarea').forEach(el => {
        if (el.id === 'name') el.placeholder = currentLang === 'ar' ? 'الاسم' : 'Name';
        if (el.id === 'email') el.placeholder = currentLang === 'ar' ? 'البريد الإلكتروني' : 'Email';
        if (el.id === 'message') el.placeholder = currentLang === 'ar' ? 'رسالتك' : 'Your Message';
    });
});

// التعامل مع فورم التواصل (Discord Webhook)
document.getElementById('contactForm').addEventListener('submit', function(e) {
    e.preventDefault();

    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const message = document.getElementById('message').value;

    // استبدل الرابط التالي برابط الـ Webhook الخاص بك من سيرفرك في ديسكورد
    // اذهب لـ Server Settings > Integrations > Webhooks
    const webhookURL = "YOUR_DISCORD_WEBHOOK_URL_HERE";

    if (webhookURL === "YOUR_DISCORD_WEBHOOK_URL_HERE") {
        alert("تنبيه للمطور: يرجى وضع رابط الـ Webhook في ملف script.js");
        return;
    }

    const payload = {
        embeds: [{
            title: "📩 رسالة جديدة من البورتفوليو",
            color: 6579300, // لون بنفسجي
            fields: [
                { name: "الاسم", value: name, inline: true },
                { name: "البريد", value: email, inline: true },
                { name: "الرسالة", value: message }
            ],
            timestamp: new Date()
        }]
    };

    fetch(webhookURL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    }).then(() => {
        alert(currentLang === 'ar' ? "تم الإرسال بنجاح!" : "Message Sent!");
        this.reset();
    }).catch(err => {
        console.error(err);
        alert("حدث خطأ!");
    });
});