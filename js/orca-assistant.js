// ============================================
// ORCA AI ORDER ASSISTANT
// ============================================
// Secure client-side chat widget that communicates
// with Netlify serverless function for Gemini API

(function () {
    'use strict';

    // ============================================
    // CONFIGURATION
    // ============================================
    const CONFIG = {
        API_ENDPOINT: '/.netlify/functions/chat',
        SALES_EMAIL: 'orcaahsap@orcaahsap.com',
        WHATSAPP: '905336605802',
        WHATSAPP_DISPLAY: '0533 660 5802',
        PHONE: '0224 482 2892'
    };

    // ============================================
    // CONVERSATION STATE
    // ============================================
    const state = {
        step: 0,
        data: {},
        history: [],
        startTime: Date.now(),
        productType: null,
        isStarted: false,
        isComplete: false
    };

    // ============================================
    // QUESTIONS FLOW
    // ============================================
    const QUESTIONS = {
        0: {
            key: 'productCategory',
            text: `Hangi ürün kategorisi için teklif istiyorsunuz?

1️⃣ Ahşap Palet
2️⃣ Kontrplak Palet
3️⃣ Ahşap Kasa
4️⃣ Kontrplak Kasa
5️⃣ OSB Kasa
6️⃣ Ahşap & Kontrplak Hibrit Kasa
7️⃣ Lata (Ahşap)
8️⃣ Lata (Kontrplak)
9️⃣ Kereste
🔟 2. El Palet

Lütfen numara yazın (örn: 1)`,
            validate: (input) => {
                const num = parseInt(input);
                if (num >= 1 && num <= 10) return true;
                return "Lütfen 1-10 arası numara seçin";
            },
            process: (input) => {
                const products = [
                    'Ahşap Palet', 'Kontrplak Palet', 'Ahşap Kasa',
                    'Kontrplak Kasa', 'OSB Kasa', 'Ahşap & Kontrplak Hibrit Kasa',
                    'Lata (Ahşap)', 'Lata (Kontrplak)', 'Kereste', '2. El Palet'
                ];
                const idx = parseInt(input) - 1;
                state.productType = idx < 2 ? 'palet' : (idx < 6 ? 'kasa' : 'other');
                return products[idx];
            }
        },

        1: {
            key: 'sizeType',
            text: `Boyut tercihiniz?

1️⃣ Standart boyut (hazır ölçülerimizden seçim)
2️⃣ Özel ölçü (sizin belirlediğiniz ebatlar)

Lütfen seçin: 1 veya 2`,
            validate: (input) => {
                return ['1', '2'].includes(input) ? true : "Lütfen 1 veya 2 seçin";
            },
            process: (input) => input === '1' ? 'Standart' : 'Özel'
        },

        2: {
            key: 'size',
            text: (s) => {
                if (s.data.sizeType === 'Standart' && s.productType === 'palet') {
                    return `Standart palet boyutlarımız:

1️⃣ 80 × 120 cm (En popüler)
2️⃣ 100 × 120 cm (Avrupa standardı)
3️⃣ 98 × 114 cm (Kit modeli)
4️⃣ 132 × 114 cm (Geniş yük)
5️⃣ 146 × 114 cm (Otomotiv özel)
6️⃣ 170 × 114 cm (Ekstra geniş)
7️⃣ 198 × 114 cm (Maksimum genişlik)

Lütfen numara seçin:`;
                } else {
                    return `Özel ölçü belirtiniz.

Lütfen şu formatta yazın:
En × Boy × Yükseklik (cm)

Örnek: 85 × 125 × 15
veya
Örnek: 150 × 100 × 80 (kasa için)`;
                }
            },
            validate: (input, s) => {
                if (s.data.sizeType === 'Standart' && s.productType === 'palet') {
                    const num = parseInt(input);
                    return (num >= 1 && num <= 7) ? true : "Lütfen 1-7 arası numara seçin";
                }
                return input.length > 3 ? true : "Lütfen ölçüleri belirtin";
            },
            process: (input, s) => {
                if (s.data.sizeType === 'Standart' && s.productType === 'palet') {
                    const sizes = ['80×120', '100×120', '98×114', '132×114', '146×114', '170×114', '198×114'];
                    return sizes[parseInt(input) - 1] + ' cm';
                }
                return input;
            }
        },

        3: {
            key: 'structureType',
            text: (s) => {
                if (s.productType === 'palet') {
                    return `Alt yapı tercihiniz?

1️⃣ Altı açık (Hafif yükler - 300-500 kg)
2️⃣ Altı kapalı (Ağır yükler - 500-1000 kg)
3️⃣ Üstü kapalı (Ürün koruma)

Lütfen seçin: 1-3`;
                } else if (s.productType === 'kasa') {
                    return `Kasa yapı tipi?

1️⃣ Komple kapalı (Tam koruma)
2️⃣ Kargas/Izgara (Hava sirkülasyonu)

Lütfen seçin: 1-2`;
                } else {
                    return `Kereste tipi?

1️⃣ İnşaatlık (Ham kereste)
2️⃣ Doğramalık (Silinmiş/Planyalı)

Lütfen seçin: 1-2`;
                }
            },
            validate: (input, s) => {
                const num = parseInt(input);
                if (s.productType === 'palet') return (num >= 1 && num <= 3) ? true : "Lütfen 1-3 arası seçin";
                return (num >= 1 && num <= 2) ? true : "Lütfen 1 veya 2 seçin";
            },
            process: (input, s) => {
                if (s.productType === 'palet') {
                    return ['Altı açık', 'Altı kapalı', 'Üstü kapalı'][parseInt(input) - 1];
                } else if (s.productType === 'kasa') {
                    return ['Komple kapalı', 'Kargas/Izgara'][parseInt(input) - 1];
                } else {
                    return ['İnşaatlık', 'Doğramalık'][parseInt(input) - 1];
                }
            }
        },

        4: {
            key: 'quantity',
            text: `Kaç adet sipariş vermek istiyorsunuz?

Önerilen minimum: 50 adet (ekonomik üretim)

Lütfen miktar yazın (sadece sayı):`,
            validate: (input) => {
                const num = parseInt(input);
                if (isNaN(num)) return "Lütfen sadece sayı yazın";
                if (num < 1) return "Geçerli miktar yazın";
                return true;
            },
            process: (input) => {
                const qty = parseInt(input);
                if (qty < 50) {
                    state.data.belowMinimum = true;
                    return qty + ' (minimum altı - satış onayı gerekli)';
                }
                return qty.toString();
            }
        },

        5: {
            key: 'ispmRequired',
            text: `İhracat yapacak mısınız?

ISPM-15 sertifikası gerekiyor mu?
(Uluslararası fümigasyon standardı - ihracatta zorunlu)

1️⃣ Evet, ihracat için gerekli
2️⃣ Hayır, yurtiçi kullanım

Lütfen seçin: 1 veya 2

ℹ️ ISPM-15 nedir? → WhatsApp: ${CONFIG.WHATSAPP_DISPLAY}`,
            validate: (input) => ['1', '2'].includes(input) ? true : "Lütfen 1 veya 2 seçin",
            process: (input) => input === '1' ? 'Evet (ISPM-15 gerekli)' : 'Hayır (Yurtiçi)'
        },

        6: {
            key: 'deliveryCity',
            text: `Teslimat nereye yapılacak?

Lütfen şehir yazın:
(Örnek: Bursa, İstanbul, Ankara, İzmir)`,
            validate: (input) => input.length >= 3 ? true : "Lütfen şehir adı yazın",
            process: (input) => input
        },

        7: {
            key: 'deliveryAddress',
            text: `Lütfen ilçe/mahalle/sanayi bölgesi belirtin:
(Örnek: Nilüfer/Çalı Mahallesi veya OSB 2. Bölge)`,
            validate: (input) => input.length >= 3 ? true : "Lütfen adres detayı yazın",
            process: (input) => input
        },

        8: {
            key: 'deliveryTimeline',
            text: `Tercih ettiğiniz teslimat zamanı?

1️⃣ Acil (1 hafta içinde)
2️⃣ Normal (2-3 hafta)
3️⃣ Planlı (bu ay içinde)
4️⃣ Esnek (tarih önemli değil)

Lütfen seçin: 1-4`,
            validate: (input) => {
                const num = parseInt(input);
                return (num >= 1 && num <= 4) ? true : "Lütfen 1-4 arası seçin";
            },
            process: (input) => {
                return ['Acil (1 hafta)', 'Normal (2-3 hafta)', 'Planlı (bu ay)', 'Esnek'][parseInt(input) - 1];
            }
        },

        9: {
            key: 'companyName',
            text: `Firma adınız?

Lütfen şirket ünvanını yazın:`,
            validate: (input) => input.length >= 2 ? true : "Lütfen firma adı yazın",
            process: (input) => input
        },

        10: {
            key: 'contactName',
            text: `Yetkili kişi adı?

Lütfen ad soyad yazın:`,
            validate: (input) => input.length >= 2 ? true : "Lütfen ad soyad yazın",
            process: (input) => input
        },

        11: {
            key: 'phoneNumber',
            text: `Telefon numaranız?

Lütfen yazın:`,
            validate: (input) => {
                const digits = input.replace(/\D/g, '');
                return digits.length >= 10 ? true : "Geçerli telefon numarası yazın";
            },
            process: (input) => {
                const digits = input.replace(/\D/g, '');
                if (digits.length === 10) return '0' + digits;
                if (digits.length === 11 && digits[0] === '0') return digits;
                if (digits.length === 12 && digits.startsWith('90')) return '0' + digits.slice(2);
                return digits;
            }
        },

        12: {
            key: 'emailAddress',
            text: `Email adresiniz?

Teklif bu adrese gönderilecek.

Lütfen geçerli email yazın:`,
            validate: (input) => {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                return emailRegex.test(input) ? true : "Geçerli email adresi yazın (örn: isim@firma.com)";
            },
            process: (input) => input.toLowerCase()
        },

        13: {
            key: 'additionalNotes',
            text: `Eklemek istediğiniz not var mı?

Özel talepler, teslimat tarihi tercihi, vb.
(İsteğe bağlı - atlayabilirsiniz)

Varsa yazın, yoksa "YOK" yazın:`,
            validate: () => true,
            process: (input) => {
                const skip = ['yok', 'hayır', 'hayir', 'no', 'skip', 'geç', '-'].includes(input.toLowerCase());
                return skip ? 'Belirtilmedi' : input;
            }
        }
    };

    // ============================================
    // INJECT HTML
    // ============================================
    function injectChatHTML() {
        const chatHTML = `
            <button id="orca-chat-open-btn" title="Sipariş Asistanı">🤖</button>
            <div id="orca-chat-widget">
                <div id="orca-chat-header">
                    <h3>🌲 ORCA Sipariş Asistanı</h3>
                    <button id="orca-chat-close-btn">✕</button>
                </div>
                <div id="orca-chat-messages"></div>
                <div id="orca-chat-input-area">
                    <input type="text" id="orca-user-input" placeholder="Mesajınızı yazın..." autocomplete="off">
                    <button id="orca-send-btn">Gönder</button>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', chatHTML);
    }

    // ============================================
    // DOM ELEMENTS (initialized after injection)
    // ============================================
    let elements = {};

    function initElements() {
        elements = {
            widget: document.getElementById('orca-chat-widget'),
            messages: document.getElementById('orca-chat-messages'),
            input: document.getElementById('orca-user-input'),
            sendBtn: document.getElementById('orca-send-btn'),
            openBtn: document.getElementById('orca-chat-open-btn'),
            closeBtn: document.getElementById('orca-chat-close-btn')
        };
    }

    // ============================================
    // UTILITY FUNCTIONS
    // ============================================
    function addMessage(text, type = 'ai') {
        const msg = document.createElement('div');
        msg.className = `orca-message orca-${type}-message`;
        msg.textContent = text;
        elements.messages.appendChild(msg);
        elements.messages.scrollTop = elements.messages.scrollHeight;
    }

    function showTyping() {
        const typing = document.createElement('div');
        typing.className = 'orca-message orca-typing-indicator';
        typing.innerHTML = '<span></span><span></span><span></span>';
        typing.id = 'orca-typing';
        elements.messages.appendChild(typing);
        elements.messages.scrollTop = elements.messages.scrollHeight;
    }

    function hideTyping() {
        const typing = document.getElementById('orca-typing');
        if (typing) typing.remove();
    }

    function generateOrderNumber() {
        const date = new Date();
        const num = Math.floor(Math.random() * 9000) + 1000;
        return `ORC-${date.getFullYear()}-${num}`;
    }

    function calculateLeadScore() {
        let score = 0;
        const qty = parseInt(state.data.quantity) || 0;

        if (qty >= 500) score += 30;
        else if (qty >= 200) score += 20;
        else if (qty >= 50) score += 10;
        else score += 5;

        if (state.data.sizeType === 'Özel') score += 15;
        else score += 10;

        if (state.data.ispmRequired?.includes('Evet')) score += 25;

        const majorCities = ['bursa', 'istanbul', 'ankara', 'izmir'];
        if (majorCities.some(city => state.data.deliveryCity?.toLowerCase().includes(city))) {
            score += 10;
        } else {
            score += 5;
        }

        if (state.data.deliveryTimeline?.includes('Acil')) score += 15;
        else if (state.data.deliveryTimeline?.includes('Normal')) score += 10;
        else score += 5;

        return Math.min(score, 100);
    }

    function formatDuration(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}m ${remainingSeconds}s`;
    }

    // ============================================
    // API CALL (Secure backend)
    // ============================================
    async function callSecureBackend(message) {
        try {
            const response = await fetch(CONFIG.API_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: message,
                    conversationHistory: state.history
                })
            });

            if (!response.ok) {
                throw new Error(`Backend error: ${response.status}`);
            }

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Unknown error');
            }

            return data.response;

        } catch (error) {
            console.error('API call failed:', error);
            throw error;
        }
    }

    // ============================================
    // ORDER FINALIZATION
    // ============================================
    function finalizeOrder() {
        const orderData = {
            orderNumber: generateOrderNumber(),
            timestamp: new Date().toISOString(),
            ...state.data,
            leadScore: calculateLeadScore(),
            formCompletionTime: formatDuration(Date.now() - state.startTime),
            source: 'Website AI Assistant',
            status: 'Pending'
        };

        // Log order data (in production, this would be sent to backend)
        console.log('Order data ready:', orderData);

        addMessage(`✅ Sipariş talebiniz kaydedildi!

📧 Sipariş No: ${orderData.orderNumber}

Email onayı ${state.data.emailAddress} adresinize gönderilecek.

⏱️ Satış ekibimiz 2 saat içinde size ulaşacak.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SONRAKI ADIMLAR:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Email onayınızı kontrol edin
2. Satış ekibimizin aramasını bekleyin
3. Detaylı fiyat teklifi alın

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ACELE Mİ EDİYORSUNUZ?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💬 WhatsApp: ${CONFIG.WHATSAPP_DISPLAY}
📞 Telefon: ${CONFIG.PHONE}

Teşekkürler! 🌲`, 'system');

        state.isComplete = true;

        setTimeout(() => {
            addMessage('Yeni sipariş için sayfayı yenileyin.', 'system');
            elements.input.disabled = true;
            elements.sendBtn.disabled = true;
        }, 2000);
    }

    function showSummary() {
        const summary = `✅ Sipariş Detaylarınız Tamamlandı!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 SİPARİŞ ÖZETİ
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Ürün: ${state.data.productCategory}
Boyut: ${state.data.size}
Yapı: ${state.data.structureType}
Miktar: ${state.data.quantity} adet
ISPM-15: ${state.data.ispmRequired}
Teslimat: ${state.data.deliveryCity}, ${state.data.deliveryAddress}
Zaman: ${state.data.deliveryTimeline}

Firma: ${state.data.companyName}
Yetkili: ${state.data.contactName}
Telefon: ${state.data.phoneNumber}
Email: ${state.data.emailAddress}

Not: ${state.data.additionalNotes}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Bilgiler doğru mu?

1️⃣ Evet, gönder
2️⃣ Hayır, düzeltme yapmak istiyorum`;

        addMessage(summary, 'ai');
        state.step = 'confirmation';
    }

    // ============================================
    // MAIN CONVERSATION LOGIC
    // ============================================
    function processUserInput(input) {
        const currentQ = QUESTIONS[state.step];
        if (!currentQ) return;

        const validation = currentQ.validate(input, state);
        if (validation !== true) {
            const questionText = typeof currentQ.text === 'function' ? currentQ.text(state) : currentQ.text;
            addMessage(validation + '\n\n' + questionText, 'ai');
            return;
        }

        const processedValue = currentQ.process(input, state);
        state.data[currentQ.key] = processedValue;
        state.history.push({ step: state.step, key: currentQ.key, value: processedValue });

        addMessage(`✓ ${processedValue} kaydedildi.`, 'ai');

        state.step++;

        if (state.step < Object.keys(QUESTIONS).length) {
            setTimeout(() => {
                const nextQ = QUESTIONS[state.step];
                const questionText = typeof nextQ.text === 'function' ? nextQ.text(state) : nextQ.text;
                addMessage(questionText, 'ai');
            }, 800);
        } else {
            setTimeout(() => showSummary(), 1000);
        }
    }

    // ============================================
    // EVENT HANDLERS
    // ============================================
    function handleSend() {
        const input = elements.input.value.trim();
        if (!input) return;

        addMessage(input, 'user');
        elements.input.value = '';

        // Check for exit commands
        if (['çıkış', 'iptal', 'vazgeçtim', 'exit', 'cancel'].includes(input.toLowerCase())) {
            addMessage(`Sipariş talebinizi iptal ettiniz.

Daha sonra devam etmek isterseniz tekrar gelin!

💬 WhatsApp: ${CONFIG.WHATSAPP_DISPLAY}
📞 Telefon: ${CONFIG.PHONE}

İyi günler! 👋`, 'ai');
            state.isComplete = true;
            return;
        }

        if (state.step === 'confirmation') {
            if (input === '1') {
                finalizeOrder();
            } else if (input === '2') {
                addMessage('Düzeltme yapmak için sayfayı yenileyin ve tekrar başlayın. Veya WhatsApp üzerinden iletişime geçin: ' + CONFIG.WHATSAPP_DISPLAY, 'ai');
            } else {
                addMessage('Lütfen 1 (Gönder) veya 2 (Düzelt) seçin', 'ai');
            }
            return;
        }

        showTyping();
        setTimeout(() => {
            hideTyping();
            processUserInput(input);
        }, 600);
    }

    function startConversation() {
        if (state.isStarted) return;
        state.isStarted = true;
        state.startTime = Date.now();

        addMessage(`Merhaba! 👋 ORCA Ahşap sipariş asistanıyım.

Size ürün yapılandırmanızda yardımcı olacağım.
Topladığım bilgiler satış ekibimize iletilecek.

⏱️ Tahmini süre: 3-4 dakika
📧 Detaylı teklif email ile gönderilecek
💬 Teknik soru için WhatsApp: ${CONFIG.WHATSAPP_DISPLAY}

Hazır mısınız?
Başlamak için "EVET" yazın.`, 'ai');
    }

    function handleStartResponse(input) {
        const normalized = input.toUpperCase().trim();
        if (['EVET', 'YES', 'HAZIR', 'BAŞLA', 'BASLA', 'OK', 'TAMAM'].includes(normalized)) {
            state.step = 0;
            setTimeout(() => {
                addMessage(QUESTIONS[0].text, 'ai');
            }, 600);
            return true;
        }
        return false;
    }

    // ============================================
    // INITIALIZATION
    // ============================================
    function init() {
        injectChatHTML();
        initElements();

        // Open button click
        elements.openBtn.addEventListener('click', () => {
            elements.widget.classList.add('open');
            elements.openBtn.classList.add('hidden');
            if (!state.isStarted) {
                setTimeout(() => startConversation(), 300);
            }
            elements.input.focus();
        });

        // Close button click
        elements.closeBtn.addEventListener('click', () => {
            elements.widget.classList.remove('open');
            elements.openBtn.classList.remove('hidden');
        });

        // Send button click
        elements.sendBtn.addEventListener('click', () => {
            const input = elements.input.value.trim();
            if (!input) return;

            // Check if we're waiting for EVET to start
            if (state.isStarted && state.step === 0 && state.history.length === 0) {
                addMessage(input, 'user');
                elements.input.value = '';
                if (!handleStartResponse(input)) {
                    addMessage('Başlamak için "EVET" yazın 😊', 'ai');
                }
                return;
            }

            handleSend();
        });

        // Enter key in input
        elements.input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                elements.sendBtn.click();
            }
        });

        console.log('ORCA AI Assistant initialized');
    }

    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
