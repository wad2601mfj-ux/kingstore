// Firebase configuration
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// DOM Elements
const userInput = document.getElementById('userInput');
const sendButton = document.getElementById('sendButton');
const chatMessages = document.getElementById('chatMessages');
const offersList = document.getElementById('offersList');
const suggestions = document.getElementById('suggestions');

// Sample sellers data
const sampleSellers = [
    { name: "Padang A", items: ["Nasi Rendang", "Nasi Ayam Pop", "Nasi Dagang"], basePrice: 17000 },
    { name: "Padang X", items: ["Nasi Ayam Bakar", "Nasi Ikan Goreng", "Nasi Telur Balado"], basePrice: 16000 },
    { name: "Warteg Bahari", items: ["Nasi Ayam Goreng", "Nasi Tempe Orek", "Nasi Sayur Lodeh"], basePrice: 15000 },
    { name: "Sweet Bakery", items: ["Chocolate Cake", "Donuts", "Cookies"], basePrice: 20000 },
    { name: "Quick Bites", items: ["Burger", "Sandwich", "French Fries"], basePrice: 25000 }
];

// Current user request
let currentRequest = null;
let messageCount = 0;
const MAX_MESSAGES = 10; // Maximum number of message pairs to keep

// Initialize app
function initApp() {
    // Listen for real-time offers updates
    listenForOffers();
    
    // Set up event listeners
    sendButton.addEventListener('click', sendMessage);
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });
    
    // Set up suggestion chips
    document.querySelectorAll('.suggestion-chip').forEach(chip => {
        chip.addEventListener('click', (e) => {
            userInput.value = e.target.dataset.query;
            sendMessage();
        });
    });
    
    // Create a messages container
    const messagesContainer = document.createElement('div');
    messagesContainer.className = 'messages-container';
    messagesContainer.id = 'messagesContainer';
    
    // Move existing welcome message to container
    const welcomeMessage = chatMessages.querySelector('.bot-message');
    if (welcomeMessage) {
        welcomeMessage.classList.add('welcome-message');
        messagesContainer.appendChild(welcomeMessage);
    }
    
    // Create main messages container
    const mainMessagesContainer = document.createElement('div');
    mainMessagesContainer.className = 'main-messages';
    mainMessagesContainer.id = 'mainMessagesContainer';
    messagesContainer.appendChild(mainMessagesContainer);
    
    chatMessages.innerHTML = '';
    chatMessages.appendChild(messagesContainer);
}

// Send user message
function sendMessage() {
    const message = userInput.value.trim();
    if (!message) return;
    
    // Add user message to chat
    addMessageToChat(message, 'user');
    userInput.value = '';
    
    // Process user request
    processUserRequest(message);
}

