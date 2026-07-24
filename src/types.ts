export type UserRole = 'farmer' | 'trader' | 'buyer' | 'admin';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: UserRole;
  location?: string;
  phone?: string;
  createdAt: any;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  unit: string;
  farmerId: string;
  farmerName: string;
  location: string;
  description: string;
  imageUrl: string;
  createdAt: any;
  // Auction fields
  isAuction?: boolean;
  endTime?: any;
  currentBid?: number;
  highestBidderId?: string;
  highestBidderName?: string;
}

export interface Post {
  id: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: any;
  likes: number;
}

export interface Comment {
  id: string;
  postId: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: any;
}

export interface MarketPrice {
  id: string;
  crop: string;
  price: number;
  trend: 'up' | 'down' | 'stable';
  region: string;
  lastUpdated: any;
}

export interface WeatherAlert {
  id: string;
  type: string;
  severity: 'Low' | 'Medium' | 'High';
  region: string;
  message: string;
}

export interface FarmingTip {
  title: string;
  content: string;
}
