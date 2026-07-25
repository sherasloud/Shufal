import React, { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { motion } from 'motion/react';
import { User, Mail, Shield, LogOut, Package, MessageSquare, Gavel, TrendingUp, CreditCard, ShoppingBag } from 'lucide-react';
import { signOut, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { useNavigate, useLocation } from 'react-router-dom';
import { doc, getDoc, updateDoc, onSnapshot, collection, query, where, orderBy, runTransaction, increment, serverTimestamp } from 'firebase/firestore';
import { UserProfile, UserRole, Order } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import WalletComponent from './Wallet';

const ADMIN_EMAILS = ['shufalharvest@gmail.com', 'shustobd@gmail.com'];

export default function Profile() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [buyerOrders, setBuyerOrders] = useState<Order[]>([]);
  const [sellerOrders, setSellerOrders] = useState<Order[]>([]);
  const [orderTab, setOrderTab] = useState<'purchases' | 'sales'>('purchases');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.hash === '#wallet' || (location.state as any)?.section === 'wallet') {
      const el = document.getElementById('wallet-section');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    } else if (location.hash === '#orders' || (location.state as any)?.section === 'orders') {
      const el = document.getElementById('orders-section');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  }, [location]);

  const isAdminUser = user?.email && ADMIN_EMAILS.includes(user.email);

  useEffect(() => {
    let unsubscribeProfile: () => void = () => {};
    let unsubscribeBuyerOrders: () => void = () => {};
    let unsubscribeSellerOrders: () => void = () => {};

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const docRef = doc(db, 'users', currentUser.uid);
        unsubscribeProfile = onSnapshot(docRef, (docSnap) => {
          if (docSnap.exists()) {
            setProfile(docSnap.data() as UserProfile);
          }
        });

        // Query buyer orders
        const buyerQuery = query(
          collection(db, 'orders'),
          where('buyerId', '==', currentUser.uid),
          orderBy('timestamp', 'desc')
        );
        unsubscribeBuyerOrders = onSnapshot(buyerQuery, (snapshot) => {
          setBuyerOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)));
          setLoading(false);
        }, (error) => {
          console.error("Buyer orders list error:", error);
          setLoading(false);
        });

        // Query seller orders
        const sellerQuery = query(
          collection(db, 'orders'),
          where('sellerId', '==', currentUser.uid),
          orderBy('timestamp', 'desc')
        );
        unsubscribeSellerOrders = onSnapshot(sellerQuery, (snapshot) => {
          setSellerOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)));
        }, (error) => {
          console.error("Seller orders list error:", error);
        });

      } else {
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      unsubscribeProfile();
      unsubscribeBuyerOrders();
      unsubscribeSellerOrders();
    };
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
  };

  const handleReleasePayment = async (order: Order) => {
    if (!user) return;
    if (!confirm(`আপনি কি '${order.productName}' পণ্যটি সঠিক অবস্থায় বুঝে পেয়েছেন?\n\nক্লিক করলে ৳${order.totalPrice} বিক্রেতার ওয়ালেটে স্থানান্তরিত হবে।`)) {
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
          throw new Error('এই অর্ডারটির পেমেন্ট ইতিমধ্যে সম্পন্ন বা রিফান্ড করা হয়েছে।');
        }

        // Update Order to completed
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
          description: `${order.productName} বিক্রির টাকা ওয়ালেটে যোগ করা হয়েছে (Released by Buyer)`,
          timestamp: serverTimestamp()
        });
      });

      alert(`ধন্যবাদ! বিক্রেতার ওয়ালেটে ৳${order.totalPrice} সফলভাবে জমা করা হয়েছে।`);
    } catch (error: any) {
      console.error("Payment release error:", error);
      alert(error.message || 'পেমেন্ট রিলিজ করতে ব্যর্থ হয়েছে।');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRefundOrder = async (order: Order) => {
    if (!user) return;
    if (!confirm(`আপনি কি '${order.productName}' এর অর্ডারটি বাতিল করতে চান?\n\n৳${order.totalPrice} আপনার ওয়ালেটে ফেরত দেওয়া হবে।`)) {
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

  const updateRole = async (newRole: UserRole) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), { role: newRole });
      setProfile(prev => prev ? { ...prev, role: newRole } : null);
      alert('আপনার রোল সফলভাবে আপডেট করা হয়েছে!');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm text-center max-w-sm">
          <User className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">আপনি লগইন করেননি</h2>
          <p className="text-slate-500 mb-6">আপনার প্রোফাইল দেখতে দয়া করে লগইন করুন।</p>
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
    <div className="max-w-4xl mx-auto space-y-8">
      <header className="relative h-48 bg-emerald-600 rounded-3xl overflow-hidden shadow-lg">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-emerald-500/50 to-transparent"></div>
      </header>

      <div className="px-8 -mt-20 relative">
        <div className="bg-white rounded-3xl p-8 shadow-xl border border-slate-100">
          <div className="flex flex-col md:flex-row items-center md:items-end gap-6 mb-8">
            <div className="relative">
              <img 
                src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`} 
                alt={user.displayName || 'User'} 
                className="w-32 h-32 rounded-3xl border-4 border-white shadow-lg bg-white"
              />
              <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white p-2 rounded-xl shadow-lg border-2 border-white">
                <Shield className="w-5 h-5" />
              </div>
            </div>
            <div className="text-center md:text-left flex-1">
              <h1 className="text-3xl font-black text-slate-900 mb-1">
                {user.displayName || 'কৃষক বন্ধু'}
              </h1>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                <p className="text-slate-500 flex items-center">
                  <Mail className="w-4 h-4 mr-2" />
                  {user.email}
                </p>
                <div className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter border border-emerald-200">
                  {profile?.role === 'farmer' ? 'কৃষক' : profile?.role === 'trader' ? 'ব্যবসায়ী' : profile?.role === 'admin' ? 'অ্যাডমিন' : 'ক্রেতা'}
                </div>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="flex items-center space-x-2 text-red-500 font-bold hover:bg-red-50 px-4 py-2 rounded-xl transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span>লগআউট</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-slate-100">

            {isAdminUser && (
              <div className="md:col-span-2">
                <button 
                  onClick={() => navigate('/admin')}
                  className="w-full flex items-center justify-center p-4 bg-purple-50 text-purple-700 rounded-2xl border border-purple-100 font-bold hover:bg-purple-100 transition-colors mb-4"
                >
                  <Shield className="w-5 h-5 mr-2" />
                  অ্যাডমিন প্যানেল পরিচালনা করুন
                </button>
              </div>
            )}
            <section id="wallet-section" className="md:col-span-2 scroll-mt-24">
              <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center">
                <CreditCard className="w-6 h-6 mr-3 text-emerald-600" />
                আমার ওয়ালেট
              </h3>
              {profile && <WalletComponent profile={profile} />}
            </section>

            <section id="orders-section" className="md:col-span-2 scroll-mt-24">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <h3 className="text-xl font-black text-slate-900 flex items-center">
                  <ShoppingBag className="w-6 h-6 mr-3 text-emerald-600" />
                  আমার অর্ডারসমূহ (Escrow সুরক্ষা)
                </h3>
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

              {orderTab === 'purchases' ? (
                <div className="space-y-4">
                  {buyerOrders.length === 0 ? (
                    <div className="bg-slate-50 p-10 rounded-3xl border border-dashed border-slate-200 text-center">
                      <p className="text-slate-400 font-medium">আপনার এখনো কোনো ক্রয়কৃত অর্ডার নেই।</p>
                    </div>
                  ) : (
                    buyerOrders.map(order => (
                      <div key={order.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <div className="bg-emerald-50 p-3 rounded-2xl">
                              <Package className="w-6 h-6 text-emerald-600" />
                            </div>
                            <div>
                              <h4 className="font-bold text-slate-900">{order.productName}</h4>
                              <p className="text-xs text-slate-500">পরিমাণ: {order.quantity} | মোট: ৳{order.totalPrice}</p>
                              <p className="text-[10px] text-slate-400">
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
                          <div className="bg-amber-50/80 border border-amber-200 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="text-xs font-bold text-amber-900">
                              ⚠️ <span className="underline">product hatee peyei Released e click korben (পণ্য হাতে পেয়েই Released এ ক্লিক করবেন)</span>
                              <p className="text-[11px] font-normal text-amber-700/90 mt-0.5">
                                আপনি রিলিজ না করা পর্যন্ত বিক্রেতা টাকা পাবেন না।
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
                    <div className="bg-slate-50 p-10 rounded-3xl border border-dashed border-slate-200 text-center">
                      <p className="text-slate-400 font-medium">আপনার কোনো বিক্রয়কৃত অর্ডার নেই।</p>
                    </div>
                  ) : (
                    sellerOrders.map(order => (
                      <div key={order.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="bg-blue-50 p-3 rounded-2xl">
                            <Package className="w-6 h-6 text-blue-600" />
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-900">{order.productName}</h4>
                            <p className="text-xs text-slate-500">ক্রেতা: {order.buyerName} | পরিমাণ: {order.quantity} | মোট: ৳{order.totalPrice}</p>
                            <p className="text-[10px] text-slate-400">
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
            </section>

            <section>
              <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center">
                <Package className="w-5 h-5 mr-2 text-emerald-600" />
                আমার তালিকাভুক্ত পণ্য
              </h3>
              <div className="bg-slate-50 p-6 rounded-2xl text-center border border-dashed border-slate-200">
                <p className="text-slate-400 text-sm">আপনি এখনো কোনো পণ্য তালিকাভুক্ত করেননি।</p>
                <button 
                  onClick={() => navigate('/')}
                  className="mt-4 text-emerald-600 font-bold text-sm hover:underline"
                >
                  পণ্য যোগ করুন
                </button>
              </div>
            </section>

            <section>
              <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center">
                <MessageSquare className="w-5 h-5 mr-2 text-emerald-600" />
                আমার পোস্টসমূহ
              </h3>
              <div className="bg-slate-50 p-6 rounded-2xl text-center border border-dashed border-slate-200">
                <p className="text-slate-400 text-sm">আপনি এখনো কোনো পোস্ট করেননি।</p>
                <button 
                  onClick={() => navigate('/forum')}
                  className="mt-4 text-emerald-600 font-bold text-sm hover:underline"
                >
                  ফোরামে আলোচনা শুরু করুন
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
