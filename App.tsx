
import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShoppingCart, LayoutGrid, BarChart3, Receipt, Trash2, Plus, Minus, 
  Banknote, Smartphone, ChevronRight, X, Sparkles, 
  Loader2, CheckCircle2, Users, ChevronDown, ChevronUp, QrCode
} from 'lucide-react';
import { Product, OrderItem, Transaction } from './types.ts';
import { INITIAL_PRODUCTS } from './constants.tsx';
import { getSalesInsights } from './geminiService.ts';

const App: React.FC = () => {
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [activeTab, setActiveTab] = useState<'pos' | 'stats'>('pos');
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [isCheckoutSuccess, setIsCheckoutSuccess] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<Transaction | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<'cash' | 'leke' | 'mobile' | null>(null);
  const [cashReceived, setCashReceived] = useState<string>('');
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  
  const [expandedTx, setExpandedTx] = useState<string | null>(null);
  const [selectedMonthOffset, setSelectedMonthOffset] = useState<number>(0);
  const [showOnlyLeke, setShowOnlyLeke] = useState<boolean>(false);

  useEffect(() => {
    const saved = localStorage.getItem('pos_transactions');
    if (saved) {
      try { 
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setTransactions(parsed);
      } catch (e) { console.error(e); }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('pos_transactions', JSON.stringify(transactions));
  }, [transactions]);

  const addToCart = (product: Product) => {
    if (!product.name) return;
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) return { ...item, quantity: Math.max(0, item.quantity + delta) };
      return item;
    }).filter(item => item.quantity > 0));
  };

  const deleteTransaction = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); 
    if (window.confirm('確定要永久刪除這筆交易紀錄嗎？')) {
      setTransactions(prev => prev.filter(t => t.id !== id));
      if (expandedTx === id) setExpandedTx(null);
    }
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const monthLabels = useMemo(() => {
    const labels = [];
    for (let i = 0; i < 3; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      labels.push({ name: `${d.getFullYear()}年${d.getMonth() + 1}月`, offset: i });
    }
    return labels;
  }, []);

  const stats = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const filterDate = new Date();
    filterDate.setMonth(now.getMonth() - selectedMonthOffset);
    const startOfFilterMonth = new Date(filterDate.getFullYear(), filterDate.getMonth(), 1).getTime();
    const endOfFilterMonth = new Date(filterDate.getFullYear(), filterDate.getMonth() + 1, 0, 23, 59, 59).getTime();

    const todaySales = transactions.filter(t => t.timestamp >= startOfToday);
    const currentMonthSales = transactions.filter(t => t.timestamp >= new Date(now.getFullYear(), now.getMonth(), 1).getTime());
    const filterMonthTransactions = transactions.filter(t => t.timestamp >= startOfFilterMonth && t.timestamp <= endOfFilterMonth);

    return {
      today: todaySales.reduce((s, t) => s + t.total, 0),
      month: currentMonthSales.reduce((s, t) => s + t.total, 0),
      filterMonthLeke: filterMonthTransactions.filter(t => t.paymentMethod === 'leke').reduce((s, t) => s + t.total, 0),
      filteredList: showOnlyLeke 
        ? filterMonthTransactions.filter(t => t.paymentMethod === 'leke')
        : filterMonthTransactions
    };
  }, [transactions, selectedMonthOffset, showOnlyLeke]);

  const handleCheckout = () => {
    if (cart.length === 0 || !selectedPayment) return;
    const isManual = selectedPayment === 'cash';
    const received = isManual ? (parseFloat(cashReceived) || 0) : subtotal;
    if (isManual && received < subtotal) { alert('實收金額不足！'); return; }

    const newTransaction: Transaction = {
      id: `TX-${Date.now()}`,
      timestamp: Date.now(),
      items: [...cart],
      total: subtotal,
      paymentMethod: selectedPayment,
      receivedAmount: received,
      changeAmount: Math.max(0, received - subtotal)
    };
    setLastTransaction(newTransaction);
    setIsCheckoutSuccess(true);
  };

  const finalCompletion = () => {
    if (lastTransaction) setTransactions(prev => [lastTransaction, ...prev]);
    setCart([]);
    setLastTransaction(null);
    setIsCheckoutSuccess(false);
    setShowCheckoutModal(false);
    setSelectedPayment(null);
    setCashReceived('');
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden">
      <nav className="w-20 md:w-24 bg-slate-900 flex flex-col items-center py-10 gap-8 z-20">
        <div className="bg-indigo-600 p-3 rounded-2xl text-white shadow-lg mb-4"><LayoutGrid size={28} /></div>
        <button onClick={() => setActiveTab('pos')} className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all ${activeTab === 'pos' ? 'text-white bg-slate-800' : 'text-slate-500 hover:text-white'}`}>
          <ShoppingCart size={24} /><span className="text-[10px] font-black uppercase tracking-tight">點單</span>
        </button>
        <button onClick={() => setActiveTab('stats')} className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all ${activeTab === 'stats' ? 'text-white bg-slate-800' : 'text-slate-500 hover:text-white'}`}>
          <BarChart3 size={24} /><span className="text-[10px] font-black uppercase tracking-tight">統計</span>
        </button>
      </nav>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-slate-100 p-6 flex items-center justify-between">
          {activeTab === 'stats' ? (
             <div className="flex gap-4 overflow-x-auto w-full">
                <div className="bg-indigo-50 px-6 py-3 rounded-2xl flex-shrink-0">
                  <p className="text-[10px] font-bold text-indigo-400 uppercase mb-1">今日營收</p>
                  <p className="text-2xl font-black text-indigo-600 mono">NT$ {stats.today.toLocaleString()}</p>
                </div>
                <div className="bg-emerald-50 px-6 py-3 rounded-2xl flex-shrink-0">
                  <p className="text-[10px] font-bold text-emerald-400 uppercase mb-1">本月營收</p>
                  <p className="text-2xl font-black text-emerald-600 mono">NT$ {stats.month.toLocaleString()}</p>
                </div>
             </div>
          ) : (
            <h1 className="text-xl font-black tracking-tighter">CLOUD POS SYSTEM</h1>
          )}
        </header>

        <div className="flex-1 overflow-hidden relative">
          {activeTab === 'stats' ? (
            <div className="h-full overflow-y-auto p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black">交易歷史紀錄</h2>
                <div className="flex bg-slate-200 p-1 rounded-xl gap-1">
                  {monthLabels.map(m => (
                    <button key={m.offset} onClick={() => setSelectedMonthOffset(m.offset)} className={`px-3 py-1.5 rounded-lg text-[10px] font-black ${selectedMonthOffset === m.offset ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>
                      {m.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden divide-y divide-slate-50">
                {stats.filteredList.length === 0 ? (
                  <div className="p-20 text-center text-slate-300 font-black uppercase">目前尚無紀錄</div>
                ) : (
                  stats.filteredList.map(t => (
                    <div key={t.id} onClick={() => setExpandedTx(expandedTx === t.id ? null : t.id)} className="p-4 hover:bg-slate-50 transition-colors cursor-pointer group">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4 flex-1">
                          <div className={`p-3 rounded-xl ${t.paymentMethod === 'leke' ? 'bg-orange-100 text-orange-600' : t.paymentMethod === 'mobile' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                            {t.paymentMethod === 'cash' ? <Banknote size={20}/> : t.paymentMethod === 'leke' ? <Users size={20}/> : <Smartphone size={20}/>}
                          </div>
                          <div className="min-w-0">
                             <p className="font-black text-slate-800 text-lg leading-tight">NT$ {t.total.toLocaleString()}</p>
                             <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5 truncate">{new Date(t.timestamp).toLocaleString()}</p>
                          </div>
                        </div>
                        
                        {/* 修正後的刪除按鈕：絕對清楚的紅色設計 */}
                        <div className="flex items-center gap-2">
                           <button 
                              onClick={(e) => deleteTransaction(t.id, e)}
                              className="w-12 h-12 flex items-center justify-center bg-red-100 text-red-600 rounded-2xl hover:bg-red-600 hover:text-white transition-all active:scale-90 border-2 border-red-200"
                           >
                              <Trash2 size={22} strokeWidth={2.5} />
                           </button>
                           <div className="text-slate-300 ml-2">{expandedTx === t.id ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}</div>
                        </div>
                      </div>

                      {expandedTx === t.id && (
                        <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                          {t.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between text-sm pr-14">
                              <span className="text-slate-600">{item.name} x{item.quantity}</span>
                              <span className="font-black text-slate-800 mono">NT$ {item.price * item.quantity}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="flex h-full flex-col md:flex-row">
              {/* 商品選擇 */}
              <div className="flex-1 p-6 overflow-y-auto">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {INITIAL_PRODUCTS.map(product => (
                    <button key={product.id} onClick={() => addToCart(product)} className={`p-4 rounded-3xl border text-center flex flex-col items-center justify-between min-h-[160px] active:scale-95 transition-all ${product.name ? 'bg-white border-white shadow-sm hover:border-indigo-100' : 'bg-slate-100 border-dashed border-slate-200 opacity-40'}`}>
                      {product.name ? (
                        <>
                          <div className="w-full aspect-square rounded-2xl overflow-hidden mb-2 bg-slate-50">
                             <img src={product.image || 'https://images.unsplash.com/photo-1541167760496-1628856ab752?w=100'} className="w-full h-full object-cover" alt={product.name} />
                          </div>
                          <div className="w-full">
                            <h3 className="font-black text-slate-700 text-xs truncate">{product.name}</h3>
                            <p className="text-[10px] font-black text-indigo-600 mt-1 mono">NT$ {product.price}</p>
                          </div>
                        </>
                      ) : (
                        <div className="flex items-center justify-center h-full text-slate-200"><Plus size={24} /></div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* 結帳側邊欄 */}
              <div className="w-full md:w-80 bg-white border-l border-slate-100 flex flex-col shadow-xl">
                 <div className="p-5 border-b border-slate-50 flex justify-between items-center">
                    <h2 className="font-black text-slate-800 flex items-center gap-2"><ShoppingCart size={20}/> 當前訂單</h2>
                    <button onClick={() => setCart([])} className="text-slate-300 hover:text-red-500"><Trash2 size={20}/></button>
                 </div>
                 <div className="flex-1 overflow-y-auto p-4 space-y-3">
                   {cart.length === 0 ? (
                     <div className="h-full flex flex-col items-center justify-center text-slate-200 gap-2 opacity-40">
                       <Receipt size={40} /><p className="text-xs font-black uppercase">待點單中</p>
                     </div>
                   ) : (
                     cart.map(item => (
                       <div key={item.id} className="flex gap-3 items-center bg-slate-50 p-3 rounded-2xl border border-transparent">
                         <div className="flex-1 min-w-0">
                           <h4 className="font-black text-slate-800 text-sm truncate">{item.name}</h4>
                           <p className="text-[10px] text-slate-400 font-black mono">NT$ {item.price}</p>
                         </div>
                         <div className="flex items-center gap-1 bg-white rounded-xl border border-slate-100 p-1">
                           <button onClick={() => updateQuantity(item.id, -1)} className="p-1"><Minus size={14}/></button>
                           <span className="font-black text-slate-800 text-xs w-6 text-center">{item.quantity}</span>
                           <button onClick={() => updateQuantity(item.id, 1)} className="p-1"><Plus size={14}/></button>
                         </div>
                       </div>
                     ))
                   )}
                 </div>
                 <div className="p-6 bg-slate-900 text-white shadow-2xl">
                    <div className="flex justify-between items-end mb-4">
                      <span className="text-slate-500 font-black text-[10px] uppercase">總計</span>
                      <span className="text-3xl font-black mono text-indigo-400">NT$ {subtotal.toLocaleString()}</span>
                    </div>
                    <button disabled={cart.length === 0} onClick={() => setShowCheckoutModal(true)} className="w-full bg-indigo-500 py-4 rounded-2xl font-black text-xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2">
                      立即結帳 <ChevronRight size={24} />
                    </button>
                 </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* 結帳視窗 */}
      {showCheckoutModal && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-200">
            {isCheckoutSuccess ? (
              <div className="p-10 text-center space-y-6">
                <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto"><CheckCircle2 size={48} /></div>
                <h3 className="text-2xl font-black text-slate-800">交易完成</h3>
                <div className="bg-slate-50 p-6 rounded-3xl text-left border border-slate-100">
                   <div className="flex justify-between text-emerald-600 text-2xl font-black"><span className="text-sm text-slate-400 font-black">找零</span><span className="mono">NT$ {lastTransaction?.changeAmount}</span></div>
                </div>
                <button onClick={finalCompletion} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-xl active:scale-95 transition-all">完成</button>
              </div>
            ) : (
              <div className="flex flex-col">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                   <div><p className="text-[10px] font-black text-slate-400 uppercase">應付金額</p><h3 className="text-3xl font-black text-indigo-600 mono">NT$ {subtotal.toLocaleString()}</h3></div>
                   <button onClick={() => setShowCheckoutModal(false)} className="p-2 text-slate-300 hover:text-red-500"><X size={28} /></button>
                </div>
                <div className="p-6 space-y-4">
                  {!selectedPayment ? (
                    <div className="grid gap-3">
                      <button onClick={() => setSelectedPayment('cash')} className="w-full flex items-center gap-4 p-5 rounded-3xl bg-indigo-600 text-white shadow-lg active:scale-95 transition-all">
                        <Banknote size={28}/> <span className="font-black text-xl">現金支付</span>
                      </button>
                      <button onClick={() => setSelectedPayment('leke')} className="w-full flex items-center gap-4 p-5 rounded-3xl bg-orange-500 text-white shadow-lg active:scale-95 transition-all">
                        <Users size={28}/> <span className="font-black text-xl">樂客轉帳</span>
                      </button>
                      <button onClick={() => setSelectedPayment('mobile')} className="w-full flex items-center gap-4 p-5 rounded-3xl bg-emerald-500 text-white shadow-lg active:scale-95 transition-all">
                        <Smartphone size={28}/> <span className="font-black text-xl">行動支付</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                       {selectedPayment === 'cash' ? (
                         <>
                           <div className="space-y-2">
                              <p className="text-[10px] font-black text-slate-400 uppercase">實收金額</p>
                              <input autoFocus type="number" placeholder="0" value={cashReceived} onChange={(e) => setCashReceived(e.target.value)} className="w-full px-6 py-4 bg-slate-50 rounded-2xl text-3xl font-black mono outline-none border-2 border-transparent focus:border-indigo-500 transition-all" />
                           </div>
                           <button onClick={handleCheckout} disabled={!cashReceived || parseFloat(cashReceived) < subtotal} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-xl disabled:opacity-30 active:scale-95 transition-all">確認收錢</button>
                         </>
                       ) : (
                         <div className="text-center py-6 space-y-4">
                            <div className="p-6 bg-slate-50 rounded-3xl border-2 border-indigo-100 flex flex-col items-center">
                               <QrCode size={120} className="text-slate-800 mb-4" />
                               <p className="font-black text-lg">請收受 NT$ {subtotal}</p>
                            </div>
                            <button onClick={handleCheckout} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-xl active:scale-95 transition-all">確認入帳</button>
                         </div>
                       )}
                       <button onClick={() => setSelectedPayment(null)} className="w-full py-2 text-slate-400 font-bold text-sm">變更支付方式</button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
