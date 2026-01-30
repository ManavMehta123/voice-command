import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, ShoppingCart, Trash2, Plus, Search, Sparkles, TrendingUp, Calendar, Lightbulb } from 'lucide-react';

// Simulated product database with prices and categories
const PRODUCT_DATABASE = {
  milk: { category: 'Dairy', price: 3.99, alternatives: ['almond milk', 'oat milk', 'soy milk'] },
  'almond milk': { category: 'Dairy', price: 4.49, alternatives: ['oat milk', 'soy milk'] },
  'oat milk': { category: 'Dairy', price: 4.99, alternatives: ['almond milk', 'soy milk'] },
  bread: { category: 'Bakery', price: 2.99, alternatives: ['bagels', 'tortillas'] },
  apples: { category: 'Produce', price: 1.99, alternatives: ['oranges', 'pears'], seasonal: true },
  bananas: { category: 'Produce', price: 0.99, alternatives: ['plantains'], seasonal: true },
  oranges: { category: 'Produce', price: 2.49, alternatives: ['apples', 'grapefruits'], seasonal: true },
  water: { category: 'Beverages', price: 0.99, alternatives: ['sparkling water'] },
  eggs: { category: 'Dairy', price: 4.99, alternatives: [] },
  cheese: { category: 'Dairy', price: 5.99, alternatives: ['vegan cheese'] },
  chicken: { category: 'Meat', price: 7.99, alternatives: ['tofu', 'turkey'] },
  rice: { category: 'Grains', price: 3.49, alternatives: ['quinoa', 'couscous'] },
  pasta: { category: 'Grains', price: 1.99, alternatives: ['rice noodles'] },
  toothpaste: { category: 'Personal Care', price: 3.99, alternatives: ['tooth powder'] },
  shampoo: { category: 'Personal Care', price: 6.99, alternatives: ['soap bars'] },
  chips: { category: 'Snacks', price: 3.49, alternatives: ['crackers', 'popcorn'] },
  cookies: { category: 'Snacks', price: 4.49, alternatives: ['granola bars'] },
  tomatoes: { category: 'Produce', price: 2.99, alternatives: ['cherry tomatoes'], seasonal: true },
  lettuce: { category: 'Produce', price: 1.99, alternatives: ['spinach', 'kale'], seasonal: true },
  yogurt: { category: 'Dairy', price: 4.49, alternatives: ['greek yogurt'] },
  coffee: { category: 'Beverages', price: 8.99, alternatives: ['tea'] },
};