// Add message to chat with auto-scroll and message limit
function addMessageToChat(message, sender) {
    messageCount++;
    
    // Check if we need to remove old messages
    const mainMessagesContainer = document.getElementById('mainMessagesContainer');
    const messages = mainMessagesContainer.querySelectorAll('.message');
    
    // Keep only the last MAX_MESSAGES * 2 messages (user + bot pairs)
    if (messages.length >= MAX_MESSAGES * 2) {
        // Remove oldest messages
        const messagesToRemove = messages.length - (MAX_MESSAGES * 2 - 2);
        for (let i = 0; i < messagesToRemove; i++) {
            if (messages[i]) {
                messages[i].remove();
            }
        }
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;
    
    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    bubble.textContent = message;
    
    messageDiv.appendChild(bubble);
    mainMessagesContainer.appendChild(messageDiv);
    
    // Auto-scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Show typing indicator
function showTypingIndicator() {
    const mainMessagesContainer = document.getElementById('mainMessagesContainer');
    
    // Remove existing typing indicator if present
    const existingTyping = document.getElementById('typingIndicator');
    if (existingTyping) {
        existingTyping.remove();
    }
    
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message bot-message';
    typingDiv.id = 'typingIndicator';
    
    const bubble = document.createElement('div');
    bubble.className = 'typing-indicator';
    bubble.innerHTML = '<span></span><span></span><span></span>';
    
    typingDiv.appendChild(bubble);
    mainMessagesContainer.appendChild(typingDiv);
    
    // Auto-scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Hide typing indicator
function hideTypingIndicator() {
    const typingIndicator = document.getElementById('typingIndicator');
    if (typingIndicator) {
        typingIndicator.remove();
        
        // Auto-scroll to bottom after removing typing indicator
        setTimeout(() => {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }, 10);
    }
}

// Process user request
async function processUserRequest(message) {
    showTypingIndicator();
    
    // Simulate processing delay
    setTimeout(() => {
        hideTypingIndicator();
        
        // Extract keywords from message
        const keywords = extractKeywords(message.toLowerCase());
        
        // Create request object
        currentRequest = {
            id: generateId(),
            query: message,
            keywords: keywords,
            timestamp: new Date().toISOString(),
            status: 'active'
        };
        
        // Save request to Firestore
        saveRequest(currentRequest);
        
        // Generate bot response
        const response = generateBotResponse(keywords);
        addMessageToChat(response, 'bot');
        
        // Trigger auction (generate seller offers)
        triggerAuction(currentRequest);
        
    }, 800); // Reduced delay for better UX
}

// Extract keywords from user message
function extractKeywords(message) {
    const keywords = [];
    
    // Food type keywords
    const foodKeywords = [
        { keyword: 'nasi padang', type: 'food', category: 'indonesian' },
        { keyword: 'nasi', type: 'food', category: 'rice' },
        { keyword: 'sweet', type: 'taste', category: 'dessert' },
        { keyword: 'cheap', type: 'price', category: 'budget' },
        { keyword: 'fast', type: 'delivery', category: 'quick' },
        { keyword: 'simple', type: 'complexity', category: 'simple' },
        { keyword: 'last longer', type: 'quantity', category: 'large' },
        { keyword: 'a lot', type: 'quantity', category: 'large' }
    ];
    
    foodKeywords.forEach(item => {
        if (message.includes(item.keyword)) {
            keywords.push(item);
        }
    });
    
    return keywords;
}

// Generate bot response based on keywords
function generateBotResponse(keywords) {
    if (keywords.length === 0) {
        return "Got it! I'll find sellers who can offer you what you need. Check the offers section for live bids!";
    }
    
    const foodTypes = keywords.filter(k => k.type === 'food');
    const pricePref = keywords.find(k => k.type === 'price');
    const quantityPref = keywords.find(k => k.type === 'quantity');
    
    let response = "Perfect! ";
    
    if (foodTypes.length > 0) {
        const foods = foodTypes.map(f => f.keyword).join(', ');
        response += `Looking for ${foods}. `;
    }
    
    if (pricePref) {
        if (pricePref.keyword === 'cheap') {
            response += "I'll focus on finding the best prices. ";
        }
    }
    
    if (quantityPref) {
        if (quantityPref.keyword === 'a lot' || quantityPref.keyword === 'last longer') {
            response += "Looking for generous portions. ";
        }
    }
    
    response += "I've started an auction - sellers are now bidding for your business! Check the offers section.";
    
    return response;
}

// Trigger auction (generate seller offers)
async function triggerAuction(request) {
    // Clear previous offers
    offersList.innerHTML = '';
    
    // Filter relevant sellers based on keywords
    const relevantSellers = filterRelevantSellers(request.keywords);
    
    // Generate offers from sellers
    relevantSellers.forEach((seller, index) => {
        // Stagger the offers appearance
        setTimeout(() => {
            generateSellerOffer(request, seller);
        }, index * 500); // Each offer appears 0.5 seconds apart
    });
    
    if (relevantSellers.length === 0) {
        offersList.innerHTML = `
            <div class="no-offers">
                <i class="fas fa-search fa-3x"></i>
                <p>No sellers found for your request</p>
                <p>Try being more specific or try again later</p>
            </div>
        `;
    }
}

// Filter relevant sellers based on keywords
function filterRelevantSellers(keywords) {
    if (keywords.length === 0) {
        return sampleSellers.slice(0, 3); // Return first 3 sellers by default
    }
    
    const hasIndonesian = keywords.some(k => k.category === 'indonesian');
    const hasDessert = keywords.some(k => k.category === 'dessert');
    const wantsCheap = keywords.some(k => k.category === 'budget');
    
    let filteredSellers = [...sampleSellers];
    
    if (hasIndonesian) {
        filteredSellers = filteredSellers.filter(seller => 
            seller.name.toLowerCase().includes('padang') || 
            seller.name.toLowerCase().includes('warteg')
        );
    }
    
    if (hasDessert) {
        filteredSellers = filteredSellers.filter(seller => 
            seller.name.toLowerCase().includes('bakery') ||
            seller.items.some(item => item.toLowerCase().includes('cake') || 
                                    item.toLowerCase().includes('sweet'))
        );
    }
    
    if (wantsCheap) {
        // Sort by price ascending
        filteredSellers.sort((a, b) => a.basePrice - b.basePrice);
        filteredSellers = filteredSellers.slice(0, 3); // Take cheapest 3
    }
    
    return filteredSellers.slice(0, 3); // Max 3 sellers for cleaner UI
}

// Generate a seller offer
function generateSellerOffer(request, seller) {
    // Calculate price (base price ± random variation)
    const variation = Math.floor(Math.random() * 3000) - 1500; // -1500 to +1500
    const finalPrice = Math.max(seller.basePrice + variation, 10000); // Minimum 10000
    
    // Select items based on request
    const offeredItems = selectItems(seller.items, request.keywords);
    
    // Generate offer object
    const offer = {
        id: generateId(),
        requestId: request.id,
        seller: seller.name,
        price: finalPrice,
        items: offeredItems,
        deliveryTime: Math.floor(Math.random() * 30) + 15, // 15-45 minutes
        timestamp: new Date().toISOString()
    };
    
    // Save offer to Firestore
    saveOffer(offer);
    
    // Display offer
    displayOffer(offer);
}

// Select items based on keywords
function selectItems(allItems, keywords) {
    if (keywords.length === 0) {
        return [allItems[0]]; // Return first item
    }
    
    const hasDessert = keywords.some(k => k.category === 'dessert');
    const wantsSimple = keywords.some(k => k.category === 'simple');
    
    let selected = [];
    
    if (hasDessert) {
        const dessertItems = allItems.filter(item => 
            item.toLowerCase().includes('cake') ||
            item.toLowerCase().includes('sweet') ||
            item.toLowerCase().includes('donut') ||
            item.toLowerCase().includes('cookie')
        );
        if (dessertItems.length > 0) {
            selected.push(dessertItems[0]);
        }
    }
    
    // If no specific match or still need items
    if (selected.length === 0) {
        if (wantsSimple) {
            selected.push(allItems[0]); // First item is usually simplest
        } else {
            // Random selection
            const randomIndex = Math.floor(Math.random() * allItems.length);
            selected.push(allItems[randomIndex]);
        }
    }
    
    return selected;
}

// Display offer in the offers list
function displayOffer(offer) {
    const offerCard = document.createElement('div');
    offerCard.className = 'offer-card';
    offerCard.dataset.offerId = offer.id;
    
    const timeAgo = getTimeAgo(offer.timestamp);
    
    offerCard.innerHTML = `
        <div class="offer-header">
            <div class="offer-seller">
                <i class="fas fa-store"></i> ${offer.seller}
            </div>
            <div class="offer-price">
                Rp ${offer.price.toLocaleString()}
            </div>
        </div>
        <div class="offer-item">
            <strong>Offer:</strong> ${offer.items.join(', ')}
        </div>
        <div class="offer-item">
            <i class="fas fa-clock"></i> Delivery: ${offer.deliveryTime} minutes
        </div>
        <div class="offer-footer">
            <div class="offer-time">
                ${timeAgo}
            </div>
            <button class="accept-btn" onclick="acceptOffer('${offer.id}')">
                <i class="fas fa-check"></i> Accept Offer
            </button>
        </div>
    `;
    
    // Remove "no offers" message if present
    const noOffers = offersList.querySelector('.no-offers');
    if (noOffers) {
        noOffers.remove();
    }
    
    offersList.prepend(offerCard);
}

// Accept an offer
function acceptOffer(offerId) {
    const offerCard = document.querySelector(`[data-offer-id="${offerId}"]`);
    if (offerCard) {
        const acceptBtn = offerCard.querySelector('.accept-btn');
        acceptBtn.innerHTML = '<i class="fas fa-check-circle"></i> Accepted!';
        acceptBtn.style.background = '#4CAF50';
        acceptBtn.disabled = true;
        
        // Add message to chat
        addMessageToChat("Offer accepted! The seller will contact you shortly with delivery details.", 'bot');
        
        // Update all offer buttons
        document.querySelectorAll('.accept-btn').forEach(btn => {
            btn.disabled = true;
            if (btn !== acceptBtn) {
                btn.innerHTML = '<i class="fas fa-times"></i> Offer Closed';
                btn.style.background = '#ccc';
            }
        });
        
        // Save acceptance to Firestore
        saveAcceptance(offerId);
    }
}

// Clear old messages when they exceed limit
function clearOldMessages() {
    const mainMessagesContainer = document.getElementById('mainMessagesContainer');
    const messages = mainMessagesContainer.querySelectorAll('.message');
    
    if (messages.length > MAX_MESSAGES * 2) {
        const messagesToRemove = messages.length - (MAX_MESSAGES * 2);
        for (let i = 0; i < messagesToRemove; i++) {
            if (messages[i]) {
                messages[i].remove();
            }
        }
    }
}

// Firestore functions
async function saveRequest(request) {
    try {
        await db.collection('requests').doc(request.id).set(request);
    } catch (error) {
        console.error('Error saving request:', error);
    }
}

async function saveOffer(offer) {
    try {
        await db.collection('offers').doc(offer.id).set(offer);
    } catch (error) {
        console.error('Error saving offer:', error);
    }
}

async function saveAcceptance(offerId) {
    try {
        await db.collection('acceptances').doc(offerId).set({
            offerId: offerId,
            acceptedAt: new Date().toISOString(),
            status: 'confirmed'
        });
    } catch (error) {
        console.error('Error saving acceptance:', error);
    }
}

function listenForOffers() {
    db.collection('offers')
        .orderBy('timestamp', 'desc')
        .limit(10)
        .onSnapshot((snapshot) => {
            // This will trigger when new offers are added in real-time
            console.log('New offers detected in Firestore');
        });
}

// Helper functions
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function getTimeAgo(timestamp) {
    const now = new Date();
    const past = new Date(timestamp);
    const diffMs = now - past;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins === 1) return '1 minute ago';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours === 1) return '1 hour ago';
    return `${diffHours} hours ago`;
}

// Initialize the app when page loads
document.addEventListener('DOMContentLoaded', initApp);