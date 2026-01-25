// ============================================
// ORCA AI ORDER ASSISTANT - INTEGRATED VERSION
// ============================================
// Uses existing YAPAY ZEKA MUHENDISI button and modal
// Replaces old Gemini logic with secure backend + conversation flow

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
        step: -1, // -1 = waiting for EVET, 0+ = question steps
        data: {},
        history: [],
        startTime: Date.now(),
        productType: null,
        isStarted: false,
        isComplete: false
    };

    // ============================================
    // QUESTIONS FLOW (14 questions)
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
veya kasa için: 150 × 100 × 80`;
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

Lütfen seçin: 1 veya 2`,
            validate: (input) => ['1', '2'].includes(input) ? true : "Lütfen 1 veya 2 seçin",
            process: (input) => input === '1' ? 'Evet (ISPM-15 gerekli)' : 'Hayır (Yurtiçi)'
        },

        6: {
            key: 'deliveryCity',
            text: `Teslimat nereye yapılacak?

Lütfen şehir yazın:
(Örnek: Bursa, İstanbul, Ankara, İzmir)`,
            validate: (input) => input.length >= 2 ? true : "Lütfen şehir adı yazın",
            process: (input) => input
        },

        7: {
            key: 'deliveryAddress',
            text: `Lütfen ilçe/mahalle/sanayi bölgesi belirtin:
(Örnek: Nilüfer/Çalı veya OSB 2. Bölge)`,
            validate: (input) => input.length >= 2 ? true : "Lütfen adres detayı yazın",
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
    // DOM ELEMENTS (existing in index.html)
    // ============================================
    let elements = {};

    function initElements() {
        elements = {
            modal: document.getElementById('ai-chat-modal'),
            messagesContainer: document.getElementById('chat-messages-new'),
            input: document.getElementById('user-message-input'),
            // Buttons that open chat
            toggleBtn: document.getElementById('chat-toggle-btn'),
            widgetContainer: document.getElementById('ai-widget-container')
        };
    }

    // ============================================
    // UTILITY FUNCTIONS
    // ============================================
    function addMessage(text, type = 'ai') {
        if (!elements.messagesContainer) return;

        const msgWrapper = document.createElement('div');
        msgWrapper.className = 'flex gap-3 items-start';

        if (type === 'user') {
            msgWrapper.className = 'flex gap-3 items-start justify-end';
            msgWrapper.innerHTML = `
                <div class="bg-brand-wood/20 rounded-2xl rounded-tr-none p-4 max-w-[80%]">
                    <p class="text-white text-sm leading-relaxed whitespace-pre-line">${escapeHtml(text)}</p>
                </div>
            `;
        } else if (type === 'system') {
            msgWrapper.innerHTML = `
                <div class="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <i class="fa-solid fa-check text-white text-sm"></i>
                </div>
                <div class="bg-green-900/50 border border-green-600/30 rounded-2xl rounded-tl-none p-4 max-w-[80%]">
                    <p class="text-green-100 text-sm leading-relaxed whitespace-pre-line">${escapeHtml(text)}</p>
                </div>
            `;
        } else {
            msgWrapper.innerHTML = `
                <div class="w-8 h-8 bg-brand-wood rounded-full flex items-center justify-center flex-shrink-0">
                    <i class="fa-solid fa-robot text-black text-sm"></i>
                </div>
                <div class="bg-white/5 rounded-2xl rounded-tl-none p-4 max-w-[80%]">
                    <p class="text-white text-sm leading-relaxed whitespace-pre-line">${escapeHtml(text)}</p>
                </div>
            `;
        }

        elements.messagesContainer.appendChild(msgWrapper);
        elements.messagesContainer.scrollTop = elements.messagesContainer.scrollHeight;
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function clearMessages() {
        if (elements.messagesContainer) {
            elements.messagesContainer.innerHTML = '';
        }
    }

    function showTyping() {
        const typingId = 'orca-typing-indicator';
        if (document.getElementById(typingId)) return;

        const typing = document.createElement('div');
        typing.id = typingId;
        typing.className = 'flex gap-3 items-start';
        typing.innerHTML = `
            <div class="w-8 h-8 bg-brand-wood rounded-full flex items-center justify-center flex-shrink-0">
                <i class="fa-solid fa-robot text-black text-sm"></i>
            </div>
            <div class="bg-white/5 rounded-2xl rounded-tl-none p-4">
                <div class="flex gap-1">
                    <span class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0s"></span>
                    <span class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.2s"></span>
                    <span class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.4s"></span>
                </div>
            </div>
        `;
        elements.messagesContainer.appendChild(typing);
        elements.messagesContainer.scrollTop = elements.messagesContainer.scrollHeight;
    }

    function hideTyping() {
        const typing = document.getElementById('orca-typing-indicator');
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

    // Format order details as text for emails
    function formatOrderDetails() {
        return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 YENİ SİPARİŞ TALEBİ
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Sipariş No: ${state.data.orderNumber}
Tarih: ${new Date().toLocaleString('tr-TR')}
Lead Skoru: ${state.data.leadScore}/100
Form Süresi: ${state.data.formCompletionTime}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ÜRÜN BİLGİLERİ
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Ürün: ${state.data.productCategory}
Boyut Tercihi: ${state.data.sizeType}
Boyut: ${state.data.size}
Yapı Tipi: ${state.data.structureType}
Miktar: ${state.data.quantity}
ISPM-15: ${state.data.ispmRequired}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TESLİMAT BİLGİLERİ
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Şehir: ${state.data.deliveryCity}
Adres: ${state.data.deliveryAddress}
Zaman Tercihi: ${state.data.deliveryTimeline}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MÜŞTERİ BİLGİLERİ
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Firma: ${state.data.companyName}
Yetkili: ${state.data.contactName}
Telefon: ${state.data.phoneNumber}
Email: ${state.data.emailAddress}

Ek Notlar: ${state.data.additionalNotes}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Kaynak: Website AI Asistanı
Durum: Yeni - Bekliyor
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        `.trim();
    }

    // ============================================
    // ORDER FINALIZATION WITH EMAIL
    // ============================================
    async function finalizeOrder() {
        const orderNumber = generateOrderNumber();
        const orderData = {
            orderNumber: orderNumber,
            timestamp: new Date().toISOString(),
            ...state.data,
            leadScore: calculateLeadScore(),
            formCompletionTime: formatDuration(Date.now() - state.startTime),
            source: 'Website AI Assistant',
            status: 'Pending'
        };

        // Add to state for formatting
        state.data.orderNumber = orderNumber;
        state.data.leadScore = orderData.leadScore;
        state.data.formCompletionTime = orderData.formCompletionTime;

        const orderDetails = formatOrderDetails();

        console.log('Order data ready:', orderData);

        try {
            // Send emails via Netlify function
            const response = await fetch('/.netlify/functions/send-order', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    orderNumber: orderNumber,
                    customerName: state.data.contactName,
                    customerEmail: state.data.emailAddress,
                    customerPhone: state.data.phoneNumber,
                    companyName: state.data.companyName,
                    orderDetails: orderDetails
                })
            });

            const result = await response.json();

            if (response.ok && result.success) {
                // Success!
                addMessage(`✅ Sipariş talebiniz başarıyla kaydedildi!

📧 Sipariş No: ${orderNumber}

✉️ Onay emaili ${state.data.emailAddress} adresinize gönderildi.
📩 Satış ekibimize bildirim yapıldı.

⏱️ Satış ekibimiz 2 saat içinde size dönüş yapacak.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ACELE Mİ EDİYORSUNUZ?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💬 WhatsApp: ${CONFIG.WHATSAPP_DISPLAY}
📞 Telefon: ${CONFIG.PHONE}

Teşekkürler! 🌲`, 'system');

            } else {
                throw new Error(result.error || 'Email gönderimi başarısız');
            }

            state.isComplete = true;

        } catch (error) {
            console.error('Order finalization error:', error);

            // Fallback: show order details for manual contact
            addMessage(`⚠️ Email sistemi henüz yapılandırılmadı.

Sipariş bilgileriniz kaydedildi:

📧 Sipariş No: ${orderNumber}

Lütfen bu bilgileri şu yollarla iletin:

💬 WhatsApp: ${CONFIG.WHATSAPP_DISPLAY}
📞 Telefon: ${CONFIG.PHONE}
📧 Email: orcaahsap@orcaahsap.com

Satış ekibimiz size yardımcı olacaktır! 🙏`, 'system');

            state.isComplete = true;
        }
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
        // Handle exit commands anywhere
        if (['çıkış', 'iptal', 'vazgeçtim', 'exit', 'cancel'].includes(input.toLowerCase())) {
            addMessage(`Sipariş talebinizi iptal ettiniz.

Daha sonra devam etmek isterseniz tekrar gelin!

💬 WhatsApp: ${CONFIG.WHATSAPP_DISPLAY}
📞 Telefon: ${CONFIG.PHONE}

İyi günler! 👋`, 'ai');
            state.isComplete = true;
            return;
        }

        // Waiting for EVET to start
        if (state.step === -1) {
            const normalized = input.toUpperCase().trim();
            if (['EVET', 'YES', 'HAZIR', 'BAŞLA', 'BASLA', 'OK', 'TAMAM', 'E', 'EV'].includes(normalized)) {
                state.step = 0;
                setTimeout(() => {
                    addMessage(QUESTIONS[0].text, 'ai');
                }, 500);
            } else {
                addMessage('Başlamak için "EVET" yazın 😊', 'ai');
            }
            return;
        }

        // Confirmation step
        if (state.step === 'confirmation') {
            if (input === '1') {
                finalizeOrder();
            } else if (input === '2') {
                addMessage('Düzeltme için sayfayı yenileyin ve tekrar başlayın.\n\nVeya WhatsApp: ' + CONFIG.WHATSAPP_DISPLAY, 'ai');
            } else {
                addMessage('Lütfen 1 (Gönder) veya 2 (Düzelt) seçin', 'ai');
            }
            return;
        }

        // Regular question processing
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
            }, 600);
        } else {
            setTimeout(() => showSummary(), 800);
        }
    }

    // ============================================
    // START CONVERSATION
    // ============================================
    function startConversation() {
        if (state.isStarted) return;
        state.isStarted = true;
        state.startTime = Date.now();
        state.step = -1;

        clearMessages();

        addMessage(`Merhaba! 👋 ORCA Ahşap sipariş asistanıyım.

Size ürün yapılandırmanızda yardımcı olacağım.
Topladığım bilgiler satış ekibimize iletilecek.

⏱️ Tahmini süre: 3-4 dakika
📧 Detaylı teklif email ile gönderilecek
💬 Teknik soru için WhatsApp: ${CONFIG.WHATSAPP_DISPLAY}

Hazır mısınız?
Başlamak için "EVET" yazın.`, 'ai');
    }

    // ============================================
    // OVERRIDE EXISTING FUNCTIONS
    // ============================================
    function handleSend() {
        if (!elements.input) return;

        const input = elements.input.value.trim();
        if (!input) return;
        if (state.isComplete) return;

        addMessage(input, 'user');
        elements.input.value = '';

        showTyping();
        setTimeout(() => {
            hideTyping();
            processUserInput(input);
        }, 500);
    }

    // ============================================
    // INITIALIZATION
    // ============================================
    function init() {
        initElements();

        if (!elements.modal || !elements.messagesContainer) {
            console.warn('ORCA Assistant: Required elements not found, retrying...');
            setTimeout(init, 500);
            return;
        }

        // Override the sendMessage function
        window.sendMessage = handleSend;

        // Override openAIChat to start our conversation
        const originalOpenAIChat = window.openAIChat;
        window.openAIChat = function () {
            if (originalOpenAIChat) originalOpenAIChat();
            if (!state.isStarted) {
                setTimeout(startConversation, 300);
            }
        };

        // Also handle the Enter key
        if (elements.input) {
            elements.input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSend();
                }
            });
        }

        console.log('ORCA AI Assistant (Integrated) initialized');
    }

    // Wait for DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        // Delay slightly to ensure other scripts have run
        setTimeout(init, 100);
    }

})();
