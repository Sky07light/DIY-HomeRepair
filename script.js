// DOM elements
const loginContainer = document.getElementById('login-container');
const appContainer = document.getElementById('app-container');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const chatMessages = document.getElementById('chat-messages');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const speakBtn = document.getElementById('speak-btn');
const findLocalHelpBtn = document.getElementById('find-local-help');
const localHelpModal = document.getElementById('local-help-modal');
const closeModal = document.querySelector('.close-modal');
const quickLinks = document.querySelectorAll('.feature ul li');


const HF_API_KEY = "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";
const HF_API_URL = "https://api-inference.huggingface.co/models/facebook/blenderbot-400M-distill";

// Login functionality
loginBtn.addEventListener('click', () => {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    // Simple validation - in a real app, you'd authenticate with a backend
    if (username.trim() !== '' && password.trim() !== '') {
        loginContainer.classList.add('hidden');
        appContainer.classList.remove('hidden');
    } else {
        alert('Please enter both username and password');
    }
});

// Logout functionality
logoutBtn.addEventListener('click', () => {
    appContainer.classList.add('hidden');
    loginContainer.classList.remove('hidden');
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
});

// Send message functionality
sendBtn.addEventListener('click', sendMessage);
userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

// Quick links
quickLinks.forEach(link => {
    link.addEventListener('click', () => {
        userInput.value = link.getAttribute('data-query');
        sendMessage();
    });
});

// Local help modal
findLocalHelpBtn.addEventListener('click', () => {
    localHelpModal.classList.remove('hidden');
});

closeModal.addEventListener('click', () => {
    localHelpModal.classList.add('hidden');
});

window.addEventListener('click', (e) => {
    if (e.target === localHelpModal) {
        localHelpModal.classList.add('hidden');
    }
});

// Text-to-speech functionality
speakBtn.addEventListener('click', () => {
    // Get the last bot message
    const lastBotMessage = document.querySelector('.message.bot:last-child .message-content p');
    
    if (lastBotMessage) {
        const text = lastBotMessage.textContent;
        speakText(text);
    }
});

// Function to send a message
async function sendMessage() {
    const message = userInput.value.trim();
    
    if (message !== '') {
        // Add user message to chat
        addMessage(message, 'user');
        
        // Clear input
        userInput.value = '';
        
        // Show typing indicator
        showTypingIndicator();
        
        try {
            // First check for predefined responses
            const predefinedResponse = getPredefinedResponse(message);
            
            if (predefinedResponse) {
                // Remove typing indicator
                removeTypingIndicator();
                // Add predefined response
                addMessage(predefinedResponse, 'bot');
            } else {
                // If no predefined response, use the API
                const apiResponse = await getAIResponse(message);
                
                // Remove typing indicator
                removeTypingIndicator();
                
                // Add API response
                addMessage(apiResponse, 'bot');
            }
        } catch (error) {
            // Remove typing indicator
            removeTypingIndicator();
            
            // Add fallback response in case of API error
            addMessage("I'm having trouble connecting to my knowledge base. Here's some general advice: For plumbing issues, always turn off the water supply first. For electrical issues, turn off the circuit breaker. For complex repairs, consulting a professional is often the safest option.", 'bot');
            console.error("Error getting response:", error);
        }
    }
}

// Function to add a message to the chat
function addMessage(text, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', sender);
    
    const messageContent = document.createElement('div');
    messageContent.classList.add('message-content');
    
    const messageParagraph = document.createElement('p');
    messageParagraph.textContent = text;
    
    messageContent.appendChild(messageParagraph);
    messageDiv.appendChild(messageContent);
    chatMessages.appendChild(messageDiv);
    
    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Function to show typing indicator
function showTypingIndicator() {
    const typingDiv = document.createElement('div');
    typingDiv.classList.add('message', 'bot', 'typing-indicator');
    
    const typingContent = document.createElement('div');
    typingContent.classList.add('message-content');
    
    const typingDots = document.createElement('div');
    typingDots.classList.add('typing-dots');
    
    for (let i = 0; i < 3; i++) {
        const dot = document.createElement('span');
        typingDots.appendChild(dot);
    }
    
    typingContent.appendChild(typingDots);
    typingDiv.appendChild(typingContent);
    chatMessages.appendChild(typingDiv);
    
    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Function to remove typing indicator
function removeTypingIndicator() {
    const typingIndicator = document.querySelector('.typing-indicator');
    if (typingIndicator) {
        typingIndicator.remove();
    }
}

// Function to speak text
function speakText(text) {
    // Check if speech synthesis is available
    if ('speechSynthesis' in window) {
        const speech = new SpeechSynthesisUtterance();
        speech.text = text;
        speech.volume = 1;
        speech.rate = 1;
        speech.pitch = 1;
        
        window.speechSynthesis.speak(speech);
    } else {
        alert('Sorry, your browser does not support text-to-speech!');
    }
}

// Function to get AI response from Hugging Face API
async function getAIResponse(message) {
    try {
        // Check if the message is about a major repair
        const complexQuery = isComplexQuery(message);
        if (complexQuery) {
            return "This sounds like a complex repair that might require professional assistance. Would you like me to show you some local repair services? You can click on 'Find Local Repair Shops' to see options in your area.";
        }
        
        // Prepare the prompt with home repair context
        const prompt = `As a home repair assistant, help with this problem: ${message}`;
        
        const response = await fetch(HF_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${HF_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ inputs: prompt, options: { wait_for_model: true } })
        });
        
        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }
        
        const data = await response.json();
        
        // Process the response to make it more relevant to home repair
        let aiResponse = data[0].generated_text || "I couldn't find information about that specific repair.";
        
        // Enhance response with DIY focus
        aiResponse = enhanceResponse(aiResponse, message);
        
        return aiResponse;
    } catch (error) {
        console.error("Error calling Hugging Face API:", error);
        // Fallback to predefined responses if API fails
        const predefinedResponse = getPredefinedResponse(message);
        if (predefinedResponse) {
            return predefinedResponse;
        }
        return getFallbackResponse();
    }
}

