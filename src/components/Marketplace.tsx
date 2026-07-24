import React, { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Product, UserProfile } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Search, MapPin, Tag, X, Sparkles, TrendingUp, Users, Leaf, Gavel, Timer, ArrowUpCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { bn } from 'date-fns/locale';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { getDoc } from 'firebase/firestore';

function PriceBadge({ value, unit, isAuction }: { value: number; unit: string; isAuction?: boolean }) {
  return (
    <div className="absolute top-4 right-4 bg-white/95 backdrop-blur px-3 py-1.5 rounded-full text-emerald-700 font-black text-sm shadow-lg flex items-center gap-1.5 border border-emerald-100">
      {isAuction ? <Gavel className="w-3.5 h-3.5 text-orange-500 animate-bounce" /> : null}
      <AnimatePresence mode="wait">
        <motion.span
          key={value}
          initial={{ y: 10, opacity: 0, scale: 1.2 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -10, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="flex items-center"
        >
          ৳{value}
        </motion.span>
      </AnimatePresence>
      <span className="text-[10px] text-slate-400 font-bold uppercase">/{unit}</span>
    </div>
  );
}

export default function Marketplace() {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [subscriberEmail, setSubscriberEmail] = useState('');
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [lastUpdatedId, setLastUpdatedId] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const prevProductsRef = useRef<Product[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfile = async () => {
      if (auth.currentUser) {
        const docRef = doc(db, 'users', auth.currentUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setUserProfile(docSnap.data() as UserProfile);
        }
      }
    };
    fetchProfile();
  }, [auth.currentUser]);

  const stats = [
    { label: 'সক্রিয় কৃষক', value: '১,২০০+', icon: Users, color: 'text-blue-500', bg: 'bg-blue-50' },
    { label: 'আজকের পণ্য', value: '৪৫০+', icon: Sparkles, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { label: 'সফল লেনদেন', value: '৮,০০০+', icon: TrendingUp, color: 'text-orange-500', bg: 'bg-orange-50' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const name = formData.get('name') as string;
    const price = Number(formData.get('price'));
    const unit = formData.get('unit') as string;
    const description = formData.get('description') as string;
    const isAuction = formData.get('isAuction') === 'on';
    const auctionDays = Number(formData.get('auctionDays') || 3);

    if (!auth.currentUser) {
      alert('পণ্য তালিকাভুক্ত করতে দয়া করে লগইন করুন।');
      return;
    }

    try {
      const productData: any = {
        name,
        price,
        unit,
        description,
        category: 'সবজি',
        farmerId: auth.currentUser.uid,
        farmerName: auth.currentUser.displayName || 'কৃষক',
        location: 'ঢাকা, বাংলাদেশ',
        imageUrl: `https://images.unsplash.com/photo-1610348725531-843dff563e2c?q=80&w=400&auto=format&fit=crop`,
        createdAt: serverTimestamp(),
        isAuction
      };

      if (isAuction) {
        const endTime = new Date();
        endTime.setDate(endTime.getDate() + auctionDays);
        productData.endTime = Timestamp.fromDate(endTime);
        productData.currentBid = price;
        productData.highestBidderId = null;
        productData.highestBidderName = null;
      }

      await addDoc(collection(db, 'products'), productData);
      setShowAddModal(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'products');
    }
  };

  const handlePlaceBid = async (productId: string, currentBid: number) => {
    if (!auth.currentUser) {
      alert('নিলামে অংশ নিতে দয়া করে লগইন করুন।');
      return;
    }

    const bidAmountStr = prompt(`বর্তমান সর্বোচ্চ বিড ৳${currentBid}। আপনার বিড কত?`);
    if (!bidAmountStr) return;

    const bidAmount = Number(bidAmountStr);
    if (isNaN(bidAmount)) {
      alert('সঠিক সংখ্যা লিখুন।');
      return;
    }

    if (bidAmount <= currentBid) {
      alert('আপনার বিড অবশ্যই বর্তমান বিডের চেয়ে বেশি হতে হবে।');
      return;
    }

    try {
      const productRef = doc(db, 'products', productId);
      await updateDoc(productRef, {
        currentBid: bidAmount,
        highestBidderId: auth.currentUser.uid,
        highestBidderName: auth.currentUser.displayName || 'ক্রেতা'
      });
      alert('আপনার বিড সফলভাবে গ্রহণ করা হয়েছে!');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `products/${productId}`);
    }
  };

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subscriberEmail) return;

    setIsSubscribing(true);
    try {
      await addDoc(collection(db, 'subscribers'), {
        email: subscriberEmail,
        subscribedAt: serverTimestamp(),
      });
      alert('সাবস্ক্রাইব করার জন্য ধন্যবাদ!');
      setSubscriberEmail('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'subscribers');
    } finally {
      setIsSubscribing(false);
    }
  };

  useEffect(() => {
    const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const prods = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      
      // Detect changes for "Goal Score" effect
      if (prevProductsRef.current.length > 0) {
        prods.forEach(p => {
          const oldP = prevProductsRef.current.find(op => op.id === p.id);
          if (oldP && p.isAuction && p.currentBid !== oldP.currentBid) {
            setLastUpdatedId(p.id);
            setTimeout(() => setLastUpdatedId(null), 3000);
          }
        });
      }
      
      prevProductsRef.current = prods;
      setProducts(prods);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'products');
    });
    return () => unsubscribe();
  }, []);

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="relative h-[300px] rounded-3xl overflow-hidden mb-8 group">
        <img 
          src="https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?q=80&w=1200&auto=format&fit=crop" 
          alt="Agriculture" 
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-linear-to-t from-slate-900/80 via-slate-900/20 to-transparent flex flex-col justify-end p-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-4xl font-black text-white mb-2 leading-tight">
              সরাসরি খামার থেকে <br /> <span className="text-emerald-400">তাজা পণ্য</span> কিনুন
            </h2>
            <p className="text-emerald-50/80 max-w-md font-medium">
              মধ্যস্বত্বভোগী ছাড়াই সরাসরি কৃষকদের কাছ থেকে সেরা মানের সবজি, ফল এবং শস্য সংগ্রহ করুন।
            </p>
          </motion.div>
        </div>
      </div>

      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">বাজার</h1>
          <p className="text-slate-500">সরাসরি স্থানীয় খামার থেকে আসা তাজা পণ্য</p>
        </div>
        {(userProfile?.role === 'farmer' || userProfile?.role === 'trader' || userProfile?.role === 'admin') && (
          <button 
            onClick={() => {
              if (!auth.currentUser) {
                alert('পণ্য তালিকাভুক্ত করতে দয়া করে লগইন করুন।');
                return;
              }
              setShowAddModal(true);
            }}
            className="flex items-center justify-center space-x-2 bg-emerald-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-emerald-700 transition-all shadow-md"
          >
            <Plus className="w-5 h-5" />
            <span>আমার পণ্য তালিকাভুক্ত করুন</span>
          </button>
        )}
      </header>

      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className={`${stat.bg} p-6 rounded-3xl border border-white flex items-center space-x-4 shadow-sm`}>
            <div className={`p-3 rounded-2xl bg-white shadow-sm ${stat.color}`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900">{stat.value}</div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Featured Categories */}
      <section className="py-4">
        <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-emerald-500" />
          জনপ্রিয় বিভাগসমূহ
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { name: 'সবজি', count: '১২০+ পণ্য', icon: '🥦', bg: 'bg-emerald-50' },
            { name: 'ফল', count: '৮৫+ পণ্য', icon: '🍎', bg: 'bg-orange-50' },
            { name: 'শস্য', count: '৫০+ পণ্য', icon: '🌾', bg: 'bg-amber-50' },
            { name: 'বীজ', count: '৩০+ পণ্য', icon: '🌱', bg: 'bg-blue-50' },
          ].map((cat) => (
            <div key={cat.name} className={`${cat.bg} p-6 rounded-3xl border border-white shadow-sm hover:shadow-md transition-all cursor-pointer group`}>
              <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">{cat.icon}</div>
              <div className="font-bold text-slate-900">{cat.name}</div>
              <div className="text-xs text-slate-500 font-medium">{cat.count}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How it Works */}
      <section className="py-12 bg-white rounded-[3rem] px-8 border border-slate-100 shadow-xs">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl font-black text-slate-900 mb-4">সুফল কীভাবে কাজ করে?</h2>
          <p className="text-slate-500 font-medium">সহজ ৩টি ধাপে আপনার খামারের পণ্য সরাসরি গ্রাহকের কাছে পৌঁছে দিন</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {[
            { step: '০১', title: 'পণ্য যোগ করুন', desc: 'আপনার উৎপাদিত পণ্যের ছবি ও বিবরণ দিয়ে তালিকাভুক্ত করুন।', icon: Sparkles },
            { step: '০২', title: 'গ্রাহকের সাথে যোগাযোগ', desc: 'আগ্রহী ক্রেতারা আপনার সাথে সরাসরি চ্যাট বা ফোনে কথা বলবে।', icon: Users },
            { step: '০৩', title: 'সফল লেনদেন', desc: 'সরাসরি পণ্য পৌঁছে দিন এবং আপনার আয় বুঝে নিন।', icon: TrendingUp },
          ].map((item) => (
            <div key={item.step} className="text-center group">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-emerald-600 group-hover:text-white transition-all text-2xl font-black">
                {item.step}
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">{item.title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Community Activity */}
      <section className="py-4">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-500" />
            সম্প্রদায়ের আলোচনা
          </h3>
          <button 
            onClick={() => navigate('/forum')}
            className="text-emerald-600 text-sm font-bold hover:underline"
          >
            সব আলোচনা দেখুন
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { title: 'বর্ষাকালে ধানের যত্ন কীভাবে নেব?', author: 'সালাম মিয়া', replies: '১২', time: '২ ঘণ্টা আগে' },
            { title: 'ভালো মানের টমেটো বীজ কোথায় পাব?', author: 'রফিক আহমেদ', replies: '৮', time: '৫ ঘণ্টা আগে' },
          ].map((post, i) => (
            <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between hover:border-emerald-200 transition-colors cursor-pointer group">
              <div>
                <h4 className="font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">{post.title}</h4>
                <div className="text-xs text-slate-400 mt-1 font-medium">
                  {post.author} • {post.time}
                </div>
              </div>
              <div className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-xs font-bold">
                {post.replies} মন্তব্য
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Success Stories */}
      <section className="py-12 bg-slate-900 rounded-[3rem] px-8 md:px-12 text-white relative overflow-hidden">
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-block bg-emerald-500 text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest mb-6">
              সফলতার গল্প
            </div>
            <h2 className="text-4xl font-black mb-6 leading-tight">সাফল্যের পথে <br /> আমাদের কৃষকরা</h2>
            <p className="text-slate-400 font-medium mb-8">
              "সুফল অ্যাপ ব্যবহার করে আমি সরাসরি ঢাকার পাইকারি বাজারে আমার টমেটো বিক্রি করতে পেরেছি। আগে যেখানে কেজি প্রতি ২০ টাকা পেতাম, এখন পাচ্ছি ৩৫ টাকা।"
            </p>
            <div className="flex items-center gap-4">
              <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=farmer1" className="w-16 h-16 rounded-2xl bg-white/10" alt="" />
              <div>
                <div className="font-bold text-lg">মোঃ হাসেম আলী</div>
                <div className="text-emerald-400 text-sm">সফল সবজি চাষী, বগুড়া</div>
              </div>
            </div>
          </div>
          <div className="relative aspect-square rounded-[2rem] overflow-hidden">
            <img src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=800&auto=format&fit=crop" className="w-full h-full object-cover" alt="" />
          </div>
        </div>
      </section>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
        <input
          type="text"
          placeholder="ফসল, সবজি বা ফল খুঁজুন..."
          className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all shadow-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProducts.map((product) => (
          <motion.div
            layout
            key={product.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ 
              opacity: 1, 
              y: 0,
              scale: lastUpdatedId === product.id ? 1.02 : 1,
              borderColor: lastUpdatedId === product.id ? '#10b981' : '#e2e8f0',
              boxShadow: lastUpdatedId === product.id ? '0 20px 25px -5px rgb(16 185 129 / 0.1)' : 'none'
            }}
            className="bg-white rounded-2xl border overflow-hidden hover:shadow-xl transition-all group relative"
          >
            {lastUpdatedId === product.id && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute top-2 left-1/2 -translate-x-1/2 z-20 bg-emerald-500 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter flex items-center gap-1 shadow-lg"
              >
                <ArrowUpCircle className="w-3 h-3" />
                নতুন বিড!
              </motion.div>
            )}
            <div className="aspect-square bg-slate-100 relative overflow-hidden">
              <img 
                src={product.imageUrl || `https://images.unsplash.com/photo-1610348725531-843dff563e2c?q=80&w=400&auto=format&fit=crop`} 
                alt={product.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <PriceBadge 
                value={product.isAuction ? (product.currentBid || product.price) : product.price} 
                unit={product.unit} 
                isAuction={product.isAuction} 
              />
              {product.isAuction && product.endTime && (
                <div className="absolute bottom-4 left-4 bg-orange-500/90 backdrop-blur px-3 py-1 rounded-lg text-white font-bold text-xs shadow-sm flex items-center gap-1">
                  <Timer className="w-3 h-3" />
                  {formatDistanceToNow(product.endTime.toDate(), { locale: bn, addSuffix: true })} শেষ হবে
                </div>
              )}
            </div>
            <div className="p-6">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-xl font-bold text-slate-900">{product.name}</h3>
                <span className="text-xs font-semibold bg-emerald-50 text-emerald-700 px-2 py-1 rounded capitalize">
                  {product.category}
                </span>
              </div>
              <p className="text-slate-500 text-sm mb-4 line-clamp-2">{product.description}</p>
              
              <div className="flex items-center space-x-4 text-sm text-slate-400 mb-6">
                <div className="flex items-center">
                  <MapPin className="w-4 h-4 mr-1" />
                  <span>{product.location}</span>
                </div>
                <div className="flex items-center">
                  <Tag className="w-4 h-4 mr-1" />
                  <span>{product.farmerName}</span>
                </div>
              </div>

              {product.isAuction ? (
                <div className="space-y-3">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div className="text-xs text-slate-500 font-bold mb-1">সর্বোচ্চ বিডার</div>
                    <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Users className="w-4 h-4 text-emerald-500" />
                      {product.highestBidderName || 'এখনো কেউ বিড করেনি'}
                    </div>
                  </div>
                  <button 
                    onClick={() => handlePlaceBid(product.id, product.currentBid || product.price)}
                    className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-100 flex items-center justify-center gap-2"
                  >
                    <Gavel className="w-5 h-5" />
                    বিড করুন
                  </button>
                </div>
              ) : (
                <button className="w-full bg-slate-900 text-white py-3 rounded-xl font-medium hover:bg-slate-800 transition-colors">
                  বিক্রেতার সাথে যোগাযোগ করুন
                </button>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl w-full max-w-lg p-8 shadow-2xl relative"
          >
            <button 
              onClick={() => setShowAddModal(false)}
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-600"
            >
              <X className="w-6 h-6" />
            </button>
            <h2 className="text-2xl font-bold mb-6">আপনার পণ্য তালিকাভুক্ত করুন</h2>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">ফসলের নাম</label>
                <input name="name" type="text" className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500" placeholder="যেমন- অর্গানিক গম" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">দাম</label>
                  <input name="price" type="number" className="w-full p-3 border border-slate-200 rounded-xl" placeholder="0.00" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">একক</label>
                  <input name="unit" type="text" className="w-full p-3 border border-slate-200 rounded-xl" placeholder="যেমন- কেজি" required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">বিবরণ</label>
                <textarea name="description" className="w-full p-3 border border-slate-200 rounded-xl h-24" placeholder="আপনার পণ্য সম্পর্কে বিস্তারিত লিখুন..."></textarea>
              </div>
              
              <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Gavel className="w-5 h-5 text-emerald-600" />
                    <span className="font-bold text-slate-900">নিলাম শুরু করুন?</span>
                  </div>
                  <input name="isAuction" type="checkbox" className="w-5 h-5 accent-emerald-600" />
                </div>
                <p className="text-xs text-slate-500 font-medium">নিলাম চালু করলে ক্রেতারা আপনার পণ্যের জন্য বিড করতে পারবেন।</p>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">নিলামের সময়সীমা (দিন)</label>
                  <select name="auctionDays" className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm">
                    <option value="1">১ দিন</option>
                    <option value="3">৩ দিন</option>
                    <option value="7">৭ দিন</option>
                  </select>
                </div>
              </div>

              <button type="submit" className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold shadow-lg hover:bg-emerald-700 transition-all">
                তালিকা প্রকাশ করুন
              </button>
            </form>
          </motion.div>
        </div>
      )}
      {/* Newsletter Section */}
      <div className="mt-20 bg-emerald-900 rounded-[40px] p-8 md:p-12 relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <h2 className="text-3xl font-black text-white mb-4">সবশেষ আপডেট পান</h2>
          <p className="text-emerald-100/80 mb-8 font-medium">
            নতুন পণ্যের তালিকা এবং বাজারের দামের পরিবর্তনের আপডেট সরাসরি আপনার ইমেইলে পেতে আমাদের নিউজলেটারে সাবস্ক্রাইব করুন।
          </p>
          <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-3">
            <input 
              type="email" 
              value={subscriberEmail}
              onChange={(e) => setSubscriberEmail(e.target.value)}
              placeholder="আপনার ইমেইল ঠিকানা" 
              required
              className="flex-1 px-6 py-4 rounded-2xl bg-white/10 border border-white/20 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
            <button 
              type="submit"
              disabled={isSubscribing}
              className="bg-emerald-500 text-white px-8 py-4 rounded-2xl font-bold hover:bg-emerald-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubscribing ? 'প্রসেসিং...' : 'সাবস্ক্রাইব করুন'}
            </button>
          </form>
        </div>
        <div className="absolute right-[-40px] top-[-40px] w-80 h-80 bg-emerald-500/20 rounded-full blur-3xl"></div>
        <Leaf className="absolute right-12 bottom-12 w-32 h-32 text-emerald-800 opacity-50 -rotate-12" />
      </div>
    </div>
  );
}
