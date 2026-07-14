import React, { useState, useEffect, useRef } from 'react';
import { Product, FAQItem, Message, CartItem, Order, LogEntry } from './types';
import {
  Coffee,
  Sparkles,
  Send,
  ShoppingCart,
  RefreshCw,
  Database,
  HelpCircle,
  X,
  ChevronRight,
  ChevronLeft,
  Bean,
  Flame,
  Minus,
  Plus,
  BookOpen,
  Info,
  Clock,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ProductCard from './components/ProductCard';
import CoffeeMatchModal from './components/CoffeeMatchModal';
import CheckoutModal from './components/CheckoutModal';
import AdminLogsModal from './components/AdminLogsModal';

export default function App() {
  // Global catalog and FAQ from sheets
  const [products, setProducts] = useState<Product[]>([]);
  const [faq, setFaq] = useState<FAQItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Layout tabs for mobile
  const [activeTab, setActiveTab] = useState(1); // 0: Sections, 1: Chat, 2: Shop/Cart

  // Chat state
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'msg-welcome',
      role: 'assistant',
      content: 'Здравствуйте! Я Ваш онлайн-консультант и Кофейный Сомелье. ☕️\n\nЯ подберу для Вас идеальный свежеобжаренный сорт кофе, помогу определиться с помолом под Ваш способ заваривания, расскажу про оформление регулярной подписки или проконсультирую по доставке.\n\nПодскажите, какой способ заваривания Вы предпочитаете или какие вкусовые ноты Вам нравятся?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Cart & Orders state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Modals state
  const [isMatcherOpen, setIsMatcherOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isLogsOpen, setIsLogsOpen] = useState(false);

  // Selected FAQ item to display in left sidebar detail
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Random products selection (sidebar right)
  const [randomProducts, setRandomProducts] = useState<Product[]>([]);

  // Refs
  const chatEndRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);

  // Fetch initial catalog and FAQ from backend
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [catRes, faqRes] = await Promise.all([
          fetch('/api/catalog'),
          fetch('/api/faq')
        ]);
        if (catRes.ok && faqRes.ok) {
          const catData = await catRes.json();
          const faqData = await faqRes.json();
          setProducts(catData);
          setFaq(faqData);

          // Initially pick 3 random products for the sidebar
          pickRandomProducts(catData, 3);
        }
      } catch (error) {
        console.error("Failed to load catalog and FAQ:", error);
      } finally {
        setLoading(false);
      }
    };
    loadInitialData();
  }, []);

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Touch handlers for mobile swipe layout
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diffX = touchStartX.current - e.changedTouches[0].clientX;
    const threshold = 70; // minimum swipe width

    if (diffX > threshold) {
      // Swipe Left -> Next Tab
      setActiveTab((prev) => Math.min(prev + 1, 2));
    } else if (diffX < -threshold) {
      // Swipe Right -> Previous Tab
      setActiveTab((prev) => Math.max(prev - 1, 0));
    }
    touchStartX.current = null;
  };

  // Pick random products helper
  const pickRandomProducts = (allProducts: Product[], count: number) => {
    if (!allProducts || allProducts.length === 0) return;
    const shuffled = [...allProducts].sort(() => 0.5 - Math.random());
    setRandomProducts(shuffled.slice(0, count));
  };

  const handleShuffleProducts = () => {
    pickRandomProducts(products, 3);
  };

  // Add to Cart
  const handleAddToCart = (item: Omit<CartItem, 'id'>) => {
    // Generate a unique ID based on product + grind + weight
    const cartItemId = `${item.product.id}-${item.grind}-${item.weight}`;
    
    setCart((prevCart) => {
      const existing = prevCart.find(i => i.id === cartItemId);
      if (existing) {
        return prevCart.map(i => i.id === cartItemId ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prevCart, { ...item, id: cartItemId }];
    });

    setIsCartOpen(true);
  };

  const handleUpdateQty = (itemId: string, delta: number) => {
    setCart((prevCart) => {
      return prevCart
        .map(item => {
          if (item.id === itemId) {
            const nextQty = item.quantity + delta;
            return nextQty > 0 ? { ...item, quantity: nextQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  // Send message to AI Sommelier
  const handleSendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    // Add user message
    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    // Keep only last 8 messages for context to keep API fast and economical
    const chatHistory = messages.slice(-8);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: chatHistory,
          query: trimmed
        })
      });

      if (res.ok) {
        const data = await res.json() as { response: string, suggestedProducts: Product[] };
        
        const aiMsg: Message = {
          id: `msg-${Date.now() + 1}`,
          role: 'assistant',
          content: data.response,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          suggestedProducts: data.suggestedProducts
        };

        setMessages(prev => [...prev, aiMsg]);
      } else {
        throw new Error("Chat request failed");
      }
    } catch (error) {
      console.error(error);
      const errMsg: Message = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: 'Прошу прощения, временно не удалось соединиться с сервером обжарки. Давайте я предложу Вам наш фирменный Бленд Эспрессо [C005] — это сбалансированная смесь средней обжарки с нотами карамели и темного шоколада, идеальная для рожковой кофеварки!',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedProducts: products.filter(p => p.id === 'C005')
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  // Quick Action FAQ Click
  const handleFAQClick = (faqItem: FAQItem) => {
    // Fill chat with query and send
    handleSendMessage(faqItem.question);
    
    // Switch to Chat tab on mobile
    setActiveTab(1);
  };

  // Order success confirmation callback
  const handleOrderSuccess = (order: Order) => {
    // Clear cart
    setCart([]);
    setIsCartOpen(false);

    // AI thanks the user for the order
    const thankYouMsg: Message = {
      id: `msg-order-${order.id}`,
      role: 'assistant',
      content: `Благодарю Вас за оформление заказа, ${order.customerName}! 🎉\n\nВаш заказ №${order.id} на сумму ${order.totalAmount} ₽ успешно оплачен.\n\nМы приступим к упаковке и обжарке свежих зёрен прямо сейчас. Вы получите СМС с кодом отслеживания посылки на указанный номер телефона (${order.phone}).\n\nПриятного Вам кофепития! Есть ли у Вас ещё какие-либо вопросы?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages(prev => [...prev, thankYouMsg]);
    
    // Switch to chat tab
    setActiveTab(1);
  };

  // Get unique categories for FAQ
  const faqCategories = Array.from(new Set(faq.map(item => item.category)));

  // Cart math
  const cartTotalAmount = cart.reduce((acc, item) => {
    const getMultiplier = (w: string) => {
      if (w === '500г') return 1.8;
      if (w === '1кг') return 3.2;
      return 1.0;
    };
    return acc + Math.round(item.product.price * getMultiplier(item.weight)) * item.quantity;
  }, 0);

  const cartTotalItemsCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <div className="h-screen overflow-hidden flex flex-col bg-[#F5F2ED] font-sans text-natural-text" id="main-applet-root">
      {/* Top Navbar */}
      <header className="bg-natural-dark text-natural-bg px-5 py-3.5 flex items-center justify-between border-b border-natural-text/10 select-none shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="bg-natural-accent p-1.5 rounded-xl border border-white/10">
            <Coffee className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="font-serif font-bold text-sm sm:text-base tracking-wide uppercase leading-tight text-white">Кофейный Сомелье</h1>
            <span className="text-[10px] text-natural-sand block font-bold">Лаборатория свежей обжарки зёрен</span>
          </div>
        </div>

        {/* Desktop Controls in header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMatcherOpen(true)}
            className="hidden sm:flex items-center gap-1.5 bg-natural-accent hover:bg-natural-accent/80 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all"
            id="open-matcher-nav-btn"
          >
            <Sparkles className="w-3.5 h-3.5 text-natural-sand" />
            <span>Подобрать сорт</span>
          </button>

          {/* Cart summary trigger */}
          <button
            onClick={() => setIsCartOpen(!isCartOpen)}
            className="flex items-center gap-1.5 bg-natural-sand text-natural-dark hover:bg-natural-sand/80 px-3 py-1.5 rounded-xl text-xs font-extrabold cursor-pointer transition-colors relative"
            id="cart-summary-trigger"
          >
            <ShoppingCart className="w-4 h-4" />
            <span className="hidden sm:inline">Корзина</span>
            {cartTotalItemsCount > 0 && (
              <span className="bg-natural-accent text-white w-5 h-5 rounded-full flex items-center justify-center font-sans font-black text-[9px] absolute -top-1.5 -right-1.5 border border-natural-dark">
                {cartTotalItemsCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Mobile Tab Headers */}
      <div className="flex sm:hidden bg-natural-dark text-natural-bg/75 text-xs font-bold border-b border-natural-dark/20 select-none shrink-0">
        <button
          onClick={() => setActiveTab(0)}
          className={`flex-1 text-center py-3 flex items-center justify-center gap-1.5 ${activeTab === 0 ? 'bg-natural-accent text-white border-b-2 border-b-natural-accent' : ''}`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Разделы</span>
        </button>
        <button
          onClick={() => setActiveTab(1)}
          className={`flex-1 text-center py-3 flex items-center justify-center gap-1.5 ${activeTab === 1 ? 'bg-natural-accent text-white border-b-2 border-b-natural-accent' : ''}`}
        >
          <Coffee className="w-3.5 h-3.5" />
          <span>Диалог</span>
        </button>
        <button
          onClick={() => setActiveTab(2)}
          className={`flex-1 text-center py-3 flex items-center justify-center gap-1.5 ${activeTab === 2 ? 'bg-natural-accent text-white border-b-2 border-b-natural-accent' : ''}`}
        >
          <ShoppingCart className="w-3.5 h-3.5" />
          <span>Магазин</span>
        </button>
      </div>

      {/* Loading Overlay */}
      {loading ? (
        <div className="flex-grow flex flex-col items-center justify-center bg-[#F5F2ED] text-natural-text gap-3">
          <span className="w-8 h-8 border-4 border-natural-dark border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-bold font-serif">Синхронизация кофейной базы данных...</p>
        </div>
      ) : (
        /* Main Workspace Container */
        <div
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className="flex-grow flex relative h-full overflow-hidden"
        >
          {/* COLUMN 1: LEFT SIDEBAR - FAQ CATEGORIES / QUICK ACTIONS */}
          <aside
            className={`absolute md:relative inset-0 md:inset-auto z-10 md:z-0 w-full md:w-[22%] bg-[#F5F2ED] border-r border-natural-text/10 flex flex-col h-full transform transition-transform duration-300 ${
              activeTab === 0 ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
            }`}
          >
            {/* Header section in sidebar */}
            <div className="p-4 border-b border-natural-text/10 shrink-0">
              <span className="text-[10px] text-natural-text/40 font-bold uppercase tracking-wider block mb-1">База знаний</span>
              <h2 className="font-serif font-bold text-natural-text text-sm flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-natural-accent" />
                <span>Разделы и Инструкции</span>
              </h2>
            </div>

            {/* List of categories */}
            <div className="flex-grow overflow-y-auto p-3 space-y-3.5 select-none">
              <div className="space-y-1">
                <span className="text-[9px] text-natural-text/40 font-bold uppercase tracking-wider block px-2.5 mb-1.5">Категории ответов</span>
                {faqCategories.length > 0 ? (
                  faqCategories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                      className={`w-full text-left py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                        selectedCategory === cat
                          ? 'bg-natural-dark text-[#F5F2ED]'
                          : 'bg-natural-sand/40 hover:bg-natural-sand/65 text-natural-text'
                      }`}
                    >
                      <span>{cat}</span>
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${selectedCategory === cat ? 'rotate-180' : ''}`} />
                    </button>
                  ))
                ) : (
                  <p className="text-natural-text/40 text-xs px-2.5">Загрузка категорий...</p>
                )}
              </div>

              {/* Sub-questions of selected category */}
              <AnimatePresence>
                {selectedCategory && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden bg-natural-sand/20 border border-natural-accent/15 rounded-2xl p-2.5 space-y-1.5"
                  >
                    <span className="text-[9px] text-natural-dark font-bold uppercase block px-1 mb-1">Быстрые вопросы о {selectedCategory}:</span>
                    {faq
                      .filter(item => item.category === selectedCategory)
                      .map((item, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleFAQClick(item)}
                          className="w-full text-left bg-white border border-natural-text/5 hover:border-natural-accent p-2 rounded-xl text-[11px] font-bold text-natural-text/80 hover:text-natural-dark shadow-sm leading-snug cursor-pointer flex justify-between items-center group"
                        >
                          <span className="truncate pr-1">{item.question}</span>
                          <ChevronRight className="w-3.5 h-3.5 text-natural-text/40 group-hover:text-natural-accent transition-colors shrink-0" />
                        </button>
                      ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* General guides quick launch */}
              <hr className="border-natural-text/10" />
              
              <div className="space-y-1.5">
                <span className="text-[9px] text-natural-text/40 font-bold uppercase tracking-wider block px-2.5 mb-1.5">Интерактивный Сомелье</span>
                
                <button
                  onClick={() => setIsMatcherOpen(true)}
                  className="w-full bg-gradient-to-tr from-natural-dark to-natural-accent text-white p-4 rounded-2xl text-left border border-natural-dark/20 flex justify-between items-center cursor-pointer shadow-md group hover:brightness-110 transition-all"
                  id="open-matcher-left-sidebar"
                >
                  <div className="space-y-0.5">
                    <span className="font-serif font-bold text-xs block flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-natural-sand animate-bounce" />
                      <span>Мастер подбора кофе</span>
                    </span>
                    <span className="text-[10px] text-natural-sand/85 block font-medium">Пройти опрос и найти свой вкус</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-white/80 group-hover:translate-x-0.5 transition-transform" />
                </button>

                {/* Info panels */}
                <div className="bg-white border border-natural-text/10 rounded-2xl p-3.5 text-[11px] leading-relaxed text-natural-text/70">
                  <div className="flex gap-2 items-start mb-1.5 text-natural-dark font-bold text-xs">
                    <Info className="w-4 h-4 text-natural-accent shrink-0 mt-0.5" />
                    <span>Умная рекомендация</span>
                  </div>
                  В диалоге с Сомелье Вы можете указать предпочитаемый способ заваривания. Сорта кофе из каталога будут автоматически подтягиваться и рекомендоваться.
                </div>
              </div>
            </div>

            {/* Bottom info banner */}
            <div className="p-3 border-t border-natural-text/10 bg-natural-sand/20 flex items-center gap-2 text-[11px] text-natural-text/50 shrink-0">
              <Clock className="w-4 h-4 text-natural-text/40 shrink-0" />
              <span>Хранение зёрен: до 3-х месяцев.</span>
            </div>
          </aside>

          {/* COLUMN 2: MIDDLE - CHAT WITH COFFEE SOMMELIER */}
          <main
            className={`absolute md:relative inset-0 md:inset-auto z-0 w-full md:w-[48%] bg-white border-r border-natural-text/10 flex flex-col h-full transform transition-transform duration-300 ${
              activeTab === 1 ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
            }`}
          >
            {/* Sommelier Header / Status */}
            <div className="px-5 py-3 border-b border-natural-text/10 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 bg-natural-sand/30 rounded-full border border-natural-text/10 flex items-center justify-center shadow-inner">
                  <Coffee className="w-4 h-4 text-natural-accent" />
                </div>
                <div>
                  <h2 className="font-serif font-bold text-natural-text text-sm">Бариста-Сомелье</h2>
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                    <span className="text-[10px] text-natural-text/50 font-medium">Консультирует Вас в реальном времени</span>
                  </div>
                </div>
              </div>

              {/* Tiny tips */}
              <div className="bg-natural-sand/20 border border-natural-text/10 rounded-lg py-1 px-2.5 text-[10px] text-natural-text/60 font-medium">
                Язык: Русский
              </div>
            </div>

            {/* Chat Screen Output Viewport */}
            <div className="flex-grow overflow-y-auto p-5 space-y-4 bg-[#F5F2ED]/60" id="chat-messages-container">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 max-w-[85%] ${
                    msg.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
                  }`}
                >
                  {/* Sender Avatar */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border select-none text-[10px] ${
                    msg.role === 'user'
                      ? 'bg-natural-sand border-natural-sand/50 text-natural-dark font-bold'
                      : 'bg-natural-dark border-natural-dark text-[#F5F2ED] font-bold'
                  }`}>
                    {msg.role === 'user' ? 'Вы' : 'БС'}
                  </div>

                  {/* Message Bubble */}
                  <div className="space-y-3">
                    <div className={`p-4 rounded-2xl shadow-sm text-xs leading-relaxed whitespace-pre-wrap ${
                      msg.role === 'user'
                        ? 'bg-natural-dark text-[#F5F2ED] rounded-tr-none'
                        : 'bg-white border border-natural-text/10 text-natural-text rounded-tl-none'
                    }`}>
                      {msg.content}
                      <span className={`block text-[9px] mt-2 text-right ${
                        msg.role === 'user' ? 'text-[#F5F2ED]/60' : 'text-natural-text/40'
                      }`}>
                        {msg.timestamp}
                      </span>
                    </div>

                    {/* Grounding Suggested Interactive Product Cards inside messages */}
                    {msg.suggestedProducts && msg.suggestedProducts.length > 0 && (
                      <div className="grid grid-cols-1 gap-2 mt-2 w-full max-w-sm">
                        {msg.suggestedProducts.map((p) => (
                          <div
                            key={p.id}
                            className="bg-white border border-natural-text/10 rounded-xl p-3 shadow-sm hover:border-natural-accent transition-colors flex items-center gap-3.5"
                          >
                            <img src={p.image} alt={p.name} className="w-12 h-12 rounded-lg object-cover shrink-0" referrerPolicy="no-referrer" />
                            <div className="flex-grow min-w-0">
                              <h4 className="font-bold text-natural-text text-[11px] truncate leading-tight">{p.name}</h4>
                              <p className="text-[10px] text-natural-text/60 line-clamp-1 leading-tight">{p.description}</p>
                              <p className="text-[10px] font-extrabold text-natural-accent mt-1">{p.price} ₽</p>
                            </div>
                            <button
                              onClick={() => {
                                handleAddToCart({
                                  product: p,
                                  quantity: 1,
                                  grind: 'В зёрнах',
                                  weight: '250г'
                                });
                              }}
                              className="bg-natural-dark hover:bg-natural-accent text-[#F5F2ED] text-[10px] font-bold py-1.5 px-2.5 rounded-lg shrink-0 shadow-sm cursor-pointer transition-colors"
                            >
                              Купить
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="flex gap-3 max-w-[85%] mr-auto">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 border bg-natural-dark border-natural-dark text-[#F5F2ED] font-bold select-none text-[10px]">
                    БС
                  </div>
                  <div className="bg-white border border-natural-text/10 p-4 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-natural-text/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-natural-text/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-natural-text/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Quick Prompts Options */}
            <div className="px-5 pt-3.5 pb-2.5 border-t border-natural-text/10 bg-[#F5F2ED] shrink-0 overflow-x-auto whitespace-nowrap flex gap-2 select-none">
              {[
                "Какая обжарка лучше?",
                "Как оформить подписку?",
                "Помол под воронку",
                "Мягкий кофе без кислотности",
                "Способы доставки"
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => handleSendMessage(suggestion)}
                  className="bg-white border border-natural-text/10 hover:border-natural-accent text-natural-text/80 hover:text-natural-dark text-[10px] font-bold py-1.5 px-3 rounded-full transition-colors cursor-pointer shrink-0 shadow-sm"
                >
                  {suggestion}
                </button>
              ))}
            </div>

            {/* Input Bar */}
            <div className="p-4 bg-white border-t border-natural-text/10 shrink-0">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage(inputText);
                }}
                className="flex items-center gap-2"
              >
                <input
                  required
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Задайте вопрос о кофе, помоле, обжарке или подписке..."
                  className="flex-grow bg-natural-sand/20 border border-natural-text/15 rounded-xl px-4 py-3 text-xs text-natural-text placeholder-natural-text/40 focus:outline-none focus:border-natural-accent focus:bg-white"
                  id="chat-input-field"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim() || isTyping}
                  className="bg-natural-dark hover:bg-natural-accent disabled:opacity-50 text-[#F5F2ED] p-3 rounded-xl cursor-pointer transition-colors shrink-0 shadow-sm flex items-center justify-center"
                  id="send-message-btn"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </main>

          {/* COLUMN 3: RIGHT SIDEBAR - RANDOM CATALOG PRODUCTS / SHOPPING CART */}
          <aside
            className={`absolute md:relative inset-0 md:inset-auto z-10 md:z-0 w-full md:w-[30%] bg-[#F5F2ED] border-l border-natural-text/10 flex flex-col h-full transform transition-transform duration-300 ${
              activeTab === 2 ? 'translate-x-0' : 'translate-x-full md:translate-x-0'
            }`}
          >
            {/* Products catalog sidebar title */}
            <div className="p-4 border-b border-natural-text/10 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-1.5">
                <Bean className="w-4 h-4 text-natural-accent" />
                <h2 className="font-serif font-bold text-natural-text text-sm">Каталог товаров</h2>
              </div>
              <button
                onClick={handleShuffleProducts}
                className="text-natural-text/40 hover:text-natural-accent p-1.5 rounded-lg hover:bg-natural-sand/30 transition-colors cursor-pointer"
                title="Перемешать товары"
                id="shuffle-products-btn"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Random Products Showcase */}
            <div className="flex-grow overflow-y-auto p-4 space-y-4">
              <span className="text-[10px] text-natural-text/40 font-bold uppercase tracking-wider block mb-1">Рекомендованные предложения</span>
              {randomProducts.length > 0 ? (
                randomProducts.map((p) => (
                  <ProductCard key={p.id} product={p} onAddToCart={handleAddToCart} />
                ))
              ) : (
                <p className="text-natural-text/40 text-xs py-8 text-center">Загрузка каталога...</p>
              )}
            </div>

            {/* Persisted Collapsible/Persistent Cart Widget at Bottom */}
            <div className="bg-white border-t border-natural-text/10 p-4 shrink-0 shadow-lg">
              <div className="flex items-center justify-between mb-3 cursor-pointer select-none" onClick={() => setIsCartOpen(!isCartOpen)}>
                <div className="flex items-center gap-2">
                  <div className="bg-natural-sand/50 text-natural-dark p-2 rounded-xl">
                    <ShoppingCart className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-xs text-natural-text block">Ваша корзина</span>
                    <span className="text-[10px] text-natural-text/40 block">{cartTotalItemsCount} товаров</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs font-bold text-natural-dark bg-natural-sand/30 hover:bg-natural-sand/60 py-1 px-2.5 rounded-lg transition-colors">
                  <span>{cartTotalAmount} ₽</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${isCartOpen ? 'rotate-180' : ''}`} />
                </div>
              </div>

              {/* Cart Drawer List */}
              <AnimatePresence>
                {isCartOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden mb-3 border-b border-natural-text/10 pb-3 max-h-[160px] overflow-y-auto space-y-2 font-sans"
                  >
                    {cart.length > 0 ? (
                      cart.map((item) => {
                        const basePrice = item.product.price;
                        const getWeightMult = (w: string) => {
                          if (w === '500г') return 1.8;
                          if (w === '1кг') return 3.2;
                          return 1.0;
                        };
                        const finalItemPrice = Math.round(basePrice * getWeightMult(item.weight));
                        
                        return (
                          <div key={item.id} className="flex justify-between items-center text-xs p-2 bg-[#F5F2ED] border border-natural-text/5 rounded-xl">
                            <div className="min-w-0 pr-2">
                              <span className="font-bold text-natural-text block truncate">{item.product.name}</span>
                              <span className="text-[9px] text-natural-text/40 block leading-tight">({item.grind}, {item.weight})</span>
                              <span className="text-[10px] font-bold text-natural-accent">{finalItemPrice} ₽</span>
                            </div>
                            
                            {/* Qty controller */}
                            <div className="flex items-center gap-2 shrink-0 bg-white border border-natural-text/10 rounded-lg p-1">
                              <button
                                onClick={() => handleUpdateQty(item.id, -1)}
                                className="text-natural-text/50 hover:text-natural-accent p-0.5 rounded cursor-pointer"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="font-bold font-sans text-[11px] min-w-[12px] text-center text-natural-text">{item.quantity}</span>
                              <button
                                onClick={() => handleUpdateQty(item.id, 1)}
                                className="text-natural-text/50 hover:text-natural-accent p-0.5 rounded cursor-pointer"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-6 text-natural-text/40 text-xs">Корзина пуста</div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Checkout CTA */}
              <button
                disabled={cart.length === 0}
                onClick={() => setIsCheckoutOpen(true)}
                className="w-full bg-natural-dark hover:bg-natural-accent disabled:opacity-50 text-[#F5F2ED] font-bold py-3.5 rounded-xl text-xs text-center shadow-md cursor-pointer transition-all hover:shadow-lg"
                id="checkout-cta-btn"
              >
                Оформить заказ ({cartTotalAmount} ₽)
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* MODALS */}
      <AnimatePresence>
        {/* Coffee match quiz modal */}
        {isMatcherOpen && (
          <CoffeeMatchModal
            products={products}
            onClose={() => setIsMatcherOpen(false)}
            onSelectProduct={(p) => {
              // Trigger chat query about matched product and display
              handleSendMessage(`Расскажи подробнее про сорт кофе ${p.name}`);
              // Switch to Chat tab on mobile
              setActiveTab(1);
            }}
          />
        )}

        {/* Checkout Modal */}
        {isCheckoutOpen && (
          <CheckoutModal
            cartItems={cart}
            totalAmount={cartTotalAmount}
            onClose={() => setIsCheckoutOpen(false)}
            onOrderSuccess={handleOrderSuccess}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
