# Yapay Zeka Asistanı Kurulum Rehberi

## 🚀 Google Gemini AI - Ücretsiz ve Güçlü!

Yapay zeka asistanı başarıyla sitenize eklendi. **Google Gemini** kullanarak 1,500 ücretsiz istek/gün ile çalışır!

---

## 📝 ADIM 1: Google Gemini API Anahtarı Alın

### 1.1 Google AI Studio'ya Gidin:

1. **Web sitesine gidin**: https://makersuite.google.com/app/apikey
   - veya Google'da "Google AI Studio" arayın
2. **Google hesabınızla giriş yapın** (Gmail hesabı)

### 1.2 API Anahtarı Oluşturun:

1. **"Get API Key"** veya **"Create API Key"** butonuna tıklayın
2. **"Create API key in new project"** seçeneğini seçin
   - (veya mevcut bir projeyi kullanabilirsiniz)
3. **API anahtarınızı kopyalayın**
   - Şuna benzer görünür: `AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`

### 1.3 ⚠️ ÖNEMLİ NOTLAR:
- API anahtarınızı güvenli bir yerde saklayın
- Asla başkalarıyla paylaşmayın
- GitHub'a yüklerken dikkatli olun

---

## 🔧 ADIM 2: API Anahtarını Koda Ekleyin

### 2.1 index.html dosyasını açın:

1. VSCode'da `index.html` dosyasını açın
2. En alta doğru inin (JavaScript bölümü)
3. Şu satırı bulun:

```javascript
const GEMINI_API_KEY = 'YOUR_GOOGLE_GEMINI_API_KEY_HERE';
```

### 2.2 API Anahtarını Yapıştırın:

`YOUR_GOOGLE_GEMINI_API_KEY_HERE` yerine kendi API anahtarınızı yazın:

**ÖNCE:**
```javascript
const GEMINI_API_KEY = 'YOUR_GOOGLE_GEMINI_API_KEY_HERE';
```

**SONRA:**
```javascript
const GEMINI_API_KEY = 'AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';
```

### 2.3 Dosyayı Kaydedin:
- VSCode'da `Ctrl+S` (Windows) veya `Cmd+S` (Mac)
- Değişiklikler kaydedildi ✅


---

## ✅ ADIM 3: Test Edin

### 3.1 Web Sitesini Açın:

1. `index.html` dosyasını tarayıcıda açın
2. **"YAPAY ZEKA MÜHENDİSİ"** butonuna tıklayın
3. Chat penceresi açılacak

### 3.2 Test Soruları (Türkçe):

Şu soruları deneyin:

- "Hangi ürünler var?"
- "80×120 palet fiyatı nedir?"
- "Özel ölçü kasa yaptırabilir miyim?"
- "ISPM-15 sertifikanız var mı?"
- "Nasıl sipariş verebilirim?"
- "Teslimat ne kadar sürer?"

### 3.3 Başarılı Test Göstergeleri:

✅ Mesaj gönderildiğinde "yazıyor..." animasyonu görünür  
✅ 1-3 saniye içinde **Türkçe** yanıt gelir  
✅ Yanıt Orca ürünleri hakkında **doğru bilgi** içerir  
✅ İletişim bilgileri (telefon, e-posta) **doğru** verilir

---

## 💎 Ücretsiz Kota Bilgileri

### Google Gemini 1.5 Flash - Free Tier:

- ✅ **1,500 istek/gün** (günlük)
- ✅ **15 istek/dakika** (anlık limit)
- ✅ **Kredi kartı gerektirmez**
- ✅ **Ömür boyu ücretsiz** (fair use kapsamında)

### Örnek Kullanım:
- Günde 100 müşteri sohbeti ≈ 200-300 istek
- **Sonuç:** Küçük-orta işletmeler için ideal! 💡

---

## 🛡️ Güvenlik Ayarları (Opsiyonel)

### Temel Güvenlik (Demo/Test İçin):
API anahtarını doğrudan kodda bırakabilirsiniz. Ek ayar gerekmez.

### Gelişmiş Güvenlik (Üretim İçin):

#### 1. Domain Kısıtlaması Ekleyin:

1. **Google AI Studio**'ya gidin
2. **API Keys** sayfasına tıklayın
3. API anahtarınıza tıklayın
4. **"Add an API restriction"** > **"HTTP referrers"** seçin
5. Domain'inizi ekleyin:
   - `*.orcaahsap.com.tr`
   - veya `yourdomain.com`
