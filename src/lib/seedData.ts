import { collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from './firebase';
import { handleFirestoreError, OperationType } from './firestore-errors';

export async function seedInitialData() {
  // Only seed if user is the admin (since only admin can write to marketPrices and products initially)
  // Actually, for this app, we want some initial products to show up.
  // But firestore rules block creates if not signed in.
  if (!auth.currentUser) return;

  try {
    const productsSnapshot = await getDocs(collection(db, 'products'));
    if (productsSnapshot.empty) {
      const products = [
        {
          name: 'তাজা লাল টমেটো',
          category: 'সবজি',
          price: 40,
          unit: 'কেজি',
          farmerId: auth.currentUser.uid,
          farmerName: auth.currentUser.displayName || 'রহিম মিয়া',
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
          farmerId: auth.currentUser.uid,
          farmerName: auth.currentUser.displayName || 'করিম শেখ',
          location: 'রাজশাহী',
          description: 'রাজশাহীর বিখ্যাত মিষ্টি হিমসাগর আম।',
          imageUrl: 'https://images.unsplash.com/photo-1553279768-865429fa0078?q=80&w=400&auto=format&fit=crop',
          createdAt: serverTimestamp()
        }
      ];

      for (const p of products) {
        await addDoc(collection(db, 'products'), p);
      }
      console.log('Products seeded');
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, 'products');
  }
}
