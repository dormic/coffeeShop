import React, { useState } from 'react';
import { Product } from '../types';
import { X, Sparkles, Coffee, Heart, RotateCcw, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CoffeeMatchModalProps {
  products: Product[];
  onClose: () => void;
  onSelectProduct: (product: Product) => void;
}

export default function CoffeeMatchModal({ products, onClose, onSelectProduct }: CoffeeMatchModalProps) {
  const [step, setStep] = useState(1);
  const [acidity, setAcidity] = useState<number | null>(null); // 1-5
  const [sweetness, setSweetness] = useState<number | null>(null); // 1-5
  const [body, setBody] = useState<number | null>(null); // 1-5
  const [method, setMethod] = useState<string | null>(null); // эспрессо, турка, воронка, гейзер, аэропресс
  const [roast, setRoast] = useState<string | null>(null); // Светлая, Средняя, Темная

  const [results, setResults] = useState<Product[]>([]);

  const resetMatcher = () => {
    setStep(1);
    setAcidity(null);
    setSweetness(null);
    setBody(null);
    setMethod(null);
    setRoast(null);
    setResults([]);
  };

  const handleCalculateMatch = () => {
    // Filter only coffee
    const coffeeProducts = products.filter(p => p.type === 'Моносорт' || p.type === 'Бленд');

    // Score products based on selections
    const scored = coffeeProducts.map(p => {
      let score = 0;

      // 1. Acidity score (closer is better)
      if (acidity !== null) {
        score += (5 - Math.abs(p.acidity - acidity));
      }

      // 2. Sweetness score
      if (sweetness !== null) {
        score += (5 - Math.abs(p.sweetness - sweetness));
      }

      // 3. Body/density score
      if (body !== null) {
        score += (5 - Math.abs(p.body - body));
      }

      // 4. Brewing Method match (large bonus if preferred method matches)
      if (method) {
        const matchesMethod = p.methods.some(m => m.toLowerCase().includes(method.toLowerCase()));
        if (matchesMethod) score += 8;
      }

      // 5. Roast match
      if (roast && roast !== 'Все равно') {
        if (p.roast.toLowerCase() === roast.toLowerCase()) {
          score += 5;
        }
      }

      return { product: p, score };
    });

    // Sort by score descending and take top 3
    const topScored = scored
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(item => item.product);

    setResults(topScored);
    setStep(6);
  };

  const stepsTitle = [
    "",
    "Какую кислотность кофе Вы предпочитаете?",
    "Какой уровень сладости Вам нравится?",
    "Какой плотности (насыщенности) напиток Вы любите?",
    "Каким способом Вы планируете заваривать кофе?",
    "Какой степени обжарки зерна Вы отдаёте предпочтение?",
    "Ваши идеальные кофейные сорта"
  ];

  return (
    <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-[#F5F2ED] rounded-3xl shadow-xl border border-natural-text/10 max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]"
        id="coffee-match-modal"
      >
        {/* Header */}
        <div className="bg-natural-dark p-5 text-natural-bg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <span className="font-serif font-bold text-lg">Кофейный Сомелье: Подбор сорта</span>
          </div>
          <button onClick={onClose} className="text-natural-bg/80 hover:text-white transition-colors cursor-pointer" id="close-matcher-btn">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex-grow overflow-y-auto flex flex-col justify-center min-h-[300px]">
          <h3 className="font-serif text-natural-text text-xl font-bold text-center mb-6 leading-tight">
            {stepsTitle[step]}
          </h3>

          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-3"
              >
                {[
                  { value: 1, label: "Без кислинки (мягкий шоколадный профиль)" },
                  { value: 3, label: "Сбалансированная (легкая яблочная кислинка)" },
                  { value: 5, label: "Яркая фруктовая (выраженная цитрусовая или ягодная)" }
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => { setAcidity(opt.value); setStep(2); }}
                    className="w-full text-left bg-white hover:bg-natural-sand/50 border border-natural-text/5 hover:border-natural-accent/30 rounded-2xl p-4 transition-all font-semibold text-natural-text text-sm flex justify-between items-center cursor-pointer shadow-sm"
                  >
                    <span>{opt.label}</span>
                    <ArrowRight className="w-4 h-4 text-natural-accent" />
                  </button>
                ))}
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-3"
              >
                {[
                  { value: 1, label: "Низкая сладость (строгий, терпкий классический профиль)" },
                  { value: 3, label: "Умеренная сладость (баланс сладости и кислинки)" },
                  { value: 5, label: "Высокая сладость (ярко выраженные карамельные и медовые ноты)" }
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => { setSweetness(opt.value); setStep(3); }}
                    className="w-full text-left bg-white hover:bg-natural-sand/50 border border-natural-text/5 hover:border-natural-accent/30 rounded-2xl p-4 transition-all font-semibold text-natural-text text-sm flex justify-between items-center cursor-pointer shadow-sm"
                  >
                    <span>{opt.label}</span>
                    <ArrowRight className="w-4 h-4 text-natural-accent" />
                  </button>
                ))}
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-3"
              >
                {[
                  { value: 1, label: "Легкое тело (чайное, деликатное)" },
                  { value: 3, label: "Сбалансированное среднее тело" },
                  { value: 5, label: "Очень плотное тело (тягучее, насыщенное, сиропное)" }
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => { setBody(opt.value); setStep(4); }}
                    className="w-full text-left bg-white hover:bg-natural-sand/50 border border-natural-text/5 hover:border-natural-accent/30 rounded-2xl p-4 transition-all font-semibold text-natural-text text-sm flex justify-between items-center cursor-pointer shadow-sm"
                  >
                    <span>{opt.label}</span>
                    <ArrowRight className="w-4 h-4 text-natural-accent" />
                  </button>
                ))}
              </motion.div>
            )}

            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="grid grid-cols-2 gap-3"
              >
                {["эспрессо", "турка", "воронка", "гейзер", "аэропресс", "френч-пресс"].map((m) => (
                  <button
                    key={m}
                    onClick={() => { setMethod(m); setStep(5); }}
                    className="flex flex-col items-center justify-center gap-2.5 bg-white hover:bg-natural-sand/50 border border-natural-text/5 hover:border-natural-accent/30 rounded-2xl p-5 transition-all text-natural-text hover:text-natural-dark cursor-pointer shadow-sm"
                  >
                    <Coffee className="w-6 h-6 text-natural-accent" />
                    <span className="font-bold text-xs capitalize">{m}</span>
                  </button>
                ))}
              </motion.div>
            )}

            {step === 5 && (
              <motion.div
                key="step5"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-3"
              >
                {["Светлая", "Средняя", "Темная", "Все равно"].map((r) => (
                  <button
                    key={r}
                    onClick={() => {
                      setRoast(r);
                      // This is the last input step, trigger matching calculation
                      setTimeout(() => handleCalculateMatch(), 100);
                    }}
                    className="w-full text-left bg-white hover:bg-natural-sand/50 border border-natural-text/5 hover:border-natural-accent/30 rounded-2xl p-4 transition-all font-semibold text-natural-text text-sm flex justify-between items-center cursor-pointer shadow-sm"
                  >
                    <span>{r === 'Все равно' ? 'Любая обжарка' : `${r} обжарка`}</span>
                    <ArrowRight className="w-4 h-4 text-natural-accent" />
                  </button>
                ))}
              </motion.div>
            )}

            {step === 6 && (
              <motion.div
                key="step6"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                {results.length > 0 ? (
                  results.map((p) => (
                    <div
                      key={p.id}
                      className="border border-natural-text/10 rounded-2xl p-4 bg-white hover:bg-natural-sand/35 hover:border-natural-accent/30 transition-all flex items-center gap-4 shadow-sm"
                    >
                      <img src={p.image} alt={p.name} className="w-16 h-16 rounded-xl object-cover shrink-0" referrerPolicy="no-referrer" />
                      <div className="flex-grow min-w-0">
                        <h4 className="font-serif font-bold text-natural-text text-sm truncate">{p.name}</h4>
                        <p className="text-natural-text/70 text-xs line-clamp-1">{p.description}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[10px] bg-natural-bg text-natural-dark px-2 py-0.5 rounded-full font-medium border border-natural-accent/10">{p.roast} обжарка</span>
                          <span className="text-[10px] font-bold text-natural-text">{p.price} ₽</span>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          onSelectProduct(p);
                          onClose();
                        }}
                        className="bg-natural-dark text-natural-bg hover:bg-natural-accent text-xs py-2 px-3.5 rounded-xl font-bold shrink-0 shadow-sm cursor-pointer transition-colors"
                      >
                        Подробнее
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Heart className="w-12 h-12 text-natural-accent/30 mx-auto mb-2" />
                    <p className="text-natural-text/70 font-medium">К сожалению, сортов по таким параметрам не найдено. Попробуйте изменить параметры!</p>
                  </div>
                )}

                <div className="flex gap-3 pt-4 border-t border-natural-text/10">
                  <button
                    onClick={resetMatcher}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-natural-sand/50 hover:bg-natural-sand border border-natural-text/10 text-natural-text text-xs py-3 rounded-xl font-bold transition-all cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Подобрать заново</span>
                  </button>
                  <button
                    onClick={onClose}
                    className="flex-1 bg-natural-dark hover:bg-natural-accent text-natural-bg text-xs py-3 rounded-xl font-bold transition-all text-center cursor-pointer"
                  >
                    Отлично, спасибо!
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Progress Bar */}
        {step < 6 && (
          <div className="h-1.5 bg-natural-sand w-full">
            <div
              className="h-full bg-natural-accent transition-all duration-300"
              style={{ width: `${(step / 5) * 100}%` }}
            />
          </div>
        )}
      </motion.div>
    </div>
  );
}
