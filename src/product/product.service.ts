import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Product, ProductDocument, ProductCategory } from './product.schema';

// ─── Static mahsulotlar ───────────────────────────────────────────────────────
const STATIC_PRODUCTS = [
  // 🥤 Ichimliklar
  {
    name: 'Cola',
    price: 10000,
    category: ProductCategory.DRINKS,
    description: '0.5L sovuq Cola. Klassik ta\'m, har doim yoqimli va yangilovchi.',
    imageUrl: 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400',
  },
  {
    name: 'Fanta',
    price: 9000,
    category: ProductCategory.DRINKS,
    description: '0.5L apelsin ta\'mli Fanta. Yangilovchi va shirin ichimlik.',
    imageUrl: 'https://images.unsplash.com/photo-1624517452488-04869289c4ca?w=400',
  },
  {
    name: 'Pepsi',
    price: 9500,
    category: ProductCategory.DRINKS,
    description: '0.5L Pepsi Cola. Klassik kola ta\'mi bilan.',
    imageUrl: 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e?w=400',
  },
  {
    name: 'Limonod',
    price: 8000,
    category: ProductCategory.DRINKS,
    description: 'Tabiiy limon sharbatidan tayyorlangan sovuq limonod.',
    imageUrl: 'https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=400',
  },

  // 🍔 Yeguliklar
  {
    name: 'Burger',
    price: 25000,
    category: ProductCategory.FOOD,
    description: 'Mol go\'shti kotleti, yangi salat, pomidor, pishloq va maxsus sous bilan.',
    imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400',
  },
  {
    name: 'Hot Dog',
    price: 15000,
    category: ProductCategory.FOOD,
    description: 'Yangi non ichida sosiska, ketchup va mayonez bilan.',
    imageUrl: 'https://images.unsplash.com/photo-1612392062631-94b820e9fc77?w=400',
  },
  {
    name: 'Pizza (kichik)',
    price: 35000,
    category: ProductCategory.FOOD,
    description: '25sm diameter, mozzarella pishloq, qo\'ziqorin va kolbasa bilan.',
    imageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400',
  },
  {
    name: 'Lavash',
    price: 18000,
    category: ProductCategory.FOOD,
    description: 'Tovuq go\'shti, sabzavotlar va maxsus sous bilan o\'ralgan lavash.',
    imageUrl: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=400',
  },

  // 🍰 Shirinliklar
  {
    name: 'Tort',
    price: 30000,
    category: ProductCategory.SWEETS,
    description: 'Shokoladli tort, 1 porsiya. Juda mazali va yumshoq krem bilan.',
    imageUrl: 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=400',
  },
  {
    name: 'Donut',
    price: 8000,
    category: ProductCategory.SWEETS,
    description: 'Shokoladli glazur bilan qoplangan yumshoq va shirinlikka to\'la donut.',
    imageUrl: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=400',
  },
  {
    name: 'Ice Cream',
    price: 12000,
    category: ProductCategory.SWEETS,
    description: 'Vanil va shokolad ta\'mli 2 sharli muzqaymoq. Yozda eng yaxshi tanlov.',
    imageUrl: 'https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?w=400',
  },
];

@Injectable()
export class ProductService implements OnModuleInit {
  private readonly logger = new Logger(ProductService.name);

  constructor(
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
  ) {}

  // App ishga tushganda static mahsulotlarni seed qilish
  async onModuleInit() {
    const count = await this.productModel.countDocuments();
    if (count === 0) {
      await this.productModel.insertMany(STATIC_PRODUCTS);
      this.logger.log(`✅ ${STATIC_PRODUCTS.length} ta static mahsulot DB ga qo'shildi`);
    } else {
      this.logger.log(`📦 DB da ${count} ta mahsulot mavjud`);
    }
  }

  async findByCategory(category: ProductCategory): Promise<ProductDocument[]> {
    return this.productModel.find({ category }).exec();
  }

  async findById(id: string): Promise<ProductDocument | null> {
    return this.productModel.findById(id).exec();
  }

  async findAll(): Promise<ProductDocument[]> {
    return this.productModel.find().exec();
  }
}