// Helper function to enhance the AI response with DIY focus
function enhanceResponse(response, query) {
    // Add safety disclaimer for electrical or plumbing
    if (containsAny(query.toLowerCase(), ['electric', 'outlet', 'wire', 'circuit', 'breaker'])) {
        response += "\n\nSAFETY REMINDER: Always turn off power at the circuit breaker before attempting electrical repairs.";
    } else if (containsAny(query.toLowerCase(), ['pipe', 'water', 'leak', 'plumbing'])) {
        response += "\n\nTIP: Make sure to turn off the water supply before starting any plumbing repair.";
    }
    
    return response;
}

// Function to check if a query is too complex
function isComplexQuery(query) {
    const complexTerms = [
        'rewire', 'structural', 'foundation', 'load bearing', 'gas', 'hvac', 
        'furnace', 'central air', 'roof', 'major leak', 'sewer', 'mold'
    ];
    
    return containsAny(query.toLowerCase(), complexTerms);
}

// Helper function to check if a string contains any of the words in an array
function containsAny(text, wordsArray) {
    return wordsArray.some(word => text.includes(word));
}

// Function to get predefined responses for common questions
function getPredefinedResponse(message) {
    // Convert message to lowercase for easier matching
    const lowerMessage = message.toLowerCase();
    
    // Check for major keywords to determine response category
    if (containsAny(lowerMessage, ['leak', 'drip', 'faucet'])) {
        return getPlumbingResponse(lowerMessage);
    } else if (containsAny(lowerMessage, ['electric', 'outlet', 'switch', 'light', 'bulb', 'wire'])) {
        return getElectricalResponse(lowerMessage);
    } else if (containsAny(lowerMessage, ['wall', 'hole', 'drywall', 'patch', 'paint'])) {
        return getWallResponse(lowerMessage);
    } else if (containsAny(lowerMessage, ['toilet', 'clog', 'drain', 'sink', 'shower'])) {
        return getToiletResponse(lowerMessage);
    } else if (containsAny(lowerMessage, ['tool', 'hammer', 'screwdriver', 'wrench'])) {
        return getToolsResponse(lowerMessage);
    } else if (containsAny(lowerMessage, ['help', 'professional', 'plumber', 'electrician', 'contractor'])) {
        return "For this issue, I recommend consulting a professional. Check our 'Local Help' section for contact information of highly-rated repair services in your area.";
    } 
    
    // Return null if no predefined response matches
    return null;
}

// Function to get a fallback response when API fails
function getFallbackResponse() {
    const fallbacks = [
        "I'm sorry, I don't have specific information about that repair. For complex issues, consulting a professional is often the safest option.",
        "That's a bit outside my current knowledge base. Would you like to see some local repair professionals who might be able to help?",
        "I don't have enough details to provide a safe DIY solution for this. Consider checking YouTube tutorials or contacting a professional.",
        "For this type of repair, it's best to consult a repair manual specific to your equipment or reach out to a professional."
    ];
    
    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}

// Response generators for different categories
function getPlumbingResponse(message) {
    if (message.includes('faucet') || message.includes('leak')) {
        return "To fix a leaky faucet:\n1. Turn off the water supply under the sink\n2. Remove the handle by unscrewing the set screw\n3. Remove the cartridge or valve stem\n4. Replace the O-rings or washer that are worn\n5. Reassemble the faucet\n6. Turn the water back on and test";
    } else if (message.includes('drain') || message.includes('clog')) {
        return "To unclog a drain:\n1. Try using a plunger first\n2. If that doesn't work, pour boiling water down the drain\n3. Try a mixture of baking soda and vinegar (1/3 cup each)\n4. For stubborn clogs, use a drain snake tool\n5. Avoid chemical drain cleaners as they can damage pipes";
    } else {
        return "For your plumbing issue, first make sure to shut off the water supply to the affected area. Most plumbing repairs require basic tools like an adjustable wrench, pliers, and plumber's tape. What specific part seems to be causing the problem?";
    }
}