6. **Save** butonuna tıklayın

#### 2. Backend Proxy Kullanın (En Güvenli):

API anahtarını client-side kodda saklamak yerine:

**Önerilen Ücretsiz Çözümler:**
- **Cloudflare Workers** (ücretsiz tier)
- **Vercel Functions** (ücretsiz tier)
- **Netlify Functions** (ücretsiz tier)

**Basit Cloudflare Worker Örneği:**
```javascript
export default {
  async fetch(request) {
    const API_KEY = 'YOUR_KEY_HERE'; // Kullanıcılardan gizli
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;
    
    return fetch(url, {
      method: 'POST',
      headers: request.headers,
      body: request.body
    });
  }
}
```

---

## 🔧 Sorun Giderme

### ❌ Sık Karşılaşılan Sorunlar:

**1. Chat Yanıt Vermiyor**
- ✓ API anahtarı doğru mu? (boşluk yok, tam kopyalandı mı?)
- ✓ Tarayıcı konsolunu açın (F12) - hata var mı?
- ✓ 1,500 istek/gün limitini aştınız mı?
- ✓ API anahtarı aktif mi? (Google AI Studio'da kontrol edin)

**2. "API Error" Mesajı**
- API anahtarınız belirli domainlere kısıtlı olabilir
- Test için: Google AI Studio → API Keys → Kısıtlamaları kaldırın

**3. İngilizce Yanıtlar Geliyor**
- Sistem prompt'u zaten Türkçe
- AI context'ten otomatik algılar
- Genellikle Türkçe yanıt verir

**4. Yavaş Yanıtlar**
- Gemini 1.5 Flash hızlıdır (1-2 saniye)
- İnternet bağlantınızı kontrol edin
- Google Cloud Status kontrol edin: status.cloud.google.com

---

## 📊 Kullanım İzleme

### Günlük Kullanımı Kontrol Edin:

1. **Google AI Studio**'ya gidin
2. **"Usage"** veya **"Quotas"** sekmesine tıklayın
3. Bugün kaç istek yaptığınızı görün
4. Limit: **1,500/gün** (çoğu site için yeterli!)

---

## 🎨 Özellikler

✅ **Gerçek AI** - Google Gemini 1.5 Flash destekli  
✅ **Ücretsiz** - 1,500 istek/gün free tier  
✅ **Türkçe** - Mükemmel Türkçe anlama ve yanıt  
✅ **Context Aware** - Orca ürünleri, fiyatlar, iletişim bilgilerini biliyor  
✅ **Konversasyon Hafızası** - Chat oturumu boyunca bağlamı hatırlar  
✅ **Profesyonel** - Kısa, yardımcı, işletmeye uygun yanıtlar  
✅ **Hata Yönetimi** - Sorun olursa iletişim bilgilerini gösterir  
✅ **Güvenlik** - XSS koruması, input sanitization  
✅ **Mobil Uyumlu** - Tüm cihazlarda çalışır

---

## 💬 Müşteriler Ne Sorabilir?

AI şunları yanıtlayabilir:

- Ürün bilgileri (palet, kasa, kereste, kontrplak)
- Fiyat ve teklif talepleri
- Özel ölçü üretim
- Teslimat süreleri
- Sertifikalar (ISPM-15)
- İletişim bilgileri
- Teknik özellikler
- Ve daha fazlası!

**AI davranışı:**
- Türkçe yanıt verir
- Profesyonel ve yardımcı olur
- Spesifik ürün detayları verir
- Teklif için müşteriyi iletişime yönlendirir
- 2-3 paragraf ile sınırlı yanıtlar

---

## 📞 Destek ve İletişim

### Teknik Destek:
- 📧 E-posta: orcaahsap@orcaahsap.com
- 📞 Telefon: 0 224 482 2892 (Çalı Fabrika)
- 📞 Telefon: 0 533 660 5802 (Kocaeli Şube)

---

**✨ Bu sistem VSCode GitHub Copilot tarafından oluşturulmuştur ve Orca Orman Ürünleri için özelleştirilmiştir.**

**🚀 Başarılar! Artık gerçek AI destekli bir chatbot'unuz var!**
- **Claude API Referansı**: https://docs.anthropic.com/claude/reference

---

## 🎉 Tebrikler!

Yapay zeka asistanınız hazır! Müşterileriniz artık 7/24 anında Türkçe destek alabilir.

**Başarılı Kullanımlar! 🌲**
