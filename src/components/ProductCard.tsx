import React, { useState } from 'react';
import { Product, CartItem } from '../types';
import { ShoppingCart, Flame, Coffee, Bean, ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ProductCardProps {
  key?: string;
  product: Product;
  onAddToCart: (item: Omit<CartItem, 'id'>) => void;
}

export default function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const [grind, setGrind] = useState('В зёрнах');
  const [weight, setWeight] = useState('250г');
  const [isAdded, setIsAdded] = useState(false);
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);

  const getPriceMultiplier = (w: string) => {
    if (w === '500г') return 1.8;
    if (w === '1кг') return 3.2;
    return 1.0;
  };

  const calculatedPrice = Math.round(product.price * getPriceMultiplier(weight));

  const handleAdd = () => {
    onAddToCart({
      product,
      quantity: 1,
      grind,
      weight,
    });
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 2000);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="bg-natural-sand/25 border border-natural-text/10 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col h-full"
      id={`product-card-${product.id}`}
    >
      {/* Product Image */}
      <div className="relative h-40 bg-natural-sand/40 overflow-hidden group">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          referrerPolicy="no-referrer"
        />
        <div className="absolute top-2 left-2 bg-natural-dark/95 text-natural-bg text-[10px] uppercase tracking-wider font-semibold px-2 py-1 rounded-full flex items-center gap-1">
          <Flame className="w-3 h-3 text-amber-400" />
          <span>{product.roast} обжарка</span>
        </div>
        <div className="absolute top-2 right-2 bg-natural-accent text-white text-[10px] px-2.5 py-1 rounded-full font-medium shadow-sm">
          {product.type}
        </div>
      </div>

      {/* Product Info */}
      <div className="p-4 flex flex-col flex-grow">
        <h3 className="font-serif font-bold text-natural-text text-base mb-1 line-clamp-1">{product.name}</h3>
        <p className="text-natural-text/70 text-xs line-clamp-2 mb-3 h-8 leading-relaxed">{product.description}</p>

        {/* Sensory Profile */}
        {product.type !== 'Оборудование' && product.type !== 'Сопутствующие товары' && (
          <div className="space-y-1.5 mb-3 bg-natural-sand/40 p-2.5 rounded-xl border border-natural-text/5">
            {/* Acidity */}
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-natural-text/70 font-medium">Кислотность</span>
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((dot) => (
                  <span
                    key={dot}
                    className={`w-1.5 h-1.5 rounded-full ${
                      dot <= product.acidity ? 'bg-natural-accent' : 'bg-natural-taupe'
                    }`}
                  />
                ))}
              </div>
            </div>
            {/* Sweetness */}
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-natural-text/70 font-medium">Сладость</span>
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((dot) => (
                  <span
                    key={dot}
                    className={`w-1.5 h-1.5 rounded-full ${
                      dot <= product.sweetness ? 'bg-natural-accent' : 'bg-natural-taupe'
                    }`}
                  />
                ))}
              </div>
            </div>
            {/* Body */}
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-natural-text/70 font-medium">Плотность</span>
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((dot) => (
                  <span
                    key={dot}
                    className={`w-1.5 h-1.5 rounded-full ${
                      dot <= product.body ? 'bg-natural-accent' : 'bg-natural-taupe'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Flavor Notes */}
        {product.flavorNotes.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {product.flavorNotes.map((note, idx) => (
              <span
                key={idx}
                className="text-[10px] bg-natural-bg text-natural-dark border border-natural-accent/20 px-2.5 py-0.5 rounded-full font-medium"
              >
                {note}
              </span>
            ))}
          </div>
        )}

        {/* Brewing Methods */}
        {product.methods.length > 0 && (
          <div className="flex items-center gap-1.5 mb-3 text-[10px] text-natural-text/70 font-medium">
            <Coffee className="w-3.5 h-3.5 text-natural-accent shrink-0" />
            <span className="truncate">{product.methods.join(', ')}</span>
          </div>
        )}

        <div className="flex-grow" />

        {/* Customization Options Dropdown */}
        {product.type !== 'Оборудование' && product.type !== 'Сопутствующие товары' ? (
          <div className="mb-3 relative">
            <button
              onClick={() => setIsOptionsOpen(!isOptionsOpen)}
              className="w-full flex items-center justify-between bg-natural-sand/50 hover:bg-natural-sand border border-natural-text/10 text-natural-text text-xs py-2 px-3 rounded-xl font-medium transition-colors"
              id={`options-btn-${product.id}`}
            >
              <div className="flex items-center gap-1.5">
                <Bean className="w-3.5 h-3.5 text-natural-accent" />
                <span>{grind}, {weight}</span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-natural-text/50 transition-transform ${isOptionsOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {isOptionsOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setIsOptionsOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="absolute bottom-full left-0 right-0 mb-1.5 bg-white border border-natural-text/10 rounded-2xl shadow-lg z-20 p-3.5 space-y-3.5"
                  >
                    <div>
                      <span className="text-[10px] text-natural-text/50 font-bold uppercase tracking-wider block mb-1">Помол</span>
                      <div className="grid grid-cols-2 gap-1.5">
                        {['В зёрнах', 'Для турки', 'Для эспрессо', 'Для воронки', 'Крупный'].map((g) => (
                          <button
                            key={g}
                            onClick={() => setGrind(g)}
                            className={`text-[11px] py-1 px-1.5 border rounded-lg font-medium text-center truncate cursor-pointer transition-all ${
                              grind === g
                                ? 'bg-natural-dark text-natural-bg border-natural-dark font-bold'
                                : 'bg-natural-bg text-natural-text border-natural-text/5 hover:bg-natural-sand/50'
                            }`}
                          >
                            {g}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] text-natural-text/50 font-bold uppercase tracking-wider block mb-1">Вес</span>
                      <div className="grid grid-cols-3 gap-1.5">
                        {['250г', '500г', '1кг'].map((w) => (
                          <button
                            key={w}
                            onClick={() => setWeight(w)}
                            className={`text-[11px] py-1 px-1.5 border rounded-lg font-medium text-center cursor-pointer transition-all ${
                              weight === w
                                ? 'bg-natural-dark text-natural-bg border-natural-dark font-bold'
                                : 'bg-natural-bg text-natural-text border-natural-text/5 hover:bg-natural-sand/50'
                            }`}
                          >
                            {w}
                          </button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <div className="h-2" />
        )}

        {/* Price & Add Button */}
        <div className="flex items-center justify-between pt-2 border-t border-natural-text/10 mt-auto">
          <div>
            <span className="text-[10px] text-natural-text/50 font-medium block leading-none">Стоимость</span>
            <span className="font-serif font-bold text-natural-text text-base leading-snug">{calculatedPrice} ₽</span>
          </div>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleAdd}
            className={`flex items-center gap-1.5 py-2 px-3.5 rounded-xl font-bold text-xs shadow-sm cursor-pointer transition-colors ${
              isAdded
                ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                : 'bg-natural-dark hover:bg-natural-accent text-natural-bg'
            }`}
            id={`add-btn-${product.id}`}
          >
            {isAdded ? (
              <>
                <Check className="w-4 h-4" />
                <span>Добавлено</span>
              </>
            ) : (
              <>
                <ShoppingCart className="w-4 h-4" />
                <span>В корзину</span>
              </>
            )}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
