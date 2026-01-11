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
      } catch (e) { 
        console.error("Failed to load transactions", e);
      }
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

  // 刪除單筆紀錄
  const deleteTransaction = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); 
    if (window.confirm('確定要永久刪除這筆交易紀錄嗎？此動作不可撤回。')) {
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
    
    if (isManual && received < subtotal) {
      alert('實收金額不足！');
      return;
    }

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
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden">
      {/* 側邊導航 */}
      <nav className="w-20 md:w-24 bg-slate-900 flex flex-col items-center py-10 gap-8 shadow-2xl z-20">
        <div className="bg-indigo-600 p-3 rounded-2xl text-white shadow-lg mb-4"><LayoutGrid size={28} /></div>
        <button onClick={() => setActiveTab('pos')} className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all cursor-pointer ${activeTab === 'pos' ? 'text-white bg-slate-800' : 'text-slate-500 hover:text-white'}`}>
          <ShoppingCart size={24} /><span className="text-[10px] font-black tracking-tight">點單</span>
        </button>
        <button onClick={() => { setActiveTab('stats'); setShowOnlyLeke(false); }} className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all cursor-pointer ${activeTab === 'stats' ? 'text-white bg-slate-800' : 'text-slate-500 hover:text-white'}`}>
          <BarChart3 size={24} /><span className="text-[10px] font-black tracking-tight">統計</span>
        </button>
      </nav>

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* 頂部營收摘要 */}
        <header className="bg-white border-b border-slate-100 p-6 z-10 shadow-sm min-h-[100px] flex flex-col justify-center">
          {activeTab === 'stats' ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-3xl cursor-pointer" onClick={() => setShowOnlyLeke(false)}>
                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">今日營收</p>
                <h2 className="text-3xl font-black text-indigo-600 mono leading-none">NT$ {stats.today.toLocaleString()}</h2>
              </div>
              <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-3xl cursor-pointer" onClick={() => setShowOnlyLeke(false)}>
                <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">本月營收</p>
                <h2 className="text-3xl font-black text-emerald-600 mono leading-none">NT$ {stats.month.toLocaleString()}</h2>
              </div>
              <button 
                onClick={() => setShowOnlyLeke(!showOnlyLeke)}
                className={`p-4 rounded-3xl text-left border transition-all ${showOnlyLeke ? 'bg-orange-100 border-orange-300 ring-2 ring-orange-100' : 'bg-orange-50 border-orange-100 hover:border-orange-200'}`}
              >
                <div className="flex justify-between items-center mb-1">
                  <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest">樂客轉帳</p>
                  <Users size={16} className="text-orange-400" />
                </div>
                <h2 className="text-3xl font-black text-orange-600 mono leading-none">NT$ {stats.filterMonthLeke.toLocaleString()}</h2>
              </button>
            </div>
          ) : (
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-black text-slate-800 tracking-tighter">CLOUD POS</h1>
              <div className="flex items-center gap-2 bg-slate-50 px-4 py-1.5 rounded-full border border-slate-100">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">系統運行中</span>
              </div>
            </div>
          )}
        </header>

        <div className="flex-1 relative overflow-hidden">
          {activeTab === 'stats' ? (
            <div className="h-full overflow-y-auto p-6 md:p-8 space-y-8 animate-in fade-in duration-500">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-3 w-full md:w-auto">
                  <h2 className="text-2xl font-black text-slate-800">{showOnlyLeke ? '樂客轉帳歷史紀錄' : '所有交易歷史'}</h2>
                  <div className="flex bg-slate-100 p-1 rounded-xl gap-1 w-full md:w-auto">
                    {monthLabels.map(m => (
                      <button key={m.offset} onClick={() => setSelectedMonthOffset(m.offset)} className={`flex-1 md:flex-none px-4 py-2 rounded-lg font-black text-xs transition-all ${selectedMonthOffset === m.offset ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                        {m.name}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <button onClick={fetchAiInsights} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg active:scale-95 transition-all">
                        {isAiLoading ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />} AI 經營分析
                    </button>
                </div>
              </div>

              {aiInsight && (
                <div className="bg-indigo-600 text-white p-6 rounded-3xl shadow-xl">
                  <p className="font-black text-indigo-200 mb-2 uppercase tracking-widest text-[10px]">AI 顧問建議</p>
                  <p className="text-white leading-relaxed whitespace-pre-wrap font-medium">{aiInsight}</p>
                </div>
              )}

              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden divide-y divide-slate-50">
                {stats.filteredList.length === 0 ? (
                  <div className="p-20 text-center text-slate-300 font-black uppercase tracking-widest flex flex-col items-center gap-4">
                      <Receipt size={48} />
                      目前尚無數據
                  </div>
                ) : (
                  stats.filteredList.map(t => (
                    <div key={t.id} onClick={() => setExpandedTx(expandedTx === t.id ? null : t.id)} className="p-4 hover:bg-slate-50 transition-colors cursor-pointer group">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4 flex-1">
                          <div className={`p-3 rounded-xl flex-shrink-0 ${t.paymentMethod === 'leke' ? 'bg-orange-100 text-orange-600' : t.paymentMethod === 'mobile' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                            {t.paymentMethod === 'cash' ? <Banknote size={20}/> : t.paymentMethod === 'leke' ? <Users size={20}/> : <Smartphone size={20}/>}
                          </div>
                          <div className="min-w-0">
                             <p className="font-black text-slate-800 text-lg leading-tight">NT$ {t.total.toLocaleString()}</p>
                             <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5 truncate">{new Date(t.timestamp).toLocaleString()} • {t.paymentMethod === 'leke' ? '樂客' : t.paymentMethod === 'cash' ? '現金' : '行動'}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                            <button 
                                onClick={(e) => deleteTransaction(t.id, e)}
                                className="w-10 h-10 flex items-center justify-center bg-red-50 text-red-500 rounded-xl border border-red-100 hover:bg-red-500 hover:text-white transition-all active:scale-90"
                                title="刪除此筆交易"
                            >
                                <Trash2 size={18} />
                            </button>
                            <div className="text-slate-300">{expandedTx === t.id ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}</div>
                        </div>
                      </div>

                      {expandedTx === t.id && (
                        <div className="mt-4 pt-4 border-t border-slate-100 space-y-2 animate-in slide-in-from-top-2">
                          {t.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between text-sm pr-4">
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
            <div className="flex flex-col md:flex-row h-full">
              {/* 商品列表區 */}
              <div className="flex-1 p-6 overflow-y-auto">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {INITIAL_PRODUCTS.map(product => (
                    <button key={product.id} onClick={() => addToCart(product)} className={`group rounded-3xl p-4 border shadow-sm active:scale-95 transition-all text-center flex flex-col items-center justify-between min-h-[180px] cursor-pointer ${product.name ? 'bg-white border-white hover:border-indigo-100' : 'bg-slate-100/30 border-dashed border-slate-200 opacity-40'}`}>
                      {product.name ? (
                        <>
                          <div className="w-full aspect-square rounded-2xl overflow-hidden mb-3 bg-slate-50">
                             <img src={product.image || 'https://images.unsplash.com/photo-1541167760496-1628856ab752?w=100'} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={product.name} />
                          </div>
                          <div className="w-full">
                            <h3 className="font-black text-slate-700 text-xs truncate px-1">{product.name}</h3>
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

              {/* 購物車區 */}
              <div className="w-full md:w-80 lg:w-[360px] bg-white border-l border-slate-100 flex flex-col shadow-xl">
                <div className="p-5 border-b border-slate-50 flex justify-between items-center bg-slate-50/20">
                  <h2 className="font-black text-slate-800 flex items-center gap-2 uppercase tracking-tighter text-base">
                    <ShoppingCart size={20} className="text-indigo-600" /> 當前點單
                  </h2>
                  <button onClick={() => setCart([])} className="text-slate-300 hover:text-red-500 transition-colors cursor-pointer p-1">
                    <Trash2 size={20} />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {cart.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-200 gap-4 opacity-40">
                      <Receipt size={40} /><p className="text-sm font-black uppercase tracking-widest">待單中</p>
                    </div>
                  ) : (
                    cart.map(item => (
                      <div key={item.id} className="flex gap-3 items-center bg-slate-50/50 p-3 rounded-2xl border border-transparent hover:border-slate-100 transition-all">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-black text-slate-800 text-sm truncate">{item.name}</h4>
                          <p className="text-[10px] text-slate-400 font-black mono mt-0.5">NT$ {item.price}</p>
                        </div>
                        <div className="flex items-center gap-1 bg-white rounded-xl border border-slate-100 p-1">
                          <button onClick={() => updateQuantity(item.id, -1)} className="p-1"><Minus size={14}/></button>
                          <span className="font-black text-slate-800 text-xs w-7 text-center">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.id, 1)} className="p-1"><Plus size={14}/></button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="p-6 bg-slate-900 text-white md:rounded-t-[2.5rem] shadow-2xl">
                  <div className="flex justify-between items-end mb-4 px-2">
                    <span className="text-slate-500 font-black text-[10px] uppercase tracking-widest">總計</span>
                    <span className="text-3xl font-black mono text-indigo-400 leading-none">NT$ {subtotal.toLocaleString()}</span>
                  </div>
                  <button disabled={cart.length === 0} onClick={() => setShowCheckoutModal(true)} className="w-full bg-indigo-500 hover:bg-indigo-400 disabled:bg-slate-800 py-4 rounded-2xl font-black text-xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer">
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
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-xl z-[100] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-md rounded-[3.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            {isCheckoutSuccess ? (
              <div className="p-10 text-center space-y-8">
                <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner"><CheckCircle2 size={56} /></div>
                <h3 className="text-3xl font-black text-slate-800 tracking-tight">交易完成</h3>
                <div className="bg-slate-50 p-6 rounded-[2.5rem] text-left border border-slate-100">
                   <div className="flex justify-between text-emerald-600 text-3xl font-black"><span className="text-base text-slate-400">找零金額</span><span className="mono">NT$ {lastTransaction?.changeAmount}</span></div>
                </div>
                <button onClick={finalCompletion} className="w-full bg-slate-900 text-white py-4 rounded-3xl font-black text-xl active:scale-95 transition-all cursor-pointer shadow-xl">完成交易</button>
              </div>
            ) : (
              <div className="flex flex-col">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                   <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">應付金額</p><h3 className="text-4xl font-black text-indigo-600 mono leading-none">NT$ {subtotal.toLocaleString()}</h3></div>
                   <button onClick={() => { setShowCheckoutModal(false); setSelectedPayment(null); }} className="p-2 text-slate-300 hover:text-red-500 cursor-pointer"><X size={32} /></button>
                </div>
                <div className="p-6 space-y-6">
                  {!selectedPayment ? (
                    <div className="grid gap-4">
                      <button onClick={() => setSelectedPayment('cash')} className="w-full flex items-center gap-4 p-5 rounded-[2.5rem] bg-indigo-600 text-white shadow-xl hover:bg-indigo-500 active:scale-95 transition-all cursor-pointer group">
                        <div className="p-3 bg-white/20 rounded-2xl group-hover:scale-110 transition-transform"><Banknote size={32}/></div>
                        <div className="text-left"><p className="font-black text-2xl tracking-tight leading-tight">現金支付</p><p className="text-[10px] text-white/70 font-bold uppercase tracking-widest">Cash Payment</p></div>
                      </button>
                      <div className="grid grid-cols-2 gap-4">
                        <button onClick={() => setSelectedPayment('mobile')} className="flex flex-col items-center gap-2 p-5 rounded-[2rem] bg-slate-50 hover:bg-emerald-50 border border-transparent hover:border-emerald-200 transition-all cursor-pointer group">
                          <div className="p-3 bg-white text-emerald-600 rounded-2xl group-hover:scale-110 transition-transform shadow-sm"><Smartphone size={28}/></div>
                          <p className="font-black text-slate-800 text-lg">行動支付</p>
                        </button>
                        <button onClick={() => setSelectedPayment('leke')} className="flex flex-col items-center gap-2 p-5 rounded-[2rem] bg-orange-50 hover:bg-orange-100 border border-transparent hover:border-orange-200 transition-all cursor-pointer group">
                          <div className="p-3 bg-white text-orange-600 rounded-2xl group-hover:scale-110 transition-transform shadow-sm"><Users size={28}/></div>
                          <p className="font-black text-slate-800 text-lg">樂客轉帳</p>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                       {selectedPayment === 'leke' || selectedPayment === 'mobile' ? (
                         <div className="text-center space-y-4 py-2">
                            <div className={`p-6 rounded-3xl border-2 ${selectedPayment === 'mobile' ? 'bg-emerald-50 border-emerald-100' : 'bg-orange-50 border-orange-100'}`}>
                               {selectedPayment === 'mobile' ? (
                                 <div className="space-y-3 flex flex-col items-center">
                                    <div className="p-4 bg-white rounded-3xl shadow-sm border border-emerald-50 mb-1 animate-pulse"><QrCode size={100} className="text-emerald-500" /></div>
                                    <p className="text-emerald-600 font-black text-xl">請客人掃描付款</p>
                                    <p className="text-emerald-400 font-bold text-xs uppercase tracking-widest">NT$ {subtotal}</p>
                                 </div>
                               ) : (
                                 <p className="text-orange-600 font-black text-lg py-10">請確認收訖轉帳金額 NT$ {subtotal}</p>
                               )}
                            </div>
                            <div className="flex gap-3">
                              <button onClick={() => setSelectedPayment(null)} className="flex-1 py-3 font-black text-slate-400 cursor-pointer">返回</button>
                              <button onClick={handleCheckout} className={`flex-[2] text-white py-3 rounded-2xl font-black text-xl shadow-xl ${selectedPayment === 'mobile' ? 'bg-emerald-500' : 'bg-orange-500'} cursor-pointer active:scale-95 transition-all`}>確認收錢</button>
                            </div>
                         </div>
                       ) : (
                         <>
                           <div className="space-y-2">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">實收金額</p>
                              <input autoFocus type="number" placeholder="0" value={cashReceived} onChange={(e) => setCashReceived(e.target.value)} className="w-full px-6 py-4 bg-slate-50 rounded-[1.5rem] text-4xl font-black mono outline-none border-2 border-transparent focus:border-indigo-500 focus:bg-white transition-all shadow-inner" />
                           </div>
                           <div className="flex justify-between items-center px-4">
                              <span className="font-black text-slate-400 uppercase tracking-widest text-xs">應找金額</span>
                              <span className={`text-4xl font-black mono ${parseFloat(cashReceived) >= subtotal ? 'text-emerald-500' : 'text-slate-200'}`}>NT$ {Math.max(0, (parseFloat(cashReceived) || 0) - subtotal).toLocaleString()}</span>
                           </div>
                           <div className="flex gap-3 pt-2">
                              <button onClick={() => {setSelectedPayment(null); setCashReceived('');}} className="flex-1 py-3 font-black text-slate-400 hover:text-slate-600 cursor-pointer text-base">取消</button>
                              <button onClick={handleCheckout} disabled={!cashReceived || parseFloat(cashReceived) < subtotal} className="flex-[2] bg-indigo-600 text-white py-3 rounded-2xl font-black text-xl shadow-lg disabled:opacity-20 active:scale-95 transition-all cursor-pointer">確認收錢</button>
                           </div>
                         </>
                       )}
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