const VoiceShoppingAssistant = () => {
  const [shoppingList, setShoppingList] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [feedback, setFeedback] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [shoppingHistory, setShoppingHistory] = useState(['milk', 'bread', 'eggs', 'apples', 'chicken']);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const recognitionRef = useRef(null);

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
        const current = event.resultIndex;
        const transcriptText = event.results[current][0].transcript;
        setTranscript(transcriptText);
        
        if (event.results[current].isFinal) {
          processVoiceCommand(transcriptText);
        }
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setFeedback(`Error: ${event.error}`);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    // Generate initial suggestions
    generateSmartSuggestions();
  }, []);

  // Generate smart suggestions based on history and seasonal items
  const generateSmartSuggestions = () => {
    const suggested = [];
    
    // Suggest items from history not in current list
    shoppingHistory.forEach(item => {
      const itemLower = item.toLowerCase();
      if (!shoppingList.find(i => i.name.toLowerCase() === itemLower)) {
        if (Math.random() > 0.5) {
          suggested.push({
            item: item,
            reason: 'frequently purchased',
            type: 'history'
          });
        }
      }
    });

    // Suggest seasonal items
    Object.entries(PRODUCT_DATABASE).forEach(([name, data]) => {
      if (data.seasonal && !shoppingList.find(i => i.name.toLowerCase() === name)) {
        if (Math.random() > 0.6) {
          suggested.push({
            item: name,
            reason: 'seasonal & fresh',
            type: 'seasonal'
          });
        }
      }
    });

    setSuggestions(suggested.slice(0, 4));
  };

  // NLP processing for voice commands
  const processVoiceCommand = (text) => {
    const lowerText = text.toLowerCase();
    
    // Extract quantity
    const quantityMatch = lowerText.match(/(\d+)\s*(bottle|bottles|can|cans|pound|pounds|lb|lbs|piece|pieces|)\s*(of\s*)?/);
    const quantity = quantityMatch ? parseInt(quantityMatch[1]) : 1;
    
    // Command patterns
    const addPatterns = [
      /(?:add|get|buy|i need|i want|purchase|grab)\s+(?:\d+\s+)?(?:bottle|bottles|can|cans|pound|pounds|lb|lbs|piece|pieces|of\s+)?(.+?)(?:\s+to\s+(?:my\s+)?list|$)/i,
      /(?:add|get|buy|i need|i want|purchase|grab)\s+(.+)/i
    ];
    
    const removePatterns = [
      /(?:remove|delete|take off|cancel)\s+(.+?)(?:\s+from\s+(?:my\s+)?list|$)/i
    ];
    
    const searchPatterns = [
      /(?:find|search|look for|show me)\s+(.+?)(?:\s+under\s+\$?(\d+))?/i
    ];

    // Check for remove command
    for (let pattern of removePatterns) {
      const match = lowerText.match(pattern);
      if (match) {
        const itemName = match[1].trim();
        removeItem(itemName);
        return;
      }
    }

    // Check for search command
    for (let pattern of searchPatterns) {
      const match = lowerText.match(pattern);
      if (match) {
        const query = match[1].trim();
        const maxPrice = match[2] ? parseFloat(match[2]) : null;
        performSearch(query, maxPrice);
        return;
      }
    }

    // Check for add command
    for (let pattern of addPatterns) {
      const match = lowerText.match(pattern);
      if (match) {
        let itemName = match[1].trim();
        // Clean up common words
        itemName = itemName.replace(/\s+(to|from|my|the|a|an)\s+list$/i, '').trim();
        addItem(itemName, quantity);
        return;
      }
    }

    setFeedback("I didn't understand that. Try 'add milk' or 'remove bread'");
  };

  // Add item to shopping list
  const addItem = (name, quantity = 1) => {
    const itemData = PRODUCT_DATABASE[name.toLowerCase()];
    const category = itemData?.category || 'Other';
    const price = itemData?.price || 0;

    const existingItem = shoppingList.find(i => i.name.toLowerCase() === name.toLowerCase());
    
    if (existingItem) {
      setShoppingList(shoppingList.map(item => 
        item.name.toLowerCase() === name.toLowerCase() 
          ? { ...item, quantity: item.quantity + quantity }
          : item
      ));
      setFeedback(`Updated ${name} quantity to ${existingItem.quantity + quantity}`);
    } else {
      setShoppingList([...shoppingList, { 
        name, 
        quantity, 
        category,
        price,
        id: Date.now()
      }]);
      setFeedback(`Added ${quantity} ${name} to your list`);
      
      // Update history
      if (!shoppingHistory.includes(name)) {
        setShoppingHistory([...shoppingHistory, name]);
      }
    }

    // Suggest alternatives if available
    if (itemData?.alternatives?.length > 0) {
      setTimeout(() => {
        const alt = itemData.alternatives[0];
        setFeedback(`Added ${name}. You might also like ${alt}!`);
      }, 2000);
    }

    generateSmartSuggestions();
  };

  // Remove item from shopping list
  const removeItem = (name) => {
    const item = shoppingList.find(i => i.name.toLowerCase().includes(name.toLowerCase()));
    if (item) {
      setShoppingList(shoppingList.filter(i => i.id !== item.id));
      setFeedback(`Removed ${item.name} from your list`);
      generateSmartSuggestions();
    } else {
      setFeedback(`${name} not found in your list`);
    }
  };

  // Perform voice-activated search
  const performSearch = (query, maxPrice = null) => {
    const results = Object.entries(PRODUCT_DATABASE)
      .filter(([name, data]) => {
        const matchesQuery = name.includes(query.toLowerCase()) || 
                            data.category.toLowerCase().includes(query.toLowerCase());
        const matchesPrice = maxPrice ? data.price <= maxPrice : true;
        return matchesQuery && matchesPrice;
      })
      .map(([name, data]) => ({ name, ...data }));
    
    setSearchResults(results);
    if (results.length > 0) {
      setFeedback(`Found ${results.length} item${results.length > 1 ? 's' : ''} matching "${query}"`);
    } else {
      setFeedback(`No items found for "${query}"`);
    }
  };

  // Toggle voice listening
  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      setTranscript('');
      setFeedback('Listening...');
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  // Group items by category
  const groupedItems = shoppingList.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {});

  const totalPrice = shoppingList.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0e27 0%, #1a1f3a 50%, #2a1f3a 100%)',
      fontFamily: '"Space Mono", monospace',
      color: '#e0e0ff',
      padding: '20px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Animated background grid */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundImage: `
          linear-gradient(rgba(0, 255, 255, 0.1) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0, 255, 255, 0.1) 1px, transparent 1px)
        `,
        backgroundSize: '50px 50px',
        animation: 'gridMove 20s linear infinite',
        pointerEvents: 'none'
      }} />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Orbitron:wght@600;900&display=swap');
        
        @keyframes gridMove {
          0% { transform: translate(0, 0); }
          100% { transform: translate(50px, 50px); }
        }
        
        @keyframes glow {
          0%, 100% { box-shadow: 0 0 20px rgba(0, 255, 255, 0.5); }
          50% { box-shadow: 0 0 30px rgba(0, 255, 255, 0.8); }
        }
        
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        
        @keyframes slideIn {
          from { transform: translateX(-20px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        
        .listening-pulse {
          animation: pulse 1s ease-in-out infinite;
        }
        
        .item-enter {
          animation: slideIn 0.3s ease-out;
        }
      `}</style>

      <div style={{ maxWidth: '1200px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1 style={{
            fontFamily: '"Orbitron", sans-serif',
            fontSize: '48px',
            fontWeight: 900,
            background: 'linear-gradient(90deg, #00ffff, #ff00ff, #00ffff)',
            backgroundSize: '200% auto',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '10px',
            textShadow: '0 0 30px rgba(0, 255, 255, 0.5)',
            letterSpacing: '2px'
          }}>
            VOICE SHOP
          </h1>
          <p style={{ 
            fontSize: '14px', 
            opacity: 0.7,
            letterSpacing: '3px',
            textTransform: 'uppercase'
          }}>
            Neural Shopping Assistant v2.1
          </p>
        </div>

        {/* Main Voice Control */}
        <div style={{
          background: 'rgba(20, 30, 60, 0.6)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(0, 255, 255, 0.3)',
          borderRadius: '20px',
          padding: '40px',
          marginBottom: '30px',
          textAlign: 'center'
        }}>
          <button
            onClick={toggleListening}
            className={isListening ? 'listening-pulse' : ''}
            style={{
              width: '120px',
              height: '120px',
              borderRadius: '50%',
              border: isListening ? '4px solid #00ffff' : '4px solid rgba(0, 255, 255, 0.3)',
              background: isListening 
                ? 'linear-gradient(135deg, #ff00ff, #00ffff)' 
                : 'rgba(30, 40, 70, 0.8)',
              color: '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              transition: 'all 0.3s ease',
              boxShadow: isListening ? '0 0 40px rgba(0, 255, 255, 0.8)' : '0 0 20px rgba(0, 255, 255, 0.2)'
            }}
          >
            {isListening ? <Mic size={48} /> : <MicOff size={48} />}
          </button>
          
          <div style={{ minHeight: '60px' }}>
            {transcript && (
              <p style={{ 
                fontSize: '18px', 
                marginBottom: '10px',
                color: '#00ffff',
                fontWeight: 'bold'
              }}>
                "{transcript}"
              </p>
            )}
            {feedback && (
              <p style={{ 
                fontSize: '14px', 
                color: '#ff00ff',
                opacity: 0.9
              }}>
                {feedback}
              </p>
            )}
          </div>

          <div style={{
            marginTop: '20px',
            padding: '15px',
            background: 'rgba(0, 255, 255, 0.05)',
            borderRadius: '10px',
            border: '1px solid rgba(0, 255, 255, 0.1)'
          }}>
            <p style={{ fontSize: '12px', opacity: 0.6, marginBottom: '5px' }}>TRY COMMANDS:</p>
            <p style={{ fontSize: '13px', opacity: 0.8 }}>
              "Add milk" • "Remove bread" • "Find apples under $3" • "I need 2 bottles of water"
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {/* Shopping List */}
          <div>
            <div style={{
              background: 'rgba(20, 30, 60, 0.6)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(0, 255, 255, 0.3)',
              borderRadius: '20px',
              padding: '25px',
              minHeight: '400px'
            }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                marginBottom: '20px',
                borderBottom: '1px solid rgba(0, 255, 255, 0.2)',
                paddingBottom: '15px'
              }}>
                <ShoppingCart size={24} style={{ marginRight: '10px', color: '#00ffff' }} />
                <h2 style={{ 
                  fontFamily: '"Orbitron", sans-serif',
                  fontSize: '20px',
                  margin: 0,
                  flex: 1
                }}>
                  ACTIVE LIST
                </h2>
                <span style={{
                  fontSize: '18px',
                  fontWeight: 'bold',
                  color: '#00ffff'
                }}>
                  ${totalPrice.toFixed(2)}
                </span>
              </div>

              {Object.keys(groupedItems).length === 0 ? (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '60px 20px',
                  opacity: 0.5
                }}>
                  <p>Your list is empty</p>
                  <p style={{ fontSize: '12px' }}>Use voice commands to add items</p>
                </div>
              ) : (
                Object.entries(groupedItems).map(([category, items]) => (
                  <div key={category} style={{ marginBottom: '20px' }}>
                    <h3 style={{
                      fontSize: '12px',
                      textTransform: 'uppercase',
                      letterSpacing: '2px',
                      color: '#ff00ff',
                      marginBottom: '10px',
                      opacity: 0.8
                    }}>
                      {category}
                    </h3>
                    {items.map((item, index) => (
                      <div
                        key={item.id}
                        className="item-enter"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px 15px',
                          background: 'rgba(0, 255, 255, 0.05)',
                          border: '1px solid rgba(0, 255, 255, 0.15)',
                          borderRadius: '10px',
                          marginBottom: '8px',
                          transition: 'all 0.2s ease',
                          animationDelay: `${index * 0.1}s`
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <span style={{ fontWeight: 'bold', color: '#e0e0ff' }}>
                            {item.name}
                          </span>
                          <span style={{ 
                            marginLeft: '10px', 
                            fontSize: '12px', 
                            opacity: 0.6 
                          }}>
                            × {item.quantity}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                          <span style={{ color: '#00ffff', fontSize: '14px' }}>
                            ${(item.price * item.quantity).toFixed(2)}
                          </span>
                          <button
                            onClick={() => removeItem(item.name)}
                            style={{
                              background: 'rgba(255, 0, 255, 0.2)',
                              border: '1px solid rgba(255, 0, 255, 0.4)',
                              borderRadius: '5px',
                              padding: '5px 8px',
                              cursor: 'pointer',
                              color: '#ff00ff',
                              transition: 'all 0.2s ease'
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Suggestions & Search */}
          <div>
            {/* Smart Suggestions */}
            <div style={{
              background: 'rgba(20, 30, 60, 0.6)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 0, 255, 0.3)',
              borderRadius: '20px',
              padding: '25px',
              marginBottom: '20px'
            }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                marginBottom: '15px' 
              }}>
                <Sparkles size={20} style={{ marginRight: '10px', color: '#ff00ff' }} />
                <h3 style={{ 
                  fontFamily: '"Orbitron", sans-serif',
                  fontSize: '16px',
                  margin: 0
                }}>
                  SMART SUGGESTIONS
                </h3>
              </div>

              {suggestions.length === 0 ? (
                <p style={{ fontSize: '12px', opacity: 0.5, textAlign: 'center', padding: '20px 0' }}>
                  No suggestions available
                </p>
              ) : (
                suggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    style={{
                      padding: '12px',
                      background: 'rgba(255, 0, 255, 0.05)',
                      border: '1px solid rgba(255, 0, 255, 0.15)',
                      borderRadius: '8px',
                      marginBottom: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '3px' }}>
                        {suggestion.item}
                      </div>
                      <div style={{ 
                        fontSize: '11px', 
                        opacity: 0.6,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px'
                      }}>
                        {suggestion.type === 'seasonal' && <Calendar size={12} />}
                        {suggestion.type === 'history' && <TrendingUp size={12} />}
                        {suggestion.reason}
                      </div>
                    </div>
                    <button
                      onClick={() => addItem(suggestion.item, 1)}
                      style={{
                        background: 'rgba(255, 0, 255, 0.3)',
                        border: '1px solid rgba(255, 0, 255, 0.5)',
                        borderRadius: '5px',
                        padding: '5px 8px',
                        cursor: 'pointer',
                        color: '#ff00ff',
                        fontSize: '12px'
                      }}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div style={{
                background: 'rgba(20, 30, 60, 0.6)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(0, 255, 255, 0.3)',
                borderRadius: '20px',
                padding: '25px'
              }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  marginBottom: '15px' 
                }}>
                  <Search size={20} style={{ marginRight: '10px', color: '#00ffff' }} />
                  <h3 style={{ 
                    fontFamily: '"Orbitron", sans-serif',
                    fontSize: '16px',
                    margin: 0
                  }}>
                    SEARCH RESULTS
                  </h3>
                </div>

                {searchResults.map((result, index) => (
                  <div
                    key={index}
                    style={{
                      padding: '12px',
                      background: 'rgba(0, 255, 255, 0.05)',
                      border: '1px solid rgba(0, 255, 255, 0.15)',
                      borderRadius: '8px',
                      marginBottom: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 'bold', fontSize: '14px' }}>
                        {result.name}
                      </div>
                      <div style={{ fontSize: '11px', opacity: 0.6 }}>
                        {result.category} • ${result.price}
                      </div>
                    </div>
                    <button
                      onClick={() => addItem(result.name, 1)}
                      style={{
                        background: 'rgba(0, 255, 255, 0.3)',
                        border: '1px solid rgba(0, 255, 255, 0.5)',
                        borderRadius: '5px',
                        padding: '5px 12px',
                        cursor: 'pointer',
                        color: '#00ffff',
                        fontSize: '12px'
                      }}
                    >
                      ADD
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoiceShoppingAssistant;