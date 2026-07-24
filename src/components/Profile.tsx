import React, { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { motion } from 'motion/react';
import { User, Mail, Shield, LogOut, Package, MessageSquare, Gavel, TrendingUp, CreditCard, ShoppingBag } from 'lucide-react';
import { signOut, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, onSnapshot, collection, query, where, orderBy, runTransaction, increment, serverTimestamp } from 'firebase/firestore';
import { UserProfile, UserRole, Order } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import WalletComponent from './Wallet';

const ADMIN_EMAILS = ['shufalharvest@gmail.com', 'shustobd@gmail.com'];

export default function Profile() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const isAdminUser = user?.email && ADMIN_EMAILS.includes(user.email);

  useEffect(() => {
    let unsubscribeProfile: () => void = () => {};
    let unsubscribeOrders: () => void = () => {};

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const docRef = doc(db, 'users', currentUser.uid);
        unsubscribeProfile = onSnapshot(docRef, (docSnap) => {
          if (docSnap.exists()) {
            setProfile(docSnap.data() as UserProfile);
          }
        });

        const ordersQuery = query(
          collection(db, 'orders'),
          where('buyerId', '==', currentUser.uid),
          orderBy('timestamp', 'desc')
        );
        unsubscribeOrders = onSnapshot(ordersQuery, (snapshot) => {
          setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)));
          setLoading(false);
        }, (error) => {
          console.error("Orders list error:", error);
          setLoading(false);
        });

      } else {
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      unsubscribeProfile();
      unsubscribeOrders();
    };
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
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
            <section className="md:col-span-2">
              <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center">
                <CreditCard className="w-6 h-6 mr-3 text-emerald-600" />
                আমার ওয়ালেট
              </h3>
              {profile && <WalletComponent profile={profile} />}
            </section>

            <section className="md:col-span-2">
              <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center">
                <ShoppingBag className="w-6 h-6 mr-3 text-emerald-600" />
                আমার অর্ডারসমূহ
              </h3>
              <div className="space-y-4">
                {orders.length === 0 ? (
                  <div className="bg-slate-50 p-10 rounded-3xl border border-dashed border-slate-200 text-center">
                    <p className="text-slate-400">আপনার এখনো কোনো অর্ডার নেই।</p>
                  </div>
                ) : (
                  orders.map(order => (
                    <div key={order.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="bg-emerald-50 p-3 rounded-2xl">
                          <Package className="w-6 h-6 text-emerald-600" />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900">{order.productName}</h4>
                          <p className="text-xs text-slate-500">পরিমাণ: {order.quantity} | মোট: ৳{order.totalPrice}</p>
                          <p className="text-[10px] text-slate-400">
                            {order.timestamp?.toDate?.().toLocaleString('bn-BD')}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full ${
                          order.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 
                          order.status === 'refunded' ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {order.status === 'completed' ? 'সফল' : order.status === 'refunded' ? 'ফেরত দেওয়া হয়েছে' : 'পেন্ডিং'}
                        </span>
                        {order.status === 'completed' && (
                          <button 
                            onClick={async () => {
                              if (confirm('আপনি কি এই অর্ডারের টাকা ফেরত পেতে চান?')) {
                                try {
                                  await runTransaction(db, async (transaction) => {
                                    const userRef = doc(db, 'users', auth.currentUser!.uid);
                                    const orderRef = doc(db, 'orders', order.id);
                                    
                                    // Update order status
                                    transaction.update(orderRef, { status: 'refunded' });
                                    
                                    // Refund to wallet
                                    transaction.update(userRef, {
                                      walletBalance: increment(order.totalPrice)
                                    });

                                    // Record transaction
                                    const txRef = doc(collection(db, 'users', auth.currentUser!.uid, 'transactions'));
                                    transaction.set(txRef, {
                                      userId: auth.currentUser!.uid,
                                      amount: order.totalPrice,
                                      type: 'credit',
                                      description: `${order.productName} এর টাকা ফেরত (Refund)`,
                                      timestamp: serverTimestamp()
                                    });
                                  });
                                  alert('টাকা সফলভাবে ওয়ালেটে ফেরত দেওয়া হয়েছে।');
                                } catch (e) {
                                  alert('ফেরত দেওয়া সম্ভব হয়নি।');
                                }
                              }
                            }}
                            className="text-[10px] font-bold text-emerald-600 hover:underline"
                          >
                            টাকা ফেরত নিন
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
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
