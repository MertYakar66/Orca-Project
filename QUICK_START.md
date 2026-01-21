# 🚀 Hızlı Başlangıç Kılavuzu

## ✅ Yapılanlar

### 1. Tüm "AI" Metinleri "Yapay Zeka" Olarak Güncellendi:
- ✅ "AI Powered" → "Yapay Zeka Destekli"
- ✅ "AI MÜHENDİS" → "YAPAY ZEKA MÜHENDİSİ"
- ✅ Tüm AI referansları Türkçeleştirildi

### 2. Chat Modal Eklendi:
- ✅ Profesyonel Türkçe arayüz
- ✅ Hoş geldin mesajı
- ✅ Kullanıcı dostu tasarım
- ✅ Mobil uyumlu

### 3. JavaScript Fonksiyonları Eklendi:
- ✅ `openAIChat()` - Modalı açar
- ✅ `closeAIChat()` - Modalı kapatır
- ✅ `sendMessage()` - Mesaj gönderir
- ✅ `addMessageToChat()` - Chat'e mesaj ekler
- ✅ `addTypingIndicator()` - Yazıyor göstergesi
- ✅ `removeTypingIndicator()` - Göstergeyi kaldırır

### 4. API Entegrasyonu Hazır:
- ✅ Anthropic Claude API bağlantısı
- ✅ Claude 3 Haiku modeli (hızlı & ekonomik)
- ✅ Türkçe sistem promptu
- ✅ Hata yönetimi

---

## 🎯 Şimdi Yapılacak: Sadece 1 Adım!

### API Anahtarı Ekleyin:

1. **index.html dosyasını açın**
2. **1382. satırı bulun:**
   ```javascript
   const ANTHROPIC_API_KEY = 'YOUR_ANTHROPIC_API_KEY_HERE';
   ```
3. **API anahtarınızı yapıştırın:**
   ```javascript
   const ANTHROPIC_API_KEY = 'sk-ant-api03-XXXXX';
   ```
4. **Kaydedin ve test edin!**

### API Anahtarı Nasıl Alınır?

👉 **https://console.anthropic.com**
- Ücretsiz kayıt olun
- "API Keys" sekmesine gidin
- "Create Key" butonuna tıklayın
- Anahtarı kopyalayın

**💰 Ücretsiz $5 kredi** (1000+ mesaj)

---

## 🎮 Kullanım

### Müşteriler İçin:

1. Sağ alttaki **"YAPAY ZEKA MÜHENDİSİ"** butonuna tıkla
2. Sorusunu yaz
3. Enter'a bas veya "Gönder" butonuna tıkla
4. Anında Türkçe cevap al

### Asistan Neler Yapabilir?

- ✅ Ürün bilgileri verir
- ✅ Fiyat teklifleri için yönlendirir
- ✅ Özel ölçü üretim sorularını yanıtlar
- ✅ Teslimat ve lojistik bilgi verir
- ✅ Teknik özellikler hakkında bilgi verir
- ✅ 7/24 Türkçe destek

---

## 📱 Test Soruları

Asistanı test etmek için şu soruları sorabilirsiniz:

```
1. "Ahşap palet fiyatları nedir?"
2. "80x120 cm özel ölçü palet yapabiliyor musunuz?"
3. "Bursa fabrikasının adresi nedir?"
4. "Kontrplak çeşitleriniz neler?"
5. "Teslimat süresi ne kadar?"
```

---

## 🔄 Alternatif: API İstemiyorum

Eğer API kullanmak istemiyorsanız, sorular doğrudan email'inize gelsin:

**`sendMessage()` fonksiyonunu değiştirin:**

```javascript
async function sendMessage() {
    const input = document.getElementById('user-message-input');
    const message = input.value.trim();
    if (!message) return;
    
    addMessageToChat(message, 'user');
    input.value = '';
    
    const subject = 'Yapay Zeka Asistan Sorusu';
    const body = `Müşteri Mesajı: ${message}`;
    window.location.href = `mailto:orcaahsap@orcaahsap.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    addMessageToChat('Mesajınız email olarak gönderilecek. En kısa sürede size dönüş yapacağız!', 'assistant');
}
```

---

## 📂 Dosyalar

- ✅ `index.html` - Ana sayfa (güncellenmiş)
- ✅ `AI_SETUP_INSTRUCTIONS.md` - Detaylı kurulum rehberi
- ✅ `QUICK_START.md` - Bu dosya (hızlı başlangıç)

---

## 🎉 Hazır!

Yapay zeka asistanınız hazır. Sadece API anahtarını ekleyin ve kullanmaya başlayın!

**Başarılar! 🌲**

---

## 📞 Destek

Sorularınız için: **orcaahsap@orcaahsap.com**
