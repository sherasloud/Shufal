import React, { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { MarketPrice } from '../types';
import { motion } from 'motion/react';
import { Plus, Trash2, Edit2, Save, X, TrendingUp, TrendingDown, Minus } from 'lucide-react';

const ADMIN_EMAIL = 'shabbdorg@gmail.com';

export default function Admin() {
  const [prices, setPrices] = useState<MarketPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<MarketPrice>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPrice, setNewPrice] = useState<Partial<MarketPrice>>({
    crop: '',
    price: 0,
    trend: 'stable',
    region: 'ঢাকা'
  });

  const isAdmin = auth.currentUser?.email === ADMIN_EMAIL;

  useEffect(() => {
    const q = query(collection(db, 'marketPrices'), orderBy('lastUpdated', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const priceData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as MarketPrice[];
      setPrices(priceData);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleAddPrice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPrice.crop || !newPrice.price) return;

    try {
      await addDoc(collection(db, 'marketPrices'), {
        ...newPrice,
        price: Number(newPrice.price),
        lastUpdated: serverTimestamp()
      });
      setShowAddForm(false);
      setNewPrice({ crop: '', price: 0, trend: 'stable', region: 'ঢাকা' });
    } catch (error) {
      console.error("Error adding price:", error);
    }
  };

  const handleUpdatePrice = async (id: string) => {
    try {
      const priceRef = doc(db, 'marketPrices', id);
      await updateDoc(priceRef, {
        ...editForm,
        price: Number(editForm.price),
        lastUpdated: serverTimestamp()
      });
      setEditingId(null);
    } catch (error) {
      console.error("Error updating price:", error);
    }
  };

  const handleDeletePrice = async (id: string) => {
    if (!window.confirm('আপনি কি নিশ্চিত যে আপনি এই দামটি মুছে ফেলতে চান?')) return;
    try {
      await deleteDoc(doc(db, 'marketPrices', id));
    } catch (error) {
      console.error("Error deleting price:", error);
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm text-center max-w-sm">
          <X className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">প্রবেশাধিকার নেই</h2>
          <p className="text-slate-500 mb-6">আপনি এই পৃষ্ঠাটি দেখার জন্য অনুমোদিত নন।</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-slate-900 mb-2">অ্যাডমিন প্যানেল</h1>
          <p className="text-slate-500">বাজারের দাম এবং তথ্য পরিচালনা করুন।</p>
        </div>
        <button 
          onClick={() => setShowAddForm(true)}
          className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center space-x-2 hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-600/20"
        >
          <Plus className="w-5 h-5" />
          <span>নতুন দাম যোগ করুন</span>
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-6 py-4 text-sm font-bold text-slate-600">ফসল</th>
              <th className="px-6 py-4 text-sm font-bold text-slate-600">দাম (৳)</th>
              <th className="px-6 py-4 text-sm font-bold text-slate-600">অঞ্চল</th>
              <th className="px-6 py-4 text-sm font-bold text-slate-600">ট্রেন্ড</th>
              <th className="px-6 py-4 text-sm font-bold text-slate-600 text-right">অ্যাকশন</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {prices.map((price) => (
              <tr key={price.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4">
                  {editingId === price.id ? (
                    <input 
                      type="text" 
                      value={editForm.crop || ''} 
                      onChange={(e) => setEditForm({...editForm, crop: e.target.value})}
                      className="w-full p-2 border rounded-lg"
                    />
                  ) : (
                    <span className="font-bold text-slate-900">{price.crop}</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  {editingId === price.id ? (
                    <input 
                      type="number" 
                      value={editForm.price || 0} 
                      onChange={(e) => setEditForm({...editForm, price: Number(e.target.value)})}
                      className="w-full p-2 border rounded-lg"
                    />
                  ) : (
                    <span className="font-mono text-emerald-600 font-bold">৳{price.price}</span>
                  )}
                </td>
                <td className="px-6 py-4 text-slate-500">
                  {editingId === price.id ? (
                    <input 
                      type="text" 
                      value={editForm.region || ''} 
                      onChange={(e) => setEditForm({...editForm, region: e.target.value})}
                      className="w-full p-2 border rounded-lg"
                    />
                  ) : (
                    price.region
                  )}
                </td>
                <td className="px-6 py-4">
                  {editingId === price.id ? (
                    <select 
                      value={editForm.trend} 
                      onChange={(e) => setEditForm({...editForm, trend: e.target.value as any})}
                      className="w-full p-2 border rounded-lg"
                    >
                      <option value="up">বৃদ্ধি</option>
                      <option value="down">হ্রাস</option>
                      <option value="stable">স্থিতিশীল</option>
                    </select>
                  ) : (
                    <div className="flex items-center">
                      {price.trend === 'up' && <TrendingUp className="w-4 h-4 text-emerald-500 mr-1" />}
                      {price.trend === 'down' && <TrendingDown className="w-4 h-4 text-red-500 mr-1" />}
                      {price.trend === 'stable' && <Minus className="w-4 h-4 text-slate-400 mr-1" />}
                      <span className="capitalize text-sm">{price.trend}</span>
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  {editingId === price.id ? (
                    <div className="flex justify-end space-x-2">
                      <button onClick={() => handleUpdatePrice(price.id!)} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg">
                        <Save className="w-5 h-5" />
                      </button>
                      <button onClick={() => setEditingId(null)} className="p-2 text-slate-400 hover:bg-slate-50 rounded-lg">
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex justify-end space-x-2">
                      <button 
                        onClick={() => {
                          setEditingId(price.id!);
                          setEditForm(price);
                        }} 
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button onClick={() => handleDeletePrice(price.id!)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAddForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl w-full max-w-lg p-8 shadow-2xl relative"
          >
            <button onClick={() => setShowAddForm(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600">
              <X className="w-6 h-6" />
            </button>
            <h2 className="text-2xl font-bold mb-6">নতুন বাজার দাম যোগ করুন</h2>
            <form onSubmit={handleAddPrice} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">ফসলের নাম</label>
                <input 
                  type="text" 
                  value={newPrice.crop}
                  onChange={(e) => setNewPrice({...newPrice, crop: e.target.value})}
                  className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500" 
                  placeholder="যেমন- বাসমতি চাল" 
                  required 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">দাম (৳)</label>
                  <input 
                    type="number" 
                    value={newPrice.price}
                    onChange={(e) => setNewPrice({...newPrice, price: Number(e.target.value)})}
                    className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500" 
                    required 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">অঞ্চল</label>
                  <input 
                    type="text" 
                    value={newPrice.region}
                    onChange={(e) => setNewPrice({...newPrice, region: e.target.value})}
                    className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500" 
                    required 
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">ট্রেন্ড</label>
                <select 
                  value={newPrice.trend}
                  onChange={(e) => setNewPrice({...newPrice, trend: e.target.value as any})}
                  className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="up">বৃদ্ধি</option>
                  <option value="down">হ্রাস</option>
                  <option value="stable">স্থিতিশীল</option>
                </select>
              </div>
              <button type="submit" className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20">
                সংরক্ষণ করুন
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
