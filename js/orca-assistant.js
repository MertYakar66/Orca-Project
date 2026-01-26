// ============================================
// ORCA AI ASSISTANT - REVISED DUAL-PATH SYSTEM
// ============================================
// Philosophy: "Help customer describe their need → Connect them to the right channel"
// Two paths: WhatsApp Direct OR AI-Guided 3-Screen Form

(function () {
    'use strict';

    // ============================================
    // CONFIGURATION
    // ============================================
    const CONFIG = {
        WHATSAPP_NUMBER: '905336605802',
        WHATSAPP_DISPLAY: '0533 660 5802',
        PHONE: '0224 482 2892',
        EMAIL: 'orcaahsap@orcaahsap.com',
        API_ENDPOINT: '/.netlify/functions/chat',
        SEND_ORDER_ENDPOINT: '/.netlify/functions/send-order'
    };

    // ============================================
    // PRODUCT CATEGORIES
    // ============================================
    const CATEGORIES = {
        palet: {
            name: 'Palet',
            icon: '🪵',
            subcategories: ['Ahşap Palet', 'Kontrplak Palet'],
            sizes: ['80×120 cm', '100×120 cm', '98×114 cm', '132×114 cm', '146×114 cm', '170×114 cm', '198×114 cm'],
            showISPM: true
        },
        kasa: {
            name: 'Kasa',
            icon: '📦',
            subcategories: ['Ahşap Kasa', 'Kontrplak Kasa', 'OSB Kasa', 'Hibrit Kasa'],
            sizes: null, // Custom only
            showISPM: true
        },
        kereste: {
            name: 'Kereste',
            icon: '🌲',
            subcategories: ['İnşaatlık', 'Doğramalık'],
            sizes: null,
            showISPM: false
        },
        kontrplak: {
            name: 'Kontrplak',
            icon: '📋',
            subcategories: ['Standart Levha', 'Su Geçirmez', 'Ebatlı'],
            sizes: null,
            showISPM: false
        },
        lata: {
            name: 'Lata',
            icon: '🪚',
            subcategories: ['Ahşap Lata', 'Kontrplak Lata'],
            sizes: null,
            showISPM: false
        },
        ikinciel: {
            name: '2. El Palet',
            icon: '♻️',
            subcategories: ['Ekonomik', 'Tamir Görmüş'],
            sizes: ['80×120 cm', '100×120 cm'],
            showISPM: false
        }
    };

    // ============================================
    // STATE MANAGEMENT
    // ============================================
    const chatState = {
        currentScreen: 'welcome', // welcome, product, specs, contact, confirm, success

        product: {
            category: null,
            subcategory: null,
            quantity: null,
            sizeType: null, // 'standard' or 'custom'
            dimensions: null,
            usage: null, // 'export' or 'domestic'
            notes: null
        },

        contact: {
            name: null,
            company: null,
            phone: null,
            email: null,
            city: null
        },

        timeline: null, // 'urgent', 'normal', 'flexible'

        attachments: [], // { type, data, filename }
        voiceNote: null,

        orderNumber: null,
        submittedVia: null // 'email', 'whatsapp', 'both'
    };

    // ============================================
    // DOM ELEMENTS
    // ============================================
    let elements = {};

    function initElements() {
        elements = {
            modal: document.getElementById('ai-chat-modal'),
            messagesContainer: document.getElementById('chat-messages-new'),
            inputArea: document.querySelector('#ai-chat-modal .p-4.border-t'),
            input: document.getElementById('user-message-input')
        };
    }

    // ============================================
    // UTILITY FUNCTIONS
    // ============================================
    function generateOrderNumber() {
        const date = new Date();
        const num = Math.floor(Math.random() * 9000) + 1000;
        return `ORC-${date.getFullYear()}-${num}`;
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ============================================
    // WHATSAPP DEEP LINK GENERATOR
    // ============================================
    function generateWhatsAppLink(orderData = null) {
        let message;

        if (orderData) {
            // Full order data available
            message = `🌲 ORCA Sipariş Talebi

📦 ÜRÜN: ${orderData.product.subcategory || orderData.product.category}
📏 Boyut: ${orderData.product.dimensions || 'Belirtilmedi'}
📦 Miktar: ${orderData.product.quantity || '?'} adet
🌍 Kullanım: ${orderData.product.usage === 'export' ? 'İhracat (ISPM-15)' : 'Yurtiçi'}

👤 MÜŞTERİ:
Ad: ${orderData.contact.name}
Firma: ${orderData.contact.company}
Tel: ${orderData.contact.phone}
Şehir: ${orderData.contact.city}

⏰ Aciliyet: ${orderData.timeline === 'urgent' ? 'Acil (Bu hafta)' : orderData.timeline === 'normal' ? 'Normal (2-3 hafta)' : 'Esnek'}`;

            if (orderData.product.notes) {
                message += `\n\n💬 NOT:\n${orderData.product.notes}`;
            }

            if (orderData.voiceNote) {
                message += `\n\n🎤 Sesli Not:\n"${orderData.voiceNote}"`;
            }

            if (orderData.attachments.length > 0) {
                message += `\n\n📎 ${orderData.attachments.length} fotoğraf yüklendi (email'de mevcut)`;
            }

            message += `\n\nSipariş No: ${orderData.orderNumber}
Detaylı teklif alabilir miyim?`;
        } else {
            // Quick WhatsApp - no data yet
            message = `Merhaba ORCA,
Sipariş vermek istiyorum.

Detaylar:
- Ürün: 
- Miktar: 
- Kullanım alanı: 
- Teslimat şehri: 

Detaylı teklif alabilir miyim?`;
        }

        return `https://wa.me/${CONFIG.WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    }

    // ============================================
    // RENDER SCREENS
    // ============================================
    function renderScreen(screenName) {
        chatState.currentScreen = screenName;

        switch (screenName) {
            case 'welcome':
                renderWelcomeScreen();
                break;
            case 'product':
                renderProductScreen();
                break;
            case 'specs':
                renderSpecsScreen();
                break;
            case 'contact':
                renderContactScreen();
                break;
            case 'confirm':
                renderConfirmScreen();
                break;
            case 'success':
                renderSuccessScreen();
                break;
        }
    }

    // ============================================
    // WELCOME SCREEN
    // ============================================
    function renderWelcomeScreen() {
        hideInputArea();

        elements.messagesContainer.innerHTML = `
            <div class="orca-screen welcome-screen">
                <div class="text-center mb-6">
                    <div class="text-4xl mb-3">🌲</div>
                    <h2 class="text-xl font-bold text-white mb-2">ORCA Sipariş Asistanı</h2>
                    <p class="text-gray-400 text-sm">Size nasıl yardımcı olabilirim?</p>
                </div>
                
                <div class="grid grid-cols-1 gap-4 mb-6">
                    <button onclick="window.orcaAssistant.openWhatsAppDirect()" 
                            class="orca-path-btn whatsapp-btn">
                        <div class="flex items-center gap-4">
                            <div class="text-3xl">💬</div>
                            <div class="text-left">
                                <div class="font-bold text-white">WhatsApp Hızlı İletişim</div>
                                <div class="text-sm text-gray-300">Anında yanıt • Fotoğraf • Sesli mesaj</div>
                            </div>
                        </div>
                    </button>
                    
                    <button onclick="window.orcaAssistant.goToScreen('product')" 
                            class="orca-path-btn ai-btn">
                        <div class="flex items-center gap-4">
                            <div class="text-3xl">🤖</div>
                            <div class="text-left">
                                <div class="font-bold text-white">AI Destekli Form</div>
                                <div class="text-sm text-gray-300">Organize sipariş • 60 saniye</div>
                            </div>
                        </div>
                    </button>
                </div>
                
                <div class="text-center text-gray-500 text-xs">
                    <p>📞 Telefon: ${CONFIG.PHONE}</p>
                    <p class="mt-1">📧 ${CONFIG.EMAIL}</p>
                </div>
            </div>
        `;
    }

    // ============================================
    // PRODUCT SELECTION SCREEN
    // ============================================
    function renderProductScreen() {
        hideInputArea();

        let categoryButtons = '';
        for (const [key, cat] of Object.entries(CATEGORIES)) {
            const selected = chatState.product.category === key ? 'selected' : '';
            categoryButtons += `
                <button onclick="window.orcaAssistant.selectCategory('${key}')" 
                        class="orca-category-btn ${selected}">
                    <div class="text-2xl mb-1">${cat.icon}</div>
                    <div class="text-sm font-medium">${cat.name}</div>
                </button>
            `;
        }

        elements.messagesContainer.innerHTML = `
            <div class="orca-screen product-screen">
                <div class="orca-progress">
                    <span class="active">1</span>
                    <span class="line"></span>
                    <span>2</span>
                    <span class="line"></span>
                    <span>3</span>
                </div>
                
                <h2 class="text-lg font-bold text-white mb-2 text-center">
                    Hangi ürün için yardım istiyorsunuz?
                </h2>

                <!-- Smart Search Input -->
                <div class="mb-6 relative">
                    <div class="flex gap-2">
                        <input type="text" id="magic-search-input" 
                               placeholder="Örn: İhracat için 100 tane palet lazım..." 
                               class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white text-sm focus:border-brand-wood outline-none transition-colors"
                               onkeypress="if(event.key === 'Enter') window.orcaAssistant.handleMagicSearch()">
                        <button onclick="window.orcaAssistant.handleMagicSearch()" 
                                class="bg-brand-wood text-black px-4 py-2 rounded-lg font-bold hover:bg-white transition-colors whitespace-nowrap">
                            ✨ AI Sor
                        </button>
                    </div>
                    <div id="magic-search-feedback" class="text-xs mt-2 text-gray-400 min-h-[20px]"></div>
                </div>
                
                <div class="grid grid-cols-3 gap-3 mb-6">
                    ${categoryButtons}
                </div>
                
                <div class="orca-nav-buttons">
                    <button onclick="window.orcaAssistant.goToScreen('welcome')" class="orca-btn-secondary">
                        ← Geri
                    </button>
                    <button onclick="window.orcaAssistant.goToScreen('specs')" 
                            class="orca-btn-primary" 
                            ${!chatState.product.category ? 'disabled' : ''}>
                        Devam →
                    </button>
                </div>
            </div>
        `;
    }

    // ============================================
    // SPECS SCREEN (Context-Aware)
    // ============================================
    function renderSpecsScreen() {
        hideInputArea();

        const cat = CATEGORIES[chatState.product.category];
        if (!cat) {
            renderProductScreen();
            return;
        }

        // Subcategory options
        let subcategoryOptions = cat.subcategories.map(sub =>
            `<option value="${sub}" ${chatState.product.subcategory === sub ? 'selected' : ''}>${sub}</option>`
        ).join('');

        // Size options (if available)
        let sizeSection = '';
        if (cat.sizes) {
            let sizeOptions = cat.sizes.map(size =>
                `<option value="${size}" ${chatState.product.dimensions === size ? 'selected' : ''}>${size}</option>`
            ).join('');
            sizeSection = `
                <div class="orca-field">
                    <label>📏 Boyut</label>
                    <div class="flex gap-2 mb-2">
                        <button onclick="window.orcaAssistant.setSizeType('standard')" 
                                class="orca-toggle-btn ${chatState.product.sizeType === 'standard' ? 'active' : ''}">
                            Standart
                        </button>
                        <button onclick="window.orcaAssistant.setSizeType('custom')" 
                                class="orca-toggle-btn ${chatState.product.sizeType === 'custom' ? 'active' : ''}">
                            Özel Ölçü
                        </button>
                    </div>
                    ${chatState.product.sizeType === 'standard' ? `
                        <select id="spec-dimensions" onchange="window.orcaAssistant.updateSpec('dimensions', this.value)">
                            <option value="">Boyut seçin...</option>
                            ${sizeOptions}
                        </select>
                    ` : chatState.product.sizeType === 'custom' ? `
                        <input type="text" id="spec-dimensions" placeholder="En × Boy × Yükseklik (cm)" 
                               value="${chatState.product.dimensions || ''}"
                               onchange="window.orcaAssistant.updateSpec('dimensions', this.value)">
                    ` : ''}
                </div>
            `;
        } else {
            sizeSection = `
                <div class="orca-field">
                    <label>📏 Boyut (Özel)</label>
                    <input type="text" id="spec-dimensions" placeholder="En × Boy × Yükseklik (cm)" 
                           value="${chatState.product.dimensions || ''}"
                           onchange="window.orcaAssistant.updateSpec('dimensions', this.value)">
                </div>
            `;
        }

        // ISPM section (if applicable)
        let usageSection = '';
        if (cat.showISPM) {
            usageSection = `
                <div class="orca-field">
                    <label>🌍 Kullanım Amacı</label>
                    <div class="flex gap-2">
                        <button onclick="window.orcaAssistant.updateSpec('usage', 'domestic')" 
                                class="orca-toggle-btn flex-1 ${chatState.product.usage === 'domestic' ? 'active' : ''}">
                            Yurtiçi
                        </button>
                        <button onclick="window.orcaAssistant.updateSpec('usage', 'export')" 
                                class="orca-toggle-btn flex-1 ${chatState.product.usage === 'export' ? 'active' : ''}">
                            İhracat (ISPM-15)
                        </button>
                    </div>
                </div>
            `;
        }

        elements.messagesContainer.innerHTML = `
            <div class="orca-screen specs-screen">
                <div class="orca-progress">
                    <span class="done">✓</span>
                    <span class="line done"></span>
                    <span class="active">2</span>
                    <span class="line"></span>
                    <span>3</span>
                </div>
                
                <h2 class="text-lg font-bold text-white mb-4 text-center">
                    ${cat.icon} ${cat.name} Detayları
                </h2>
                
                <div class="orca-form">
                    <div class="orca-field">
                        <label>📦 Ürün Tipi</label>
                        <select id="spec-subcategory" onchange="window.orcaAssistant.updateSpec('subcategory', this.value)">
                            <option value="">Seçin...</option>
                            ${subcategoryOptions}
                        </select>
                    </div>
                    
                    <div class="orca-field">
                        <label>🔢 Miktar</label>
                        <input type="number" id="spec-quantity" placeholder="Adet sayısı" min="1"
                               value="${chatState.product.quantity || ''}"
                               onchange="window.orcaAssistant.updateSpec('quantity', this.value)">
                        <span class="orca-hint">💡 Min. sipariş: 50 adet</span>
                    </div>
                    
                    ${sizeSection}
                    ${usageSection}
                    
                    <div class="orca-field">
                        <label>💬 Ek Açıklama (İsteğe bağlı)</label>
                        <textarea id="spec-notes" rows="2" placeholder="Özel talepler..."
                                  onchange="window.orcaAssistant.updateSpec('notes', this.value)">${chatState.product.notes || ''}</textarea>
                    </div>
                    
                    <div class="orca-media-buttons">
                        <button onclick="window.orcaAssistant.triggerPhotoUpload()" class="orca-media-btn">
                            📷 Fotoğraf Ekle
                        </button>
                        <button onclick="window.orcaAssistant.startVoiceRecording()" 
                                class="orca-media-btn ${chatState.isRecording ? 'recording' : ''}">
                            ${chatState.isRecording ? '🔴 Kaydediliyor... (Durdur)' : '🎤 Sesli Not'}
                        </button>
                    </div>
                    
                    ${renderAttachmentPreviews()}
                </div>
                
                <div class="orca-nav-buttons">
                    <button onclick="window.orcaAssistant.goToScreen('product')" class="orca-btn-secondary">
                        ← Geri
                    </button>
                    <button onclick="window.orcaAssistant.goToScreen('contact')" class="orca-btn-primary">
                        Devam →
                    </button>
                </div>
            </div>
        `;

        // Hidden file input
        if (!document.getElementById('orca-photo-input')) {
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.id = 'orca-photo-input';
            fileInput.accept = 'image/*';
            fileInput.style.display = 'none';
            fileInput.onchange = handlePhotoUpload;
            document.body.appendChild(fileInput);
        }
    }

    // ============================================
    // CONTACT SCREEN
    // ============================================
    function renderContactScreen() {
        hideInputArea();

        elements.messagesContainer.innerHTML = `
            <div class="orca-screen contact-screen">
                <div class="orca-progress">
                    <span class="done">✓</span>
                    <span class="line done"></span>
                    <span class="done">✓</span>
                    <span class="line done"></span>
                    <span class="active">3</span>
                </div>
                
                <h2 class="text-lg font-bold text-white mb-4 text-center">
                    İletişim Bilgileriniz
                </h2>
                
                <div id="contact-errors"></div>
                
                <div class="orca-form">
                    <div class="orca-field">
                        <label>👤 Ad Soyad *</label>
                        <input type="text" id="contact-name" placeholder="Adınız Soyadınız"
                               value="${chatState.contact.name || ''}"
                               onchange="window.orcaAssistant.updateContact('name', this.value)">
                    </div>
                    
                    <div class="orca-field">
                        <label>🏢 Firma Adı *</label>
                        <input type="text" id="contact-company" placeholder="Şirket ünvanı"
                               value="${chatState.contact.company || ''}"
                               onchange="window.orcaAssistant.updateContact('company', this.value)">
                    </div>
                    
                    <div class="orca-field">
                        <label>📱 Telefon *</label>
                        <input type="tel" id="contact-phone" placeholder="0533 123 4567"
                               value="${chatState.contact.phone || ''}"
                               onchange="window.orcaAssistant.updateContact('phone', this.value)">
                    </div>
                    
                    <div class="orca-field">
                        <label>📧 E-posta *</label>
                        <input type="email" id="contact-email" placeholder="email@firma.com"
                               value="${chatState.contact.email || ''}"
                               onchange="window.orcaAssistant.updateContact('email', this.value)">
                    </div>
                    
                    <div class="orca-field">
                        <label>🚚 Teslimat Şehri *</label>
                        <input type="text" id="contact-city" placeholder="Örn: Bursa, İstanbul"
                               value="${chatState.contact.city || ''}"
                               onchange="window.orcaAssistant.updateContact('city', this.value)">
                    </div>
                    
                    <div class="orca-field">
                        <label>⏰ Ne zaman ihtiyacınız var?</label>
                        <div class="flex gap-2 flex-wrap">
                            <button onclick="window.orcaAssistant.setTimeline('urgent')" 
                                    class="orca-toggle-btn ${chatState.timeline === 'urgent' ? 'active' : ''}">
                                Acil
                            </button>
                            <button onclick="window.orcaAssistant.setTimeline('normal')" 
                                    class="orca-toggle-btn ${chatState.timeline === 'normal' ? 'active' : ''}">
                                Normal
                            </button>
                            <button onclick="window.orcaAssistant.setTimeline('flexible')" 
                                    class="orca-toggle-btn ${chatState.timeline === 'flexible' ? 'active' : ''}">
                                Esnek
                            </button>
                        </div>
                    </div>
                </div>
                
                <div class="orca-nav-buttons">
                    <button onclick="window.orcaAssistant.goToScreen('specs')" class="orca-btn-secondary">
                        ← Geri
                    </button>
                    <button onclick="window.orcaAssistant.validateAndProceedToConfirm()" class="orca-btn-primary">
                        Önizleme →
                    </button>
                </div>
            </div>
        `;
    }

    // ============================================
    // CONFIRMATION SCREEN
    // ============================================
    function renderConfirmScreen() {
        hideInputArea();

        const cat = CATEGORIES[chatState.product.category];
        const orderNumber = generateOrderNumber();
        chatState.orderNumber = orderNumber;

        elements.messagesContainer.innerHTML = `
            <div class="orca-screen confirm-screen">
                <h2 class="text-lg font-bold text-white mb-4 text-center">
                    ✅ Talebiniz Hazır
                </h2>
                
                <div class="orca-summary">
                    <div class="orca-summary-section">
                        <h3>📦 Ürün</h3>
                        <p>${cat?.icon || ''} ${chatState.product.subcategory || chatState.product.category || '-'}</p>
                        <p>Miktar: ${chatState.product.quantity || '-'} adet</p>
                        <p>Boyut: ${chatState.product.dimensions || 'Belirtilmedi'}</p>
                        ${chatState.product.usage ? `<p>${chatState.product.usage === 'export' ? '🌍 İhracat (ISPM-15)' : '🏠 Yurtiçi'}</p>` : ''}
                    </div>
                    
                    <div class="orca-summary-section">
                        <h3>👤 İletişim</h3>
                        <p>${chatState.contact.name || '-'}</p>
                        <p>🏢 ${chatState.contact.company || '-'}</p>
                        <p>📱 ${chatState.contact.phone || '-'}</p>
                        <p>📧 ${chatState.contact.email || '-'}</p>
                        <p>🚚 ${chatState.contact.city || '-'}</p>
                    </div>
                    
                    ${chatState.product.notes ? `
                        <div class="orca-summary-section">
                            <h3>💬 Notlar</h3>
                            <p>${chatState.product.notes}</p>
                        </div>
                    ` : ''}
                    
                    ${chatState.attachments.length > 0 || chatState.voiceNote ? `
                        <div class="orca-summary-section">
                            <h3>📎 Ekler</h3>
                            ${chatState.attachments.length > 0 ? `<p>📷 ${chatState.attachments.length} fotoğraf</p>` : ''}
                            ${chatState.voiceNote ? `<p>🎤 Sesli not eklendi</p>` : ''}
                        </div>
                    ` : ''}
                </div>
                
                <button onclick="window.orcaAssistant.goToScreen('contact')" class="orca-edit-btn">
                    ✏️ Düzenle
                </button>
                
                <h3 class="text-white text-center mt-6 mb-4">Nasıl göndermek istersiniz?</h3>
                
                <div class="orca-submit-options">
                    <button onclick="window.orcaAssistant.submitOrder('email')" class="orca-submit-btn email">
                        <div class="text-2xl mb-1">📧</div>
                        <div class="font-bold">E-posta ile Gönder</div>
                        <div class="text-xs opacity-75">~2 saat içinde yanıt</div>
                    </button>
                    
                    <button onclick="window.orcaAssistant.submitOrder('whatsapp')" class="orca-submit-btn whatsapp">
                        <div class="text-2xl mb-1">💬</div>
                        <div class="font-bold">WhatsApp ile Devam</div>
                        <div class="text-xs opacity-75">Anında görüşme</div>
                    </button>
                    
                    <button onclick="window.orcaAssistant.submitOrder('both')" class="orca-submit-btn both">
                        <div class="text-2xl mb-1">📧💬</div>
                        <div class="font-bold">Her İkisi</div>
                        <div class="text-xs opacity-75">Önerilen</div>
                    </button>
                </div>
            </div>
        `;
    }

    // ============================================
    // SUCCESS SCREEN
    // ============================================
    function renderSuccessScreen() {
        hideInputArea();

        const whatsappSent = chatState.submittedVia === 'whatsapp' || chatState.submittedVia === 'both';
        const emailSent = chatState.submittedVia === 'email' || chatState.submittedVia === 'both';

        elements.messagesContainer.innerHTML = `
            <div class="orca-screen success-screen">
                <div class="text-center mb-6">
                    <div class="text-5xl mb-3">✅</div>
                    <h2 class="text-xl font-bold text-white mb-2">Talebiniz İletildi!</h2>
                    <p class="text-brand-wood">Sipariş No: ${chatState.orderNumber}</p>
                </div>
                
                <div class="orca-success-details">
                    ${emailSent ? `
                        <div class="orca-success-item">
                            <span class="text-green-400">✓</span>
                            <span>E-posta gönderildi</span>
                        </div>
                    ` : ''}
                    
                    ${whatsappSent ? `
                        <div class="orca-success-item">
                            <span class="text-green-400">✓</span>
                            <span>WhatsApp mesajı hazır</span>
                        </div>
                    ` : ''}
                </div>
                
                <div class="orca-response-time">
                    <p>⏱️ <strong>Yanıt Süresi:</strong></p>
                    <p>E-posta: ~2 saat içinde</p>
                    <p>WhatsApp: 10-30 dakika</p>
                </div>
                
                <div class="orca-urgent-contact">
                    <p class="font-bold mb-2">📞 Acil mi?</p>
                    <p><a href="tel:${CONFIG.PHONE}">${CONFIG.PHONE}</a> (Bursa)</p>
                    <p><a href="tel:+${CONFIG.WHATSAPP_NUMBER}">${CONFIG.WHATSAPP_DISPLAY}</a> (Mobil)</p>
                </div>
                
                <div class="orca-nav-buttons mt-6">
                    <button onclick="window.orcaAssistant.reset()" class="orca-btn-secondary">
                        🔄 Yeni Sipariş
                    </button>
                    <button onclick="closeAIChat()" class="orca-btn-primary">
                        🏠 Kapat
                    </button>
                </div>
            </div>
        `;
    }

    // ============================================
    // HELPER FUNCTIONS
    // ============================================
    function hideInputArea() {
        if (elements.inputArea) {
            elements.inputArea.style.display = 'none';
        }
    }

    function selectCategory(key) {
        chatState.product.category = key;
        // Reset subcategory and size when category changes
        chatState.product.subcategory = null;
        chatState.product.dimensions = null;
        chatState.product.sizeType = null;
        chatState.product.usage = null;
        renderProductScreen();
    }

    function updateSpec(field, value) {
        chatState.product[field] = value;
    }

    function updateContact(field, value) {
        chatState.contact[field] = value;
        // Save to localStorage for autofill
        saveContactToStorage();
    }

    function setSizeType(type) {
        chatState.product.sizeType = type;
        chatState.product.dimensions = null;
        renderSpecsScreen();
    }

    function setTimeline(value) {
        chatState.timeline = value;
        renderContactScreen();
    }

    function goToScreen(screen) {
        renderScreen(screen);
    }

    function openWhatsAppDirect() {
        window.open(generateWhatsAppLink(), '_blank');
    }

    // ============================================
    // LOCALSTORAGE AUTOFILL
    // ============================================
    function saveContactToStorage() {
        try {
            localStorage.setItem('orca_contact', JSON.stringify(chatState.contact));
        } catch (e) {
            console.log('Could not save to localStorage');
        }
    }

    function loadContactFromStorage() {
        try {
            const saved = localStorage.getItem('orca_contact');
            if (saved) {
                const contact = JSON.parse(saved);
                // Only load if we have valid data
                if (contact && contact.name) {
                    chatState.contact = { ...chatState.contact, ...contact };
                    return true;
                }
            }
        } catch (e) {
            console.log('Could not load from localStorage');
        }
        return false;
    }

    // ============================================
    // INPUT VALIDATION
    // ============================================
    function validatePhone(phone) {
        if (!phone) return false;
        const cleaned = phone.replace(/\D/g, '');
        return cleaned.length >= 10 && cleaned.length <= 11;
    }

    function validateEmail(email) {
        if (!email) return false;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    function validateContactForm() {
        const errors = [];
        if (!chatState.contact.name || chatState.contact.name.trim().length < 2) {
            errors.push('Ad Soyad gerekli');
        }
        if (!chatState.contact.company || chatState.contact.company.trim().length < 2) {
            errors.push('Firma adı gerekli');
        }
        if (!validatePhone(chatState.contact.phone)) {
            errors.push('Geçerli telefon numarası girin');
        }
        if (!validateEmail(chatState.contact.email)) {
            errors.push('Geçerli e-posta adresi girin');
        }
        if (!chatState.contact.city || chatState.contact.city.trim().length < 2) {
            errors.push('Teslimat şehri gerekli');
        }
        return errors;
    }

    function validateAndProceedToConfirm() {
        const errors = validateContactForm();
        const errorContainer = document.getElementById('contact-errors');

        if (errors.length > 0) {
            if (errorContainer) {
                errorContainer.innerHTML = `
                    <div class="orca-error">
                        ${errors.map(err => `<p>${err}</p>`).join('')}
                    </div>
                `;
                // Scroll to errors
                errorContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
            } else {
                alert(errors.join('\n'));
            }
        } else {
            if (errorContainer) errorContainer.innerHTML = '';
            goToScreen('confirm');
        }
    }

    // ============================================
    // LOADING STATE
    // ============================================
    function showLoading(message = 'Gönderiliyor...') {
        const loadingHtml = `
            <div class="orca-loading">
                <div class="orca-spinner"></div>
                <p>${message}</p>
            </div>
        `;
        elements.messagesContainer.innerHTML = loadingHtml;
    }

    // ============================================
    // PHOTO UPLOAD
    // ============================================
    function triggerPhotoUpload() {
        document.getElementById('orca-photo-input')?.click();
    }

    function handlePhotoUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert('Lütfen sadece fotoğraf yükleyin (JPG, PNG)');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            alert('Fotoğraf boyutu 5MB\'dan küçük olmalı');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            chatState.attachments.push({
                type: 'image',
                data: e.target.result,
                filename: file.name
            });
            renderSpecsScreen(); // Refresh to show attachment
        };
        reader.readAsDataURL(file);
    }

    // ============================================
    // ATTACHMENT PREVIEW RENDERING
    // ============================================
    function renderAttachmentPreviews() {
        if (chatState.attachments.length === 0 && !chatState.voiceNote) {
            return '';
        }

        let html = '<div class="orca-attachments-preview">';

        // Image previews
        const images = chatState.attachments.filter(a => a.type === 'image');
        if (images.length > 0) {
            html += `<div class="orca-preview-section"><h4>📷 Fotoğraflar (${images.length})</h4><div class="orca-preview-grid">`;
            images.forEach((img, idx) => {
                const globalIdx = chatState.attachments.indexOf(img);
                html += `
                    <div class="orca-preview-item">
                        <img src="${img.data}" alt="${img.filename}" class="orca-preview-thumb">
                        <button onclick="window.orcaAssistant.removeAttachment(${globalIdx})" class="orca-remove-btn">×</button>
                        <span class="orca-preview-name">${img.filename.substring(0, 15)}...</span>
                    </div>
                `;
            });
            html += '</div></div>';
        }

        // Audio previews
        const audios = chatState.attachments.filter(a => a.type === 'audio');
        if (audios.length > 0) {
            audios.forEach((audio, idx) => {
                const globalIdx = chatState.attachments.indexOf(audio);
                html += `
                    <div class="orca-preview-section">
                        <h4>🎤 Sesli Not</h4>
                        <div class="orca-audio-preview">
                            <audio controls src="${audio.data}" class="orca-audio-player"></audio>
                            <button onclick="window.orcaAssistant.removeAttachment(${globalIdx})" class="orca-remove-btn audio">× Sil</button>
                        </div>
                    </div>
                `;
            });
        }

        // Voice transcript (if available)
        if (chatState.voiceNote && chatState.voiceNote !== 'Sesli not eklendi') {
            html += `
                <div class="orca-transcript">
                    <strong>📝 Transkript:</strong>
                    <p>"${chatState.voiceNote}"</p>
                </div>
            `;
        }

        html += '</div>';
        return html;
    }

    function removeAttachment(index) {
        if (index >= 0 && index < chatState.attachments.length) {
            const removed = chatState.attachments.splice(index, 1)[0];
            // If it was an audio, also clear voice note transcript
            if (removed.type === 'audio') {
                chatState.voiceNote = null;
            }
            renderSpecsScreen();
        }
    }

    // ============================================
    // VOICE RECORDING (MediaRecorder + Web Speech API)
    // ============================================
    let mediaRecorder = null;
    let audioChunks = [];
    let speechRecognition = null;
    let currentStream = null;
    let fullTranscript = '';

    async function startVoiceRecording() {
        // 1. Browser Feature Detection
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            alert('Tarayıcınız ses kaydını desteklemiyor. Lütfen Chrome, Safari veya Firefox güncel sürümünü kullanın.');
            return;
        }

        if (!window.MediaRecorder) {
            alert('Tarayıcınızda ses kaydı desteği eksik (MediaRecorder). Yazarak devam edebilirsiniz.');
            return;
        }

        // If already recording, stop it
        if (chatState.isRecording && mediaRecorder) {
            stopVoiceRecording();
            return;
        }

        try {
            // 1. Get Audio Stream for MediaRecorder
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            currentStream = stream;
            mediaRecorder = new MediaRecorder(stream);
            audioChunks = [];
            fullTranscript = ''; // Reset transcript

            // Update state
            chatState.isRecording = true;
            chatState.voiceNote = null; // Clear previous note
            updateRecordingUI(true);

            // 2. Start Web Speech API for transcription (Parallel)
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (SpeechRecognition) {
                speechRecognition = new SpeechRecognition();
                speechRecognition.lang = 'tr-TR';
                speechRecognition.continuous = true;
                speechRecognition.interimResults = true;

                speechRecognition.onresult = (event) => {
                    let interimTranscript = '';
                    let finalTranscript = '';

                    for (let i = event.resultIndex; i < event.results.length; i++) {
                        const transcript = event.results[i][0].transcript;
                        if (event.results[i].isFinal) {
                            finalTranscript += transcript + ' ';
                        } else {
                            interimTranscript += transcript;
                        }
                    }

                    if (finalTranscript) {
                        fullTranscript += finalTranscript;
                    }

                    const currentText = (fullTranscript + interimTranscript).trim();
                    if (currentText) {
                        chatState.voiceNote = currentText;
                        // Update UI seamlessly without breaking recording state
                        updateTranscriptUI();
                    }
                };

                speechRecognition.onerror = (event) => {
                    console.log('Speech recognition error:', event.error);
                };

                // Auto-restart if it stops but we are still recording
                speechRecognition.onend = () => {
                    if (chatState.isRecording && speechRecognition) {
                        try {
                            speechRecognition.start();
                        } catch (e) { /* ignore */ }
                    }
                };

                try {
                    speechRecognition.start();
                } catch (e) {
                    console.log('Speech recognition start failed', e);
                }
            }

            // 3. Handle Audio Data
            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunks.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });

                // Convert to base64 for email attachment
                const reader = new FileReader();
                reader.onload = (e) => {
                    chatState.attachments.push({
                        type: 'audio',
                        data: e.target.result,
                        filename: `sesli-not-${Date.now()}.webm`
                    });

                    // Final check on transcript
                    if (!chatState.voiceNote || chatState.voiceNote.trim() === '') {
                        chatState.voiceNote = 'Sesli not kaydedildi (Transkript alınamadı)';
                    }

                    chatState.isRecording = false;

                    // Stop all tracks
                    if (currentStream) {
                        currentStream.getTracks().forEach(track => track.stop());
                    }

                    if (speechRecognition) {
                        speechRecognition.onend = null; // Prevent restart
                        speechRecognition.stop();
                    }

                    renderSpecsScreen();
                };
                reader.readAsDataURL(audioBlob);
            };

            mediaRecorder.start();

        } catch (error) {
            console.error('Microphone access error:', error);
            alert('Mikrofon erişimi sağlanamadı. Lütfen tarayıcı izinlerini kontrol edin.');
            chatState.isRecording = false;
            updateRecordingUI(false);
        }
    }

    function stopVoiceRecording() {
        if (mediaRecorder && mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
            // isRecording set to false in onstop handler
        }
    }

    function updateRecordingUI(recording) {
        const btn = document.querySelector('.orca-media-btn:nth-child(2)');
        if (btn) {
            if (recording) {
                btn.innerHTML = '🔴 Kaydediliyor... (Durdurmak için tıkla)';
                btn.classList.add('recording');
            } else {
                btn.innerHTML = '🎤 Sesli Not';
                btn.classList.remove('recording');
            }
        }
    }

    // Helper to update just the transcript part of screen (if visible) or log it
    function updateTranscriptUI() {
        // If the transcript area exists, update it. If not, we might need to inject it.
        // Since re-rendering the whole screen kills the recording button state, we avoid renderSpecsScreen()
        // But the user wants to SEE what they are saying.
        // We will inject/update a specific element for transcript preview.

        let transcriptContainer = document.getElementById('active-transcript');
        if (!transcriptContainer) {
            // Find where to insert it - after buttons
            const buttons = document.querySelector('.orca-media-buttons');
            if (buttons) {
                transcriptContainer = document.createElement('div');
                transcriptContainer.id = 'active-transcript';
                transcriptContainer.className = 'orca-transcript';
                transcriptContainer.style.marginTop = '1rem';
                buttons.parentNode.insertBefore(transcriptContainer, buttons.nextSibling);
            }
        }

        if (transcriptContainer) {
            transcriptContainer.innerHTML = `
                <strong>🔴 Dinleniyor:</strong>
                <p>"${chatState.voiceNote}"</p>
            `;
        }
    }

    // ============================================
    // ORDER SUBMISSION
    // ============================================
    async function submitOrder(method) {
        chatState.submittedVia = method;

        // Show loading state for email submission
        if (method === 'email' || method === 'both') {
            showLoading('Sipariş gönderiliyor...');
        }

        // Prepare order data
        const orderData = {
            orderNumber: chatState.orderNumber,
            product: chatState.product,
            contact: chatState.contact,
            timeline: chatState.timeline,
            voiceNote: chatState.voiceNote,
            attachments: chatState.attachments.map(att => ({
                filename: att.filename,
                content: att.data.split(',')[1], // Remove data:image/...;base64,
                type: att.type
            }))
        };

        // Send email if requested
        if (method === 'email' || method === 'both') {
            try {
                await sendOrderEmail(orderData);
            } catch (error) {
                console.error('Email error:', error);
                // Still continue to success screen - show fallback contact info
            }
        }

        // Open WhatsApp if requested
        if (method === 'whatsapp' || method === 'both') {
            const whatsappUrl = generateWhatsAppLink(chatState);
            window.open(whatsappUrl, '_blank');
        }

        renderSuccessScreen();
    }

    async function sendOrderEmail(orderData) {
        const response = await fetch(CONFIG.SEND_ORDER_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                orderNumber: orderData.orderNumber,
                customerName: orderData.contact.name,
                customerEmail: orderData.contact.email,
                customerPhone: orderData.contact.phone,
                companyName: orderData.contact.company,
                orderDetails: formatOrderDetails(orderData),
                attachments: orderData.attachments
            })
        });

        return response.json();
    }

    function formatOrderDetails(orderData) {
        const cat = CATEGORIES[orderData.product.category];
        return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 YENİ SİPARİŞ TALEBİ
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Sipariş No: ${orderData.orderNumber}
Tarih: ${new Date().toLocaleString('tr-TR')}
Kaynak: Website AI Asistanı

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ÜRÜN BİLGİLERİ
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Kategori: ${cat?.name || orderData.product.category}
Ürün Tipi: ${orderData.product.subcategory || '-'}
Miktar: ${orderData.product.quantity || '-'} adet
Boyut: ${orderData.product.dimensions || 'Belirtilmedi'}
Kullanım: ${orderData.product.usage === 'export' ? 'İhracat (ISPM-15 gerekli)' : 'Yurtiçi'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MÜŞTERİ BİLGİLERİ
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Ad Soyad: ${orderData.contact.name}
Firma: ${orderData.contact.company}
Telefon: ${orderData.contact.phone}
E-posta: ${orderData.contact.email}
Şehir: ${orderData.contact.city}
Aciliyet: ${orderData.timeline === 'urgent' ? 'Acil (Bu hafta)' : orderData.timeline === 'normal' ? 'Normal (2-3 hafta)' : 'Esnek'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NOTLAR & EKLER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Müşteri Notu: ${orderData.product.notes || 'Belirtilmedi'}
${orderData.voiceNote ? `Sesli Not: "${orderData.voiceNote}"` : ''}
${orderData.attachments.length > 0 ? `📎 ${orderData.attachments.length} fotoğraf eklendi` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        `.trim();
    }

    function reset() {
        // Reset state
        Object.assign(chatState, {
            currentScreen: 'welcome',
            product: { category: null, subcategory: null, quantity: null, sizeType: null, dimensions: null, usage: null, notes: null },
            contact: { name: null, company: null, phone: null, email: null, city: null },
            timeline: null,
            attachments: [],
            voiceNote: null,
            orderNumber: null,
            submittedVia: null
        });
        renderWelcomeScreen();
    }

    // ============================================
    // GESTURE HANDLING (Mobile Swipe)
    // ============================================
    let touchStartX = 0;
    let touchEndX = 0;

    function handleTouchStart(e) {
        touchStartX = e.changedTouches[0].screenX;
    }

    function handleTouchEnd(e) {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }

    function handleSwipe() {
        const threshold = 50; // Min swipe distance
        const swipeDistance = touchEndX - touchStartX;

        if (Math.abs(swipeDistance) < threshold) return;

        if (swipeDistance > 0) {
            // Right Swipe (Go Back)
            navigateFlow('back');
        } else {
            // Left Swipe (Go Next)
            // Only allow next if we have a valid primary action button that isn't disabled
            const nextBtn = document.querySelector('.orca-btn-primary');
            if (nextBtn && !nextBtn.disabled && nextBtn.offsetParent !== null) {
                // Determine next screen based on current state
                navigateFlow('next');
            }
        }
    }

    async function handleMagicSearch() {
        const input = document.getElementById('magic-search-input');
        const feedback = document.getElementById('magic-search-feedback');

        if (!input || !input.value.trim()) return;

        const originalText = input.value;

        // UI Loading State
        input.disabled = true;
        feedback.innerHTML = '<span class="animate-pulse">🤖 Düşünüyor...</span>';
        feedback.className = 'text-xs mt-2 text-brand-wood min-h-[20px]';

        try {
            const response = await fetch(CONFIG.API_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: originalText,
                    type: 'categorize',
                    context: {}
                })
            });

            const data = await response.json();

            if (data.success && data.response) {
                // Parse AI response (expecting specific JSON format from prompt)
                // The AI might return markdown code blocks, so clean it
                let cleanJson = data.response.replace(/```json/g, '').replace(/```/g, '').trim();

                try {
                    const result = JSON.parse(cleanJson);

                    if (result.category && CATEGORIES[result.category]) {
                        feedback.textContent = `✅ Anlaşıldı: ${CATEGORIES[result.category].name}`;
                        feedback.className = 'text-xs mt-2 text-green-400 min-h-[20px]';

                        // Auto-select category after short delay
                        setTimeout(() => {
                            selectCategory(result.category);
                            // Pre-fill notes with the original search text
                            chatState.product.notes = originalText;
                        }, 800);
                        return;
                    }
                } catch (e) {
                    console.error('AI JSON parse error:', e);
                }
            }

            feedback.textContent = 'Biraz daha detay verebilir misiniz? Veya aşağıdan seçebilirsiniz.';
            feedback.className = 'text-xs mt-2 text-orange-400 min-h-[20px]';

        } catch (error) {
            console.error('Magic search error:', error);
            feedback.textContent = 'Bağlantı hatası. Lütfen listeden seçin.';
        } finally {
            input.disabled = false;
            input.focus();
        }
    }

    function navigateFlow(direction) {
        const screenOrder = ['welcome', 'product', 'specs', 'contact', 'confirm'];
        const currentIdx = screenOrder.indexOf(chatState.currentScreen);

        if (currentIdx === -1) return;

        if (direction === 'back') {
            if (currentIdx > 0) {
                goToScreen(screenOrder[currentIdx - 1]);
            }
        } else if (direction === 'next') {
            // SPECIAL CHECKS FOR VALIDATION BEFORE PROCEEDING
            if (chatState.currentScreen === 'contact') {
                validateAndProceedToConfirm();
                return;
            }

            // Standard flow
            if (currentIdx < screenOrder.length - 1) {
                // Check if 'next' is actually allowed (e.g., category selected)
                if (chatState.currentScreen === 'product' && !chatState.product.category) return;

                goToScreen(screenOrder[currentIdx + 1]);
            }
        }
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

        // Add Touch Listeners for Swipe
        elements.messagesContainer.addEventListener('touchstart', handleTouchStart, { passive: true });
        elements.messagesContainer.addEventListener('touchend', handleTouchEnd, { passive: true });

        // Override openAIChat to start our flow
        const originalOpenAIChat = window.openAIChat;
        window.openAIChat = function () {
            if (originalOpenAIChat) originalOpenAIChat();
            setTimeout(() => renderWelcomeScreen(), 100);
        };

        // Expose functions globally
        window.orcaAssistant = {
            goToScreen,
            selectCategory,
            updateSpec,
            updateContact,
            setSizeType,
            setTimeline,
            openWhatsAppDirect,
            triggerPhotoUpload,
            startVoiceRecording,
            handleMagicSearch,
            removeAttachment,
            submitOrder,
            validateAndProceedToConfirm,
            reset
        };

        // Try to load saved contact info
        loadContactFromStorage();

        console.log('ORCA AI Assistant (Dual-Path) initialized');
    }

    // Wait for DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        setTimeout(init, 100);
    }

})();
