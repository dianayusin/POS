
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
    if (window.confirm('確定要永久刪除這筆交易紀錄嗎？此動作無法撤回。')) {
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
      filteredList: filterMonthTransactions
    };
  }, [transactions, selectedMonthOffset]);

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

  const fetchAiInsights = async () => {
    setIsAiLoading(true);
    try {
      const insight = await getSalesInsights(transactions);
      setAiInsight(insight);
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden font-sans">
      <nav className="w-20 md:w-24 bg-slate-900 flex flex-col items-center py-10 gap-10 z-20">
        <div className="bg-indigo-600 p-3 rounded-2xl text-white shadow-lg"><LayoutGrid size={28} /></div>
        <button onClick={() => setActiveTab('pos')} className={`flex flex-col items-center gap-2 p-3 rounded-2xl transition-all ${activeTab === 'pos' ? 'text-white bg-slate-800' : 'text-slate-500 hover:text-white'}`}>
          <ShoppingCart size={24} /><span className="text-[10px] font-bold uppercase">點單</span>
        </button>
        <button onClick={() => setActiveTab('stats')} className={`flex flex-col items-center gap-2 p-3 rounded-2xl transition-all ${activeTab === 'stats' ? 'text-white bg-slate-800' : 'text-slate-500 hover:text-white'}`}>
          <BarChart3 size={24} /><span className="text-[10px] font-bold uppercase">統計</span>
        </button>
      </nav>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-slate-100 p-6 flex items-center justify-between shadow-sm z-10">
          {activeTab === 'stats' ? (
             <div className="flex gap-4">
                <div className="bg-indigo-50 px-6 py-3 rounded-2xl border border-indigo-100">
                  <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">今日營收</p>
                  <p className="text-2xl font-black text-indigo-600 mono leading-none">NT$ {stats.today.toLocaleString()}</p>
                </div>
                <div className="bg-emerald-50 px-6 py-3 rounded-2xl border border-emerald-100">
                  <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-1">本月營收</p>
                  <p className="text-2xl font-black text-emerald-600 mono leading-none">NT$ {stats.month.toLocaleString()}</p>
                </div>
             </div>
          ) : (
            <h1 className="text-xl font-black tracking-tighter text-slate-800 uppercase">Cloud POS</h1>
          )}
          {activeTab === 'stats' && (
            <button onClick={fetchAiInsights} className="bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg active:scale-95 transition-all">
              {isAiLoading ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />} AI 經營分析
            </button>
          )}
        </header>

        <div className="flex-1 overflow-hidden relative">
          {activeTab === 'stats' ? (
            <div className="h-full overflow-y-auto p-6 md:p-8 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black text-slate-800">交易歷史</h2>
                <div className="flex bg-slate-200 p-1 rounded-xl gap-1">
                  {monthLabels.map(m => (
                    <button key={m.offset} onClick={() => setSelectedMonthOffset(m.offset)} className={`px-4 py-1.5 rounded-lg text-[10px] font-black ${selectedMonthOffset === m.offset ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>
                      {m.name}
                    </button>
                  ))}
                </div>
              </div>

              {aiInsight && (
                <div className="bg-indigo-600 text-white p-5 rounded-3xl shadow-xl animate-in fade-in slide-in-from-top-4 duration-500">
                  <p className="font-bold text-indigo-200 text-[10px] uppercase mb-1">AI 建議</p>
                  <p className="font-medium leading-relaxed">{aiInsight}</p>
                </div>
              )}

              <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden divide-y divide-slate-50">
                {stats.filteredList.length === 0 ? (
                  <div className="p-20 text-center text-slate-300 font-bold uppercase tracking-widest">尚無成交紀錄</div>
                ) : (
                  stats.filteredList.map(t => (
                    <div key={t.id} onClick={() => setExpandedTx(expandedTx === t.id ? null : t.id)} className="p-5 hover:bg-slate-50/50 transition-colors cursor-pointer group">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4 flex-1">
                          <div className={`p-4 rounded-2xl ${t.paymentMethod === 'leke' ? 'bg-orange-100 text-orange-600' : t.paymentMethod === 'mobile' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                            {t.paymentMethod === 'cash' ? <Banknote size={24}/> : t.paymentMethod === 'leke' ? <Users size={24}/> : <Smartphone size={24}/>}
                          </div>
                          <div className="min-w-0">
                             <p className="font-black text-slate-800 text-xl leading-none">NT$ {t.total.toLocaleString()}</p>
                             <p className="text-[10px] text-slate-400 font-bold uppercase mt-2">{new Date(t.timestamp).toLocaleString()} • {t.paymentMethod === 'leke' ? '樂客' : '現金'}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4">
                           <button 
                              onClick={(e) => deleteTransaction(t.id, e)}
                              className="w-14 h-14 flex items-center justify-center bg-red-600 text-white rounded-2xl hover:bg-red-700 transition-all active:scale-90 shadow-lg shadow-red-100"
                           >
                              <Trash2 size={24} strokeWidth={2.5} />
                           </button>
                           <div className="text-slate-300">{expandedTx === t.id ? <ChevronUp size={24}/> : <ChevronDown size={24}/>}</div>
                        </div>
                      </div>

                      {expandedTx === t.id && (
                        <div className="mt-5 pt-5 border-t border-slate-100 space-y-3 animate-in slide-in-from-top-2">
                          {t.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between text-sm pr-20">
                              <span className="text-slate-600 font-medium">{item.name} x{item.quantity}</span>
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
              <div className="flex-1 p-6 overflow-y-auto">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {INITIAL_PRODUCTS.map(product => (
                    <button key={product.id} onClick={() => addToCart(product)} className={`p-4 rounded-[2rem] border text-center flex flex-col items-center justify-between min-h-[170px] active:scale-95 transition-all cursor-pointer ${product.name ? 'bg-white border-white shadow-sm hover:border-indigo-100' : 'bg-slate-100 border-dashed border-slate-200 opacity-40'}`}>
                      {product.name ? (
                        <>
                          <div className="w-full aspect-square rounded-2xl overflow-hidden mb-3 bg-slate-50">
                             <img src={product.image || 'https://images.unsplash.com/photo-1541167760496-1628856ab752?w=100'} className="w-full h-full object-cover" alt={product.name} />
                          </div>
                          <div className="w-full">
                            <h3 className="font-black text-slate-700 text-xs truncate mb-1">{product.name}</h3>
                            <p className="text-[10px] font-black text-indigo-600 mono">NT$ {product.price}</p>
                          </div>
                        </>
                      ) : (
                        <div className="flex items-center justify-center h-full text-slate-200"><Plus size={32} /></div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="w-full md:w-80 lg:w-96 bg-white border-l border-slate-100 flex flex-col shadow-2xl">
                 <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
                    <h2 className="font-black text-slate-800 flex items-center gap-2"><ShoppingCart size={20} className="text-indigo-600"/> 點單清單</h2>
                    <button onClick={() => setCart([])} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={20}/></button>
                 </div>
                 <div className="flex-1 overflow-y-auto p-5 space-y-3">
                   {cart.length === 0 ? (
                     <div className="h-full flex flex-col items-center justify-center text-slate-200 gap-4 opacity-40">
                       <Receipt size={48} /><p className="text-sm font-black uppercase tracking-widest">等待點單</p>
                     </div>
                   ) : (
                     cart.map(item => (
                       <div key={item.id} className="flex gap-4 items-center bg-slate-50 p-4 rounded-2xl border border-transparent hover:border-slate-100 transition-all">
                         <div className="flex-1 min-w-0">
                           <h4 className="font-black text-slate-800 text-sm truncate">{item.name}</h4>
                           <p className="text-[10px] text-slate-400 font-black mono mt-0.5">NT$ {item.price}</p>
                         </div>
                         <div className="flex items-center gap-2 bg-white rounded-xl border border-slate-100 p-1 shadow-sm">
                           <button onClick={() => updateQuantity(item.id, -1)} className="p-1 text-slate-400 hover:text-slate-900"><Minus size={16}/></button>
                           <span className="font-black text-slate-800 text-xs w-7 text-center">{item.quantity}</span>
                           <button onClick={() => updateQuantity(item.id, 1)} className="p-1 text-slate-400 hover:text-slate-900"><Plus size={16}/></button>
                         </div>
                       </div>
                     ))
                   )}
                 </div>
                 <div className="p-8 bg-slate-900 text-white rounded-t-[3rem] shadow-2xl">
                    <div className="flex justify-between items-end mb-6">
                      <span className="text-slate-500 font-bold text-xs uppercase tracking-widest">總金額</span>
                      <span className="text-4xl font-black mono text-indigo-400">NT$ {subtotal.toLocaleString()}</span>
                    </div>
                    <button disabled={cart.length === 0} onClick={() => setShowCheckoutModal(true)} className="w-full bg-indigo-500 hover:bg-indigo-400 disabled:opacity-20 py-5 rounded-2xl font-black text-xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-3 cursor-pointer">
                      結帳結算 <ChevronRight size={28} />
                    </button>
                 </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {showCheckoutModal && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in duration-200">
            {isCheckoutSuccess ? (
              <div className="p-12 text-center space-y-8">
                <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner"><CheckCircle2 size={56} /></div>
                <h3 className="text-3xl font-black text-slate-800">交易完成</h3>
                <div className="bg-slate-50 p-8 rounded-[2rem] text-left border border-slate-100">
                   <div className="flex justify-between text-emerald-600 text-3xl font-black"><span className="text-sm text-slate-400 font-bold uppercase tracking-widest">找零</span><span className="mono">NT$ {lastTransaction?.changeAmount}</span></div>
                </div>
                <button onClick={finalCompletion} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-xl active:scale-95 transition-all shadow-xl">關閉視窗</button>
              </div>
            ) : (
              <div className="flex flex-col">
                <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
                   <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">應收總計</p><h3 className="text-4xl font-black text-indigo-600 mono leading-none">NT$ {subtotal.toLocaleString()}</h3></div>
                   <button onClick={() => setShowCheckoutModal(false)} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><X size={32} /></button>
                </div>
                <div className="p-8 space-y-6">
                  {!selectedPayment ? (
                    <div className="grid gap-4">
                      <button onClick={() => setSelectedPayment('cash')} className="w-full flex items-center gap-5 p-6 rounded-3xl bg-indigo-600 text-white shadow-xl hover:bg-indigo-500 active:scale-95 transition-all">
                        <Banknote size={32}/> <span className="font-black text-2xl">現金支付</span>
                      </button>
                      <button onClick={() => setSelectedPayment('leke')} className="w-full flex items-center gap-5 p-6 rounded-3xl bg-orange-500 text-white shadow-xl hover:bg-orange-600 active:scale-95 transition-all">
                        <Users size={32}/> <span className="font-black text-2xl">樂客轉帳</span>
                      </button>
                      <button onClick={() => setSelectedPayment('mobile')} className="w-full flex items-center gap-5 p-6 rounded-3xl bg-emerald-500 text-white shadow-xl hover:bg-emerald-600 active:scale-95 transition-all">
                        <Smartphone size={32}/> <span className="font-black text-2xl">行動支付</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-6 animate-in slide-in-from-bottom-4">
                       {selectedPayment === 'cash' ? (
                         <>
                           <div className="space-y-3">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">輸入實收金額</p>
                              <input autoFocus type="number" placeholder="0" value={cashReceived} onChange={(e) => setCashReceived(e.target.value)} className="w-full px-8 py-5 bg-slate-50 rounded-[2rem] text-4xl font-black mono outline-none border-4 border-transparent focus:border-indigo-500 focus:bg-white transition-all shadow-inner" />
                           </div>
                           <div className="flex justify-between items-center px-4">
                              <span className="font-bold text-slate-400 text-sm uppercase">應找零</span>
                              <span className={`text-4xl font-black mono ${parseFloat(cashReceived) >= subtotal ? 'text-emerald-500' : 'text-slate-200'}`}>NT$ {Math.max(0, (parseFloat(cashReceived) || 0) - subtotal).toLocaleString()}</span>
                           </div>
                           <button onClick={handleCheckout} disabled={!cashReceived || parseFloat(cashReceived) < subtotal} className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black text-2xl shadow-xl disabled:opacity-20 active:scale-95 transition-all">確認入帳</button>
                         </>
                       ) : (
                         <div className="text-center py-6 space-y-6">
                            <div className="p-8 bg-slate-50 rounded-[3rem] border-2 border-indigo-100 flex flex-col items-center">
                               <QrCode size={140} className="text-slate-800 mb-6" />
                               <p className="font-black text-2xl text-slate-800">等待掃碼支付</p>
                               <p className="text-indigo-600 font-bold mono mt-2">NT$ {subtotal}</p>
                            </div>
                            <button onClick={handleCheckout} className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black text-2xl shadow-xl active:scale-95 transition-all">確認收款</button>
                         </div>
                       )}
                       <button onClick={() => {setSelectedPayment(null); setCashReceived('');}} className="w-full py-2 text-slate-400 font-bold text-sm hover:text-slate-600 transition-colors uppercase">變更支付方式</button>
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
