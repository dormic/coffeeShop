import React, { useState, useEffect } from 'react';
import { CartItem, Order } from '../types';
import { X, MapPin, Truck, Calendar, CreditCard, QrCode, CheckCircle2, ShoppingBag, Receipt, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CheckoutModalProps {
  cartItems: CartItem[];
  totalAmount: number;
  onClose: () => void;
  onOrderSuccess: (order: Order) => void;
}

export default function CheckoutModal({ cartItems, totalAmount, onClose, onOrderSuccess }: CheckoutModalProps) {
  const [step, setStep] = useState(1); // 1: Delivery, 2: Payment method, 3: Active Payment, 4: Receipt
  
  // Delivery details
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState('Курьерская доставка');
  const [frequency, setFrequency] = useState('Раз в 2 недели'); // Only if subscription type in cart
  
  // Payment details
  const [paymentMethod, setPaymentMethod] = useState('SBP'); // 'SBP' or 'CARD'
  
  // Card details
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCVV, setCardCVV] = useState('');
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  
  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderId, setOrderId] = useState('');
  const [finalOrder, setFinalOrder] = useState<Order | null>(null);

  // Check if cart contains any subscription products
  const hasSubscription = cartItems.some(item => item.product.type === 'Подписка' || item.frequency);

  useEffect(() => {
    // Generate a secure random order ID
    const randomId = 'COF-' + Math.floor(Math.random() * 900000 + 100000);
    setOrderId(randomId);
  }, []);

  const handleDeliverySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !phone || !email || (deliveryMethod !== 'Самовывоз' && !address)) {
      alert('Пожалуйста, заполните все обязательные поля!');
      return;
    }
    setStep(2);
  };

  const startPayment = () => {
    setStep(3);
    setIsProcessing(true);

    if (paymentMethod === 'SBP') {
      // SBP auto confirmation after 4 seconds
      setTimeout(() => {
        completeOrder();
      }, 4000);
    }
  };

  const handleCardPaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (cardNumber.length < 16 || !cardName || cardExpiry.length < 4 || cardCVV.length < 3) {
      alert('Пожалуйста, введите корректные данные карты!');
      return;
    }
    setIsProcessing(true);
    setTimeout(() => {
      completeOrder();
    }, 3000);
  };

  const completeOrder = async () => {
    const order: Order = {
      id: orderId,
      customerName,
      phone,
      email,
      address: deliveryMethod === 'Самовывоз' ? 'Пункт выдачи: ул. Кофейная, д. 42' : address,
      items: cartItems,
      totalAmount,
      status: 'paid',
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      deliveryMethod: hasSubscription ? `${deliveryMethod} (Подписка: ${frequency})` : deliveryMethod,
      paymentMethod: paymentMethod === 'SBP' ? 'СБП (Быстрый платеж)' : 'Банковская карта'
    };

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ order })
      });
      if (res.ok) {
        console.log("Order logged successfully!");
      }
    } catch (error) {
      console.error("Failed to log order on backend:", error);
    }

    setFinalOrder(order);
    setIsProcessing(false);
    setStep(4);
  };

  const finishCheckout = () => {
    if (finalOrder) {
      onOrderSuccess(finalOrder);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="bg-[#F5F2ED] rounded-3xl shadow-xl border border-natural-text/10 max-w-xl w-full overflow-hidden flex flex-col my-8"
        id="checkout-modal"
      >
        {/* Header */}
        <div className="bg-natural-dark p-5 text-natural-bg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-amber-400" />
            <span className="font-serif font-bold text-lg">Оформление и оплата заказа</span>
          </div>
          {step < 4 && (
            <button onClick={onClose} className="text-natural-bg/80 hover:text-white transition-colors cursor-pointer" id="close-checkout-btn">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Steps indicator */}
        {step < 4 && (
          <div className="flex bg-natural-sand/50 border-b border-natural-text/10 text-xs text-natural-text/60 font-bold select-none">
            <div className={`flex-1 text-center py-3 border-r border-natural-text/10 flex items-center justify-center gap-1.5 ${step === 1 ? 'bg-[#F5F2ED] text-natural-text border-b-2 border-b-natural-accent' : ''}`}>
              <Truck className="w-4 h-4 shrink-0 text-natural-accent" />
              <span className="hidden sm:inline">Доставка</span>
            </div>
            <div className={`flex-1 text-center py-3 border-r border-natural-text/10 flex items-center justify-center gap-1.5 ${step === 2 ? 'bg-[#F5F2ED] text-natural-text border-b-2 border-b-natural-accent' : ''}`}>
              <CreditCard className="w-4 h-4 shrink-0 text-natural-accent" />
              <span className="hidden sm:inline">Оплата</span>
            </div>
            <div className={`flex-1 text-center py-3 flex items-center justify-center gap-1.5 ${step === 3 ? 'bg-[#F5F2ED] text-natural-text border-b-2 border-b-natural-accent' : ''}`}>
              <QrCode className="w-4 h-4 shrink-0 text-natural-accent" />
              <span className="hidden sm:inline">Транзакция</span>
            </div>
          </div>
        )}

        {/* Form Body */}
        <div className="p-6 overflow-y-auto max-h-[70vh] flex-grow">
          <AnimatePresence mode="wait">
            {/* Step 1: Delivery Details */}
            {step === 1 && (
              <motion.form
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onSubmit={handleDeliverySubmit}
                className="space-y-4"
              >
                <div>
                  <h4 className="font-serif text-natural-text font-bold text-sm mb-3">Контактные данные покупателя</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-natural-text/50 font-bold mb-1 uppercase">ФИО *</label>
                      <input
                        required
                        type="text"
                        value={customerName}
                        onChange={e => setCustomerName(e.target.value)}
                        placeholder="Иван Иванов"
                        className="w-full bg-white border border-natural-text/15 rounded-xl px-3.5 py-2.5 text-natural-text text-sm focus:outline-none focus:border-natural-accent focus:bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-natural-text/50 font-bold mb-1 uppercase">Телефон *</label>
                      <input
                        required
                        type="tel"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        placeholder="+7 (999) 123-4567"
                        className="w-full bg-white border border-natural-text/15 rounded-xl px-3.5 py-2.5 text-natural-text text-sm focus:outline-none focus:border-natural-accent focus:bg-white"
                      />
                    </div>
                  </div>
                  <div className="mt-3">
                    <label className="block text-[11px] text-natural-text/50 font-bold mb-1 uppercase">Электронная почта *</label>
                    <input
                      required
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="ivan@example.ru"
                      className="w-full bg-white border border-natural-text/15 rounded-xl px-3.5 py-2.5 text-natural-text text-sm focus:outline-none focus:border-natural-accent focus:bg-white"
                    />
                  </div>
                </div>

                <hr className="border-natural-text/10" />

                <div>
                  <h4 className="font-serif text-natural-text font-bold text-sm mb-3">Способ и адрес доставки</h4>
                  <div className="grid grid-cols-3 gap-2.5 mb-3">
                    {[
                      { name: "Курьерская доставка", desc: "До двери" },
                      { name: "СДЭК / Боксберри", desc: "В пункт выдачи" },
                      { name: "Самовывоз", desc: "Из кофейни" }
                    ].map(opt => (
                      <button
                        key={opt.name}
                        type="button"
                        onClick={() => setDeliveryMethod(opt.name)}
                        className={`border rounded-xl p-2.5 text-center transition-colors cursor-pointer flex flex-col justify-center items-center ${
                          deliveryMethod === opt.name
                            ? 'bg-natural-dark text-natural-bg border-natural-dark'
                            : 'bg-white text-natural-text border-natural-text/10 hover:bg-natural-sand/30'
                        }`}
                      >
                        <span className="font-bold text-xs leading-tight">{opt.name}</span>
                        <span className={`text-[9px] mt-0.5 ${deliveryMethod === opt.name ? 'text-natural-bg/70' : 'text-natural-text/40'}`}>{opt.desc}</span>
                      </button>
                    ))}
                  </div>

                  {deliveryMethod !== 'Самовывоз' ? (
                    <div>
                      <label className="block text-[11px] text-natural-text/50 font-bold mb-1 uppercase">Адрес доставки *</label>
                      <input
                        required
                        type="text"
                        value={address}
                        onChange={e => setAddress(e.target.value)}
                        placeholder="г. Москва, ул. Арбат, д. 10, кв. 5"
                        className="w-full bg-white border border-natural-text/15 rounded-xl px-3.5 py-2.5 text-natural-text text-sm focus:outline-none focus:border-natural-accent focus:bg-white"
                      />
                    </div>
                  ) : (
                    <div className="bg-white border border-natural-accent/20 rounded-xl p-3 text-natural-text text-xs flex gap-2 items-start">
                      <MapPin className="w-4 h-4 text-natural-accent shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold font-serif text-natural-dark">Самовывоз из нашей обжарочной</p>
                        <p className="text-natural-text/75 mt-0.5">Адрес: ул. Кофейная, д. 42. Будни с 10:00 до 20:00. Мы приготовим Ваш заказ в течение 2 часов.</p>
                      </div>
                    </div>
                  )}
                </div>

                {hasSubscription && (
                  <>
                    <hr className="border-natural-text/10" />
                    <div>
                      <h4 className="font-serif text-natural-dark font-bold text-sm mb-3 flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-natural-accent" />
                        <span>Настройки регулярной подписки</span>
                      </h4>
                      <p className="text-natural-text/70 text-xs mb-3">В Вашей корзине содержатся товары по подписке. Выберите частоту регулярной доставки свежеобжаренного кофе:</p>
                      <div className="grid grid-cols-3 gap-2.5">
                        {["Раз в 2 недели", "Раз в 3 недели", "Раз в 4 недели"].map(freq => (
                          <button
                            key={freq}
                            type="button"
                            onClick={() => setFrequency(freq)}
                            className={`border rounded-xl py-2 px-1 text-center transition-colors cursor-pointer text-xs font-bold ${
                              frequency === freq
                                ? 'bg-natural-accent text-white border-natural-accent'
                                : 'bg-white text-natural-text border-natural-text/10 hover:bg-natural-sand/30'
                            }`}
                          >
                            {freq}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                <div className="pt-4 flex items-center justify-between border-t border-natural-text/10">
                  <div className="text-left">
                    <span className="text-natural-text/40 text-xs font-medium">К оплате:</span>
                    <p className="text-natural-text font-serif font-bold text-xl">{totalAmount} ₽</p>
                  </div>
                  <button
                    type="submit"
                    className="bg-natural-dark hover:bg-natural-accent text-natural-bg py-3 px-6 rounded-xl font-bold text-sm shadow-sm flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <span>Продолжить</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.form>
            )}

            {/* Step 2: Payment Method Select */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-5"
              >
                <div>
                  <h4 className="font-serif text-natural-text font-bold text-sm mb-3">Выберите удобный способ оплаты</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* SBP Pay */}
                    <button
                      onClick={() => setPaymentMethod('SBP')}
                      className={`border rounded-2xl p-4 text-left transition-all flex items-start gap-3.5 cursor-pointer ${
                        paymentMethod === 'SBP'
                          ? 'bg-white border-natural-accent shadow-sm'
                          : 'bg-white/50 border-natural-text/10 hover:bg-natural-sand/30'
                      }`}
                    >
                      <div className="bg-natural-dark text-natural-bg p-2.5 rounded-xl shrink-0 shadow-sm">
                        <QrCode className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="font-bold text-sm text-natural-text block">Быстрая оплата СБП</span>
                        <span className="text-natural-text/60 text-xs mt-0.5 block leading-tight">Оплата по QR-коду со смартфона. Мгновенное подтверждение.</span>
                      </div>
                    </button>

                    {/* Credit Card */}
                    <button
                      onClick={() => setPaymentMethod('CARD')}
                      className={`border rounded-2xl p-4 text-left transition-all flex items-start gap-3.5 cursor-pointer ${
                        paymentMethod === 'CARD'
                          ? 'bg-white border-natural-accent shadow-sm'
                          : 'bg-white/50 border-natural-text/10 hover:bg-natural-sand/30'
                      }`}
                    >
                      <div className="bg-natural-dark text-natural-bg p-2.5 rounded-xl shrink-0 shadow-sm">
                        <CreditCard className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="font-bold text-sm text-natural-text block">Банковская карта</span>
                        <span className="text-natural-text/60 text-xs mt-0.5 block leading-tight">Оплата картами Visa, Mastercard, МИР любого банка РФ.</span>
                      </div>
                    </button>
                  </div>
                </div>

                <div className="pt-4 border-t border-natural-text/10 flex gap-3">
                  <button
                    onClick={() => setStep(1)}
                    className="flex-1 border border-natural-text/25 hover:bg-natural-sand/30 text-natural-text font-bold py-3.5 rounded-xl text-sm text-center cursor-pointer transition-all"
                  >
                    Назад к доставке
                  </button>
                  <button
                    onClick={startPayment}
                    className="flex-1 bg-natural-dark hover:bg-natural-accent text-natural-bg font-bold py-3.5 rounded-xl text-sm text-center shadow-sm cursor-pointer transition-all"
                  >
                    Перейти к оплате ({totalAmount} ₽)
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 3: Interactive Payment Transaction */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex flex-col items-center justify-center py-4"
              >
                {paymentMethod === 'SBP' ? (
                  <div className="text-center space-y-4 max-w-sm">
                    <div className="bg-white border border-natural-text/10 rounded-3xl p-6 shadow-sm relative flex justify-center items-center w-52 h-52 mx-auto">
                      {/* SBP Mock QR */}
                      <div className="absolute inset-0 flex justify-center items-center opacity-5">
                        <QrCode className="w-full h-full" />
                      </div>
                      <div className="border-4 border-natural-dark p-2 bg-white rounded-xl z-10">
                        <div className="grid grid-cols-5 gap-1.5 w-32 h-32 bg-natural-text">
                          {/* Simulated high-tech QR blocks */}
                          {[...Array(25)].map((_, idx) => (
                            <div
                              key={idx}
                              className={`rounded ${
                                (idx % 3 === 0 || idx % 7 === 1 || idx < 5 || idx > 20 || idx % 5 === 0) && idx !== 12
                                  ? 'bg-natural-dark'
                                  : 'bg-white'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <p className="font-serif font-bold text-natural-text text-base">Оплатите по коду СБП</p>
                      <p className="text-natural-text/75 text-xs">Откройте камеру или приложение банка и отсканируйте код выше для оплаты покупки на сумму:</p>
                      <p className="font-serif font-extrabold text-natural-dark text-xl pt-1">{totalAmount} ₽</p>
                    </div>

                    {isProcessing && (
                      <div className="flex items-center justify-center gap-2 text-natural-text/70 text-xs font-bold bg-natural-sand/30 py-2.5 px-4 rounded-full">
                        <span className="w-3 h-3 border-2 border-natural-accent border-t-transparent rounded-full animate-spin" />
                        <span>Ожидаем подтверждение платежа банком...</span>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Animated Card Payment Form */
                  <div className="w-full space-y-6 max-w-md mx-auto">
                    {/* Visual Card Representation */}
                    <div className="perspective-1000">
                      <motion.div
                        animate={{ rotateY: isCardFlipped ? 180 : 0 }}
                        transition={{ duration: 0.6 }}
                        className="relative w-full h-48 bg-gradient-to-tr from-[#3D2B1F] via-[#5A3E2B] to-[#8C6D51] text-natural-bg rounded-2xl p-5 shadow-xl select-none preserve-3d"
                      >
                        {/* Front Side */}
                        <div className="absolute inset-0 p-5 backface-hidden flex flex-col justify-between">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="text-[9px] uppercase tracking-wider text-natural-bg/70 block">Кофейный Сомелье</span>
                              <span className="text-xs font-bold font-sans">МИР</span>
                            </div>
                            <div className="w-10 h-7 bg-natural-accent/20 border border-natural-accent/30 rounded-md flex items-center justify-center">
                              <span className="w-6 h-5 bg-natural-accent/30 rounded" />
                            </div>
                          </div>

                          <div className="font-mono text-lg tracking-widest text-center py-2 text-white font-bold">
                            {cardNumber ? cardNumber.replace(/(\d{4})/g, '$1 ').trim() : '•••• •••• •••• ••••'}
                          </div>

                          <div className="flex justify-between items-end">
                            <div>
                              <span className="text-[8px] uppercase text-natural-bg/50 block">Держатель</span>
                              <span className="text-xs font-mono font-semibold uppercase tracking-wider truncate max-w-[180px] block text-white">
                                {cardName || 'IVAN IVANOV'}
                              </span>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="text-[8px] uppercase text-natural-bg/50 block">Срок</span>
                              <span className="text-xs font-mono font-semibold text-white">
                                {cardExpiry ? `${cardExpiry.substring(0,2)}/${cardExpiry.substring(2,4)}` : 'MM/YY'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Back Side */}
                        <div className="absolute inset-0 p-5 backface-hidden flex flex-col justify-between rotateY-180 bg-stone-900">
                          <div className="h-10 bg-black -mx-5 mt-2" />
                          <div className="flex justify-end items-center gap-2 mt-4 bg-stone-800/80 p-2 rounded-lg">
                            <span className="text-[9px] text-stone-400 uppercase">CVV</span>
                            <span className="bg-white text-stone-900 font-mono text-sm px-2.5 py-0.5 rounded font-bold">
                              {cardCVV || '•••'}
                            </span>
                          </div>
                          <div className="text-[8px] text-stone-500 text-center leading-none">
                            ООО "ШОКО-КОФЕ РОСТЕРС БИЛД". Оплата по стандарту безопасности PCI-DSS.
                          </div>
                        </div>
                      </motion.div>
                    </div>

                    {/* Form Input fields */}
                    <form onSubmit={handleCardPaymentSubmit} className="space-y-3">
                      <div>
                        <label className="block text-[10px] text-natural-text/50 font-bold uppercase mb-1">Номер карты</label>
                        <input
                          required
                          type="text"
                          maxLength={16}
                          value={cardNumber}
                          onFocus={() => setIsCardFlipped(false)}
                          onChange={e => setCardNumber(e.target.value.replace(/\D/g, ''))}
                          placeholder="1234567812345678"
                          className="w-full bg-white border border-natural-text/15 rounded-xl px-3 py-2 text-natural-text text-xs font-mono focus:outline-none focus:border-natural-accent focus:bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] text-natural-text/50 font-bold uppercase mb-1">Имя на карте (латиницей)</label>
                        <input
                          required
                          type="text"
                          value={cardName}
                          onFocus={() => setIsCardFlipped(false)}
                          onChange={e => setCardName(e.target.value.toUpperCase().replace(/[^A-Z\s]/g, ''))}
                          placeholder="IVAN IVANOV"
                          className="w-full bg-white border border-natural-text/15 rounded-xl px-3 py-2 text-natural-text text-xs font-mono focus:outline-none focus:border-natural-accent focus:bg-white"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] text-natural-text/50 font-bold uppercase mb-1">Срок действия</label>
                          <input
                            required
                            type="text"
                            maxLength={4}
                            value={cardExpiry}
                            onFocus={() => setIsCardFlipped(false)}
                            onChange={e => setCardExpiry(e.target.value.replace(/\D/g, ''))}
                            placeholder="MMYY"
                            className="w-full bg-white border border-natural-text/15 rounded-xl px-3 py-2 text-natural-text text-xs font-mono focus:outline-none focus:border-natural-accent focus:bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-natural-text/50 font-bold uppercase mb-1">CVV / CVC код</label>
                          <input
                            required
                            type="password"
                            maxLength={3}
                            value={cardCVV}
                            onFocus={() => setIsCardFlipped(true)}
                            onBlur={() => setIsCardFlipped(false)}
                            onChange={e => setCardCVV(e.target.value.replace(/\D/g, ''))}
                            placeholder="123"
                            className="w-full bg-white border border-natural-text/15 rounded-xl px-3 py-2 text-natural-text text-xs font-mono focus:outline-none focus:border-natural-accent focus:bg-white"
                          />
                        </div>
                      </div>

                      <div className="pt-3 border-t border-natural-text/10 flex gap-2">
                        <button
                          type="button"
                          onClick={() => setStep(2)}
                          disabled={isProcessing}
                          className="flex-1 border border-natural-text/25 hover:bg-natural-sand/30 text-natural-text py-3 rounded-xl font-bold text-xs text-center cursor-pointer disabled:opacity-50 transition-all"
                        >
                          Назад
                        </button>
                        <button
                          type="submit"
                          disabled={isProcessing}
                          className="flex-1 bg-natural-dark hover:bg-natural-accent text-natural-bg py-3 rounded-xl font-bold text-xs text-center shadow-sm cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 transition-all"
                        >
                          {isProcessing ? (
                            <>
                              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              <span>Обработка платежа...</span>
                            </>
                          ) : (
                            <span>Оплатить {totalAmount} ₽</span>
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </motion.div>
            )}

            {/* Step 4: Receipt screen */}
            {step === 4 && finalOrder && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-5"
              >
                <div className="text-center py-2">
                  <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-2.5" />
                  <h3 className="font-serif text-natural-text font-extrabold text-lg">Заказ успешно оплачен!</h3>
                  <p className="text-natural-text/75 text-xs mt-1">Ожидайте СМС с трек-номером и звонок от бариста для уточнения времени доставки.</p>
                </div>

                {/* Aesthetic Receipt Widget */}
                <div className="bg-white border border-natural-text/10 rounded-2xl p-4 font-mono text-[11px] text-natural-text/80 space-y-3 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-natural-dark" />
                  <div className="flex justify-between font-bold text-natural-text border-b border-dashed border-natural-text/15 pb-2">
                    <span className="flex items-center gap-1 font-serif font-bold">
                      <Receipt className="w-3.5 h-3.5 text-natural-accent" />
                      <span>КАССОВЫЙ ЧЕК</span>
                    </span>
                    <span>{finalOrder.id}</span>
                  </div>

                  <div className="space-y-1 text-natural-text/60 border-b border-dashed border-natural-text/15 pb-2">
                    <div className="flex justify-between">
                      <span>Дата:</span>
                      <span className="text-natural-text font-medium">{finalOrder.timestamp}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Получатель:</span>
                      <span className="text-natural-text font-medium truncate max-w-[200px]">{finalOrder.customerName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Адрес:</span>
                      <span className="text-natural-text font-medium truncate max-w-[200px]">{finalOrder.address}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Доставка:</span>
                      <span className="text-natural-text font-medium truncate max-w-[200px]">{finalOrder.deliveryMethod}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Метод оплаты:</span>
                      <span className="text-natural-text font-medium truncate max-w-[200px]">{finalOrder.paymentMethod}</span>
                    </div>
                  </div>

                  <div className="space-y-1.5 py-1">
                    <span className="font-bold text-natural-text block mb-1">КУПЛЕННЫЕ ТОВАРЫ:</span>
                    {finalOrder.items.map((item, idx) => {
                      const basePrice = item.product.price;
                      const multiplier = item.weight === '500г' ? 1.8 : item.weight === '1kg' || item.weight === '1кг' ? 3.2 : 1.0;
                      const itemPrice = Math.round(basePrice * multiplier);
                      return (
                        <div key={idx} className="flex justify-between items-start">
                          <div className="max-w-[220px]">
                            <span className="text-natural-text font-bold">{item.product.name}</span>
                            <span className="text-[9px] text-natural-text/50 block leading-tight">({item.grind}, {item.weight}) x{item.quantity}</span>
                          </div>
                          <span className="font-bold text-natural-text shrink-0">{itemPrice * item.quantity} ₽</span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="border-t border-dashed border-natural-text/15 pt-2 flex justify-between font-extrabold text-natural-text text-sm">
                    <span>ИТОГО:</span>
                    <span>{finalOrder.totalAmount} ₽</span>
                  </div>

                  <div className="text-center text-[9px] text-natural-text/40 pt-2">
                    Спасибо за покупку свежеобжаренного кофе!
                    <br />
                    ООО "Кофейный Сомелье Онлайн"
                  </div>
                </div>

                <button
                  onClick={finishCheckout}
                  className="w-full bg-natural-dark hover:bg-natural-accent text-natural-bg font-bold py-3.5 rounded-xl text-sm text-center shadow-sm cursor-pointer transition-all"
                >
                  Вернуться на сайт
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