function getElectricalResponse(message) {
    if (message.includes('outlet') || message.includes('socket')) {
        return "For outlet issues:\n1. FIRST, turn off power at the circuit breaker\n2. Test with a voltage tester to ensure power is off\n3. Remove the outlet cover plate\n4. Check for loose connections\n5. Replace the outlet if necessary\n6. SAFETY FIRST: If you're unsure, please consult an electrician";
    } else if (message.includes('light') || message.includes('bulb')) {
        return "If your light fixture isn't working:\n1. Check if the bulb is burnt out\n2. Ensure the bulb is properly seated\n3. Check if other lights are working to rule out a breaker issue\n4. For replacement, turn off the switch and allow bulb to cool\n5. For persistent issues, there might be a wiring problem requiring professional help";
    } else {
        return "CAUTION: Electrical repairs can be dangerous. Always shut off power at the circuit breaker before attempting any electrical work. If you're dealing with anything beyond a simple fixture or switch replacement, I'd recommend contacting a licensed electrician.";
    }
}

function getWallResponse(message) {
    if (message.includes('hole') || message.includes('patch')) {
        return "To patch a hole in drywall:\n1. Clean the edges of the hole\n2. For small holes (< 6 inches): Apply mesh patch and joint compound\n3. For larger holes: Cut a replacement piece of drywall\n4. Apply joint compound around edges\n5. Press the patch into place\n6. Apply joint compound over seams\n7. Sand when dry and paint to match";
    } else if (message.includes('paint')) {
        return "For wall painting:\n1. Clean the walls with a mild detergent solution\n2. Fill any holes with spackling compound\n3. Sand any patched areas when dry\n4. Apply painter's tape around edges\n5. Use a primer for best results\n6. Paint with a roller for large areas and brush for edges\n7. Apply 2 coats for best coverage";
    } else {
        return "For wall repairs, you'll need to identify if it's drywall, plaster, or another material as the repair approach differs. Most wall repairs involve patching, sanding, and painting to match the existing wall. What specific wall issue are you facing?";
    }
}

function getToiletResponse(message) {
    if (message.includes('running') || message.includes('constantly')) {
        return "To fix a running toilet:\n1. Remove the tank lid\n2. Check the flapper - if it's worn, it needs replacement\n3. Adjust the float if water level is too high\n4. Ensure the fill tube is positioned correctly\n5. Check the flush handle and chain for proper operation\n6. Replace any worn parts as needed";
    } else if (message.includes('clog') || message.includes('blocked')) {
        return "For a clogged toilet:\n1. Use a plunger with a good seal around the drain\n2. Use a toilet auger for stubborn clogs\n3. Try hot water and dish soap for moderate clogs\n4. Avoid chemical drain cleaners in toilets\n5. If problems persist, there might be a deeper plumbing issue";
    } else {
        return "Toilet issues usually involve either the flushing mechanism inside the tank or a clog in the drain. Most toilet repairs can be DIY with basic tools and replacement parts from a hardware store. What specific toilet problem are you experiencing?";
    }
}

function getToolsResponse(message) {
    if (message.includes('plumbing')) {
        return "Essential plumbing tools:\n1. Adjustable wrench\n2. Pipe wrench\n3. Plunger\n4. Plumber's tape\n5. Drain snake\n6. Pipe cutter\n7. Hacksaw\n8. Basin wrench for sink fixtures\n9. Plumber's putty and caulk";
    } else if (message.includes('electric')) {
        return "Essential electrical tools:\n1. Voltage tester\n2. Wire strippers\n3. Needle-nose pliers\n4. Insulated screwdrivers\n5. Electrical tape\n6. Wire nuts\n7. Multimeter\n8. Flashlight\nREMEMBER: Always turn off power before electrical work!";
    } else {
        return "Every home toolkit should include:\n1. Hammer\n2. Screwdriver set (Phillips and flathead)\n3. Adjustable wrench\n4. Pliers\n5. Tape measure\n6. Level\n7. Utility knife\n8. Plunger\n9. Allen wrench set\n10. Voltage tester";
    }
}

// Add CSS for the typing indicator
document.addEventListener('DOMContentLoaded', () => {
    const style = document.createElement('style');
    style.textContent = `
        .typing-dots {
            display: flex;
            gap: 4px;
        }
        
        .typing-dots span {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background-color: #666;
            animation: typing 1.4s infinite ease-in-out both;
        }
        
        .typing-dots span:nth-child(1) {
            animation-delay: -0.32s;
        }
        
        .typing-dots span:nth-child(2) {
            animation-delay: -0.16s;
        }
        
        @keyframes typing {
            0%, 80%, 100% { 
                transform: scale(0);
            } 40% { 
                transform: scale(1.0);
            }
        }
    `;
    document.head.appendChild(style);
});

// Initialize the app
window.addEventListener('load', () => {
    // Start with the login screen
    loginContainer.classList.remove('hidden');
    appContainer.classList.add('hidden');
});