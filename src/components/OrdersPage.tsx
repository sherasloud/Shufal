import React, { useState, useEffect } from 'react';
import { auth, db } from '../lib/firebase';
import { collection, query, where, orderBy, onSnapshot, doc, runTransaction, increment, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { ShoppingBag, Package, CheckCircle, RefreshCw, Clock, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Order } from '../types';

export default function OrdersPage() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [buyerOrders, setBuyerOrders] = useState<Order[]>([]);
  const [sellerOrders, setSellerOrders] = useState<Order[]>([]);
  const [orderTab, setOrderTab] = useState<'purchases' | 'sales'>('purchases');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const qBuyer = query(
      collection(db, 'orders'),
      where('buyerId', '==', user.uid),
      orderBy('timestamp', 'desc')
    );

    const qSeller = query(
      collection(db, 'orders'),
      where('sellerId', '==', user.uid),
      orderBy('timestamp', 'desc')
    );

    const unsubBuyer = onSnapshot(qBuyer, (snapshot) => {
      setBuyerOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)));
      setLoading(false);
    });

    const unsubSeller = onSnapshot(qSeller, (snapshot) => {
      setSellerOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)));
    });

    return () => {
      unsubBuyer();
      unsubSeller();
    };
  }, [user]);

  const handleReleasePayment = async (order: Order) => {
    if (!user) return;
    if (!confirm(`আপনি কি "${order.productName}" এর পণ্যটি সঠিকভাবে হাতে পেয়েছেন?\n\n'হ্যাঁ' চাপলে বিক্রেতার ওয়ালেটে ৳${order.totalPrice} জমা হয়ে যাবে।`)) {
      return;
    }

    setActionLoading(order.id);
    try {
      await runTransaction(db, async (transaction) => {
        const orderRef = doc(db, 'orders', order.id);
        const sellerRef = doc(db, 'users', order.sellerId);
        const sellerTxRef = doc(collection(db, 'users', order.sellerId, 'transactions'));

        const orderSnap = await transaction.get(orderRef);
        if (!orderSnap.exists()) {
          throw new Error('অর্ডারটি পাওয়া যায়নি।');
        }
        if (orderSnap.data()?.status !== 'pending') {
          throw new Error('এই অর্ডারটির পেমেন্ট ইতিমধ্যে সম্পন্ন বা বাতিল করা হয়েছে।');
        }

        // Update Order
        transaction.update(orderRef, { status: 'completed' });

        // Credit Seller Wallet
        transaction.update(sellerRef, {
          walletBalance: increment(order.totalPrice)
        });

        // Add Seller Transaction
        transaction.set(sellerTxRef, {
          userId: order.sellerId,
          amount: order.totalPrice,
          type: 'credit',
          description: `${order.productName} বিক্রয়ের টাকা ওয়ালেটে জমা হয়েছে (Escrow Released)`,
          timestamp: serverTimestamp()
        });
      });

      alert('ধন্যবাদ! বিক্রেতার ওয়ালেটে টাকা জমা করা হয়েছে।');
    } catch (error: any) {
      console.error("Release payment error:", error);
      alert(error.message || 'টাকা রিলিজ করতে সমস্যা হয়েছে।');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRefundOrder = async (order: Order) => {
    if (!user) return;
    if (!confirm(`আপনি কি "${order.productName}" অর্ডারটি বাতিল করে টাকা রিফান্ড নিতে চান?`)) {
      return;
    }

    setActionLoading(order.id);
    try {
      await runTransaction(db, async (transaction) => {
        const orderRef = doc(db, 'orders', order.id);
        const buyerRef = doc(db, 'users', user.uid);
        const productRef = doc(db, 'products', order.productId);
        const buyerTxRef = doc(collection(db, 'users', user.uid, 'transactions'));

        const orderSnap = await transaction.get(orderRef);
        if (!orderSnap.exists()) {
          throw new Error('অর্ডারটি পাওয়া যায়নি।');
        }
        if (orderSnap.data()?.status !== 'pending') {
          throw new Error('এই অর্ডারটির পেমেন্ট ইতিমধ্যে সম্পন্ন বা রিফান্ড করা হয়েছে।');
        }

        // Update Order to refunded
        transaction.update(orderRef, { status: 'refunded' });

        // Refund Buyer Wallet
        transaction.update(buyerRef, {
          walletBalance: increment(order.totalPrice)
        });

        // Restore Product Stock if product exists
        const productSnap = await transaction.get(productRef);
        if (productSnap.exists()) {
          transaction.update(productRef, {
            stock: increment(order.quantity)
          });
        }

        // Add Buyer Transaction
        transaction.set(buyerTxRef, {
          userId: user.uid,
          amount: order.totalPrice,
          type: 'credit',
          description: `${order.productName} অর্ডারের টাকা ওয়ালেটে ফেরত দেওয়া হয়েছে (Refund)`,
          timestamp: serverTimestamp()
        });
      });

      alert(`অর্ডার বাতিল করা হয়েছে এবং ৳${order.totalPrice} আপনার ওয়ালেটে ফেরত দেওয়া হয়েছে।`);
    } catch (error: any) {
      console.error("Refund error:", error);
      alert(error.message || 'রিফান্ড করতে সমস্যা হয়েছে।');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm text-center max-w-sm">
          <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">আপনি লগইন করেননি</h2>
          <p className="text-slate-500 mb-6">আপনার অর্ডারসমূহ দেখতে দয়া করে লগইন করুন।</p>
          <button 
            onClick={() => navigate('/')}
            className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold"
          >
            হোম পেজে ফিরে যান
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="bg-emerald-50 p-3 rounded-2xl">
            <ShoppingBag className="w-7 h-7 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
              আমার অর্ডারসমূহ
              <span className="text-xs bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-bold">
                Escrow সুরক্ষিত
              </span>
            </h1>
            <p className="text-xs text-slate-500">ক্রয় এবং বিক্রয় সম্পর্কিত সকল তথ্য ও স্টেটাস</p>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex bg-slate-100 p-1 rounded-2xl">
          <button 
            onClick={() => setOrderTab('purchases')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              orderTab === 'purchases' 
                ? 'bg-white text-emerald-700 shadow-sm' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            আমার ক্রয়সমূহ ({buyerOrders.length})
          </button>
          <button 
            onClick={() => setOrderTab('sales')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              orderTab === 'sales' 
                ? 'bg-white text-emerald-700 shadow-sm' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            আমার বিক্রয়সমূহ ({sellerOrders.length})
          </button>
        </div>
      </div>

      {/* Orders List */}
      {orderTab === 'purchases' ? (
        <div className="space-y-4">
          {buyerOrders.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl border border-dashed border-slate-200 text-center space-y-3">
              <Package className="w-12 h-12 text-slate-300 mx-auto" />
              <p className="text-slate-500 font-bold">আপনার এখনো কোনো ক্রয়কৃত অর্ডার নেই।</p>
              <button 
                onClick={() => navigate('/')}
                className="inline-block bg-emerald-600 text-white px-5 py-2.5 rounded-2xl text-xs font-bold"
              >
                পণ্য বাজার দেখুন
              </button>
            </div>
          ) : (
            buyerOrders.map(order => (
              <div key={order.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="bg-emerald-50 p-3 rounded-2xl shrink-0">
                      <Package className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-base">{order.productName}</h4>
                      <p className="text-xs text-slate-500">পরিমাণ: {order.quantity} | মোট মূল্য: ৳{order.totalPrice}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {order.timestamp?.toDate?.().toLocaleString('bn-BD') || 'তারিখ অপ্রাপ্য'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-black uppercase tracking-wider px-3 py-1.5 rounded-full ${
                      order.status === 'completed' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 
                      order.status === 'refunded' ? 'bg-rose-100 text-rose-700 border border-rose-200' : 
                      'bg-amber-100 text-amber-800 border border-amber-200'
                    }`}>
                      {order.status === 'completed' ? '🟢 সফল (টাকা রিলিজ করা হয়েছে)' : 
                       order.status === 'refunded' ? '🔴 অর্ডার বাতিল ও রিফান্ডকৃত' : 
                       '🟡 প্রক্রিয়াধীন (Escrow এ সংরক্ষিত)'}
                    </span>
                  </div>
                </div>

                {order.status === 'pending' && (
                  <div className="bg-amber-50/90 border border-amber-200 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="text-xs font-bold text-amber-900">
                      ⚠️ <span className="underline">product hatee peyei Released e click korben</span>
                      <p className="text-[11px] font-normal text-amber-700/90 mt-0.5">
                        পণ্য সঠিক থাকলে 'Released' বাটনে চাপ দিলে বিক্রেতা টাকা পাবেন।
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button 
                        disabled={actionLoading === order.id}
                        onClick={() => handleReleasePayment(order)}
                        className="bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-emerald-700 transition-all shadow-md active:scale-95 disabled:opacity-50"
                      >
                        {actionLoading === order.id ? 'প্রসেসিং...' : 'পণ্য গ্রহণ করেছি (Released)'}
                      </button>
                      <button 
                        disabled={actionLoading === order.id}
                        onClick={() => handleRefundOrder(order)}
                        className="bg-rose-100 text-rose-700 border border-rose-200 px-3 py-2.5 rounded-xl text-xs font-bold hover:bg-rose-200 transition-all disabled:opacity-50"
                      >
                        টাকা ফেরত নিন
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {sellerOrders.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl border border-dashed border-slate-200 text-center space-y-3">
              <Package className="w-12 h-12 text-slate-300 mx-auto" />
              <p className="text-slate-500 font-bold">আপনার কোনো বিক্রয়কৃত অর্ডার নেই।</p>
            </div>
          ) : (
            sellerOrders.map(order => (
              <div key={order.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="bg-blue-50 p-3 rounded-2xl shrink-0">
                    <Package className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-base">{order.productName}</h4>
                    <p className="text-xs text-slate-500">ক্রেতা: {order.buyerName} | পরিমাণ: {order.quantity} | মোট: ৳{order.totalPrice}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {order.timestamp?.toDate?.().toLocaleString('bn-BD') || 'তারিখ অপ্রাপ্য'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {order.status === 'pending' ? (
                    <div className="text-right">
                      <span className="text-xs font-black bg-amber-100 text-amber-800 px-3 py-1.5 rounded-full border border-amber-200">
                        🟡 ক্রেতার পণ্য গ্রহণের অপেক্ষায়
                      </span>
                      <p className="text-[10px] text-slate-500 mt-1">
                        ক্রেতা 'Released' দিলে ৳{order.totalPrice} ওয়ালেটে জমা হবে
                      </p>
                    </div>
                  ) : order.status === 'completed' ? (
                    <span className="text-xs font-black bg-emerald-100 text-emerald-800 px-3 py-1.5 rounded-full border border-emerald-200">
                      🟢 টাকা ওয়ালেটে জমা হয়েছে (৳{order.totalPrice})
                    </span>
                  ) : (
                    <span className="text-xs font-black bg-rose-100 text-rose-800 px-3 py-1.5 rounded-full border border-rose-200">
                      🔴 বাতিল করা হয়েছে
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
