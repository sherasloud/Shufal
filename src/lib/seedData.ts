import { collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

export async function seedInitialData() {
  const productsSnapshot = await getDocs(collection(db, 'products'));
  if (productsSnapshot.empty) {
    const products = [
      {
        name: 'তাজা লাল টমেটো',
        category: 'সবজি',
        price: 40,
        unit: 'কেজি',
        farmerId: 'system',
        farmerName: 'রহিম মিয়া',
        location: 'বগুড়া',
        description: 'সরাসরি বাগান থেকে তোলা বিষমুক্ত তাজা টমেটো।',
        imageUrl: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?q=80&w=400&auto=format&fit=crop',
        createdAt: serverTimestamp()
      },
      {
        name: 'দেশি আম (হিমসাগর)',
        category: 'ফল',
        price: 120,
        unit: 'কেজি',
        farmerId: 'system',
        farmerName: 'করিম শেখ',
        location: 'রাজশাহী',
        description: 'রাজশাহীর বিখ্যাত মিষ্টি হিমসাগর আম।',
        imageUrl: 'https://images.unsplash.com/photo-1553279768-865429fa0078?q=80&w=400&auto=format&fit=crop',
        createdAt: serverTimestamp()
      },
      {
        name: 'অর্গানিক বাসমতি চাল',
        category: 'শস্য',
        price: 85,
        unit: 'কেজি',
        farmerId: 'system',
        farmerName: 'আব্বাস আলী',
        location: 'দিনাজপুর',
        description: 'উন্নত মানের সুগন্ধি বাসমতি চাল।',
        imageUrl: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?q=80&w=400&auto=format&fit=crop',
        createdAt: serverTimestamp()
      }
    ];

    for (const p of products) {
      await addDoc(collection(db, 'products'), p);
    }
    console.log('Products seeded');
  }

  const pricesSnapshot = await getDocs(collection(db, 'marketPrices'));
  if (pricesSnapshot.empty) {
    const prices = [
      { crop: 'গম (গ্রেড এ)', price: 24.5, trend: 'up', region: 'কেন্দ্রীয় বাজার', lastUpdated: serverTimestamp() },
      { crop: 'ধান (বাসমতি)', price: 38.0, trend: 'stable', region: 'উত্তরাঞ্চল', lastUpdated: serverTimestamp() },
      { crop: 'সয়াবিন', price: 42.0, trend: 'down', region: 'পশ্চিমাঞ্চল', lastUpdated: serverTimestamp() },
      { crop: 'সরিষা', price: 56.0, trend: 'up', region: 'কেন্দ্রীয় বাজার', lastUpdated: serverTimestamp() },
      { crop: 'পেঁয়াজ', price: 18.0, trend: 'down', region: 'দক্ষিণাঞ্চল', lastUpdated: serverTimestamp() },
    ];

    for (const pr of prices) {
      await addDoc(collection(db, 'marketPrices'), pr);
    }
    console.log('Market prices seeded');
  }
}
