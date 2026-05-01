import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as TelegramBot from 'node-telegram-bot-api';
import { User, UserDocument, UserStep } from '../user/user.schema';
import { Product, ProductDocument, ProductCategory } from '../product/product.schema';
import { Order, OrderDocument } from '../order/order.schema';
import { ProductService } from '../product/product.service';

@Injectable()
export class BotService implements OnModuleInit {
  private bot: TelegramBot;
  private readonly logger = new Logger(BotService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    private readonly productService: ProductService,
  ) {}

  // ─── Module ishga tushganda bot polling boshlash ──────────────────────────────
  onModuleInit() {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      throw new Error('❌ TELEGRAM_BOT_TOKEN .env faylida topilmadi!');
    }

    this.bot = new TelegramBot(token, { polling: true });
    this.logger.log('🤖 Telegram Bot polling boshlandi...');

    this.registerHandlers();
  }

  // ─── Barcha event handlerlarni bog'lash ──────────────────────────────────────
  private registerHandlers() {
    // /start komandasi
    this.bot.onText(/\/start/, (msg) => this.handleStart(msg));

    // Barcha oddiy xabarlar
    this.bot.on('message', (msg) => this.handleMessage(msg));

    // Inline button bosilganda
    this.bot.on('callback_query', (query) => this.handleCallbackQuery(query));

    // Xato bo'lganda log qilish
    this.bot.on('polling_error', (error) => {
      this.logger.error(`Polling xatosi: ${error.message}`);
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. /START HANDLER
  // ─────────────────────────────────────────────────────────────────────────────
  private async handleStart(msg: TelegramBot.Message) {
    const chatId = msg.chat.id;
    const telegramId = msg.from?.id;
    if (!telegramId) return;

    let user = await this.userModel.findOne({ telegramId });

    if (!user) {
      // Yangi foydalanuvchi - yaratamiz
      user = await this.userModel.create({
        telegramId,
        step: UserStep.WAITING_NAME,
        isRegistered: false,
      });
      return this.askName(chatId);
    }

    if (user.isRegistered) {
      // Allaqachon ro'yxatdan o'tgan
      return this.showMainMenu(chatId, user.name);
    }

    // Ro'yxatdan o'tmagan, stepni reset qilib qaytadan boshlash
    user.step = UserStep.WAITING_NAME;
    await user.save();
    return this.askName(chatId);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. BARCHA XABARLARNI QAYTA ISHLASH
  // ─────────────────────────────────────────────────────────────────────────────
  private async handleMessage(msg: TelegramBot.Message) {
    const chatId = msg.chat.id;
    const telegramId = msg.from?.id;
    if (!telegramId) return;

    // /start allaqachon o'z handleriga ega
    if (msg.text === '/start') return;

    const user = await this.userModel.findOne({ telegramId });
    if (!user) {
      return this.bot.sendMessage(chatId, '⚠️ Iltimos, /start bosing');
    }

    // Ro'yxatdan o'tmagan → registration flow
    if (!user.isRegistered) {
      return this.handleRegistrationFlow(msg, user, chatId);
    }

    // Ro'yxatdan o'tgan → asosiy menu navigatsiyasi
    if (msg.text) {
      return this.handleMenuNavigation(msg.text, chatId, telegramId);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. REGISTRATION FLOW (step-by-step)
  // ─────────────────────────────────────────────────────────────────────────────
  private async handleRegistrationFlow(
    msg: TelegramBot.Message,
    user: UserDocument,
    chatId: number,
  ) {
    switch (user.step) {

      // QADAM 1: ISM qabul qilish
      case UserStep.WAITING_NAME: {
        if (!msg.text || msg.text.trim().length < 2) {
          return this.bot.sendMessage(
            chatId,
            '⚠️ Iltimos, to\'liq ismingizni kiriting (kamida 2 ta harf):',
          );
        }

        user.name = msg.text.trim();
        user.step = UserStep.WAITING_PHONE;
        await user.save();

        return this.bot.sendMessage(
          chatId,
          `✅ Rahmat, *${user.name}*!\n\nEndi telefon raqamingizni yuboring 👇`,
          {
            parse_mode: 'Markdown',
            reply_markup: {
              keyboard: [
                [{ text: '📱 Telefon raqamni yuborish', request_contact: true }],
              ],
              resize_keyboard: true,
              one_time_keyboard: true,
            },
          },
        );
      }

      // QADAM 2: TELEFON qabul qilish
      case UserStep.WAITING_PHONE: {
        if (!msg.contact) {
          return this.bot.sendMessage(
            chatId,
            '⚠️ Iltimos, pastdagi tugma orqali telefon raqamingizni yuboring 👇',
            {
              reply_markup: {
                keyboard: [
                  [{ text: '📱 Telefon raqamni yuborish', request_contact: true }],
                ],
                resize_keyboard: true,
                one_time_keyboard: true,
              },
            },
          );
        }

        user.phone = msg.contact.phone_number;
        user.step = UserStep.WAITING_LOCATION;
        await user.save();

        return this.bot.sendMessage(
          chatId,
          `✅ Telefon raqam saqlandi: *${user.phone}*\n\nEndi joylashuvingizni yuboring 📍`,
          {
            parse_mode: 'Markdown',
            reply_markup: {
              keyboard: [
                [{ text: '📍 Joylashuvni yuborish', request_location: true }],
              ],
              resize_keyboard: true,
              one_time_keyboard: true,
            },
          },
        );
      }

      // QADAM 3: LOCATION qabul qilish
      case UserStep.WAITING_LOCATION: {
        if (!msg.location) {
          return this.bot.sendMessage(
            chatId,
            '⚠️ Iltimos, pastdagi tugma orqali joylashuvingizni yuboring 👇',
            {
              reply_markup: {
                keyboard: [
                  [{ text: '📍 Joylashuvni yuborish', request_location: true }],
                ],
                resize_keyboard: true,
                one_time_keyboard: true,
              },
            },
          );
        }

        user.location = {
          latitude: msg.location.latitude,
          longitude: msg.location.longitude,
        };
        user.step = UserStep.REGISTERED;
        user.isRegistered = true;
        await user.save();

        await this.bot.sendMessage(
          chatId,
          `🎉 *Tabriklaymiz, ${user.name}!*\n\n` +
          `Siz muvaffaqiyatli ro'yxatdan o'tdingiz!\n\n` +
          `📱 Telefon: ${user.phone}\n` +
          `📍 Joylashuvingiz saqlandi ✅\n\n` +
          `Endi buyurtma berishingiz mumkin!`,
          { parse_mode: 'Markdown' },
        );

        return this.showMainMenu(chatId, user.name);
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. MENU NAVIGATSIYASI
  // ─────────────────────────────────────────────────────────────────────────────
  private async handleMenuNavigation(
    text: string,
    chatId: number,
    telegramId: number,
  ) {
    switch (text) {
      case '🥤 Ichimliklar':
        return this.showCategoryProducts(chatId, ProductCategory.DRINKS);
      case '🍔 Yeguliklar':
        return this.showCategoryProducts(chatId, ProductCategory.FOOD);
      case '🍰 Shirinliklar':
        return this.showCategoryProducts(chatId, ProductCategory.SWEETS);
      case '🛒 Savat':
        return this.showCart(chatId, telegramId);
      default: {
        const user = await this.userModel.findOne({ telegramId });
        if (user) return this.showMainMenu(chatId, user.name);
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. CALLBACK QUERY HANDLER (inline buttonlar)
  // ─────────────────────────────────────────────────────────────────────────────
  private async handleCallbackQuery(query: TelegramBot.CallbackQuery) {
    const chatId = query.message?.chat.id;
    const telegramId = query.from.id;
    const data = query.data;

    if (!chatId || !data) return;

    // Loading animatsiyasini o'chirish
    await this.bot.answerCallbackQuery(query.id);

    if (data.startsWith('product_')) {
      const productId = data.replace('product_', '');
      return this.showProductDetail(chatId, productId);
    }

    if (data.startsWith('order_')) {
      const productId = data.replace('order_', '');
      return this.addToCart(chatId, telegramId, productId);
    }

    if (data === 'confirm_order') {
      return this.confirmOrder(chatId, telegramId);
    }

    if (data === 'clear_cart') {
      return this.clearCart(chatId, telegramId);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // HELPER METHODS
  // ─────────────────────────────────────────────────────────────────────────────

  // ISM so'rash
  private async askName(chatId: number) {
    return this.bot.sendMessage(
      chatId,
      '👋 *Xush kelibsiz!*\n\n🍽 *Food Order Bot*ga xush kelibsiz!\n\nBuyurtma berish uchun avval ro\'yxatdan o\'tishingiz kerak.\n\nIltimos, *to\'liq ismingizni* kiriting:',
      {
        parse_mode: 'Markdown',
        reply_markup: { remove_keyboard: true },
      },
    );
  }

  // Asosiy menyuni ko'rsatish
  private async showMainMenu(chatId: number, name: string) {
    return this.bot.sendMessage(
      chatId,
      `🏠 *Asosiy menyu*\n\nSalom, *${name}*! 👋\nNima buyurtma qilmoqchisiz?`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          keyboard: [
            [{ text: '🥤 Ichimliklar' }, { text: '🍔 Yeguliklar' }],
            [{ text: '🍰 Shirinliklar' }, { text: '🛒 Savat' }],
          ],
          resize_keyboard: true,
        },
      },
    );
  }

  // Kategoriya mahsulotlarini ko'rsatish
  private async showCategoryProducts(chatId: number, category: ProductCategory) {
    const products = await this.productService.findByCategory(category);

    if (!products.length) {
      return this.bot.sendMessage(
        chatId,
        '😔 Bu kategoriyada hozircha mahsulotlar yo\'q.',
      );
    }

    const emoji = {
      [ProductCategory.DRINKS]: '🥤',
      [ProductCategory.FOOD]: '🍔',
      [ProductCategory.SWEETS]: '🍰',
    };

    await this.bot.sendMessage(
      chatId,
      `${emoji[category]} *${category}* ro'yxati:\n\nMahsulotni tanlang 👇`,
      { parse_mode: 'Markdown' },
    );

    for (const product of products) {
      const productId = (product as any)._id.toString();

      await this.bot.sendMessage(
        chatId,
        `*${product.name}*\n💰 ${this.formatPrice(product.price)} so'm`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: '📖 Batafsil ko\'rish',
                  callback_data: `product_${productId}`,
                },
              ],
            ],
          },
        },
      );
    }
  }

  // Mahsulot batafsil ko'rinishi (rasm + info + buyurtma tugmasi)
  private async showProductDetail(chatId: number, productId: string) {
    const product = await this.productService.findById(productId);
    if (!product) {
      return this.bot.sendMessage(chatId, '❌ Mahsulot topilmadi.');
    }

    const caption =
      `🍽 *${product.name}*\n\n` +
      `💰 *Narxi:* ${this.formatPrice(product.price)} so'm\n\n` +
      `📝 *Tarkibi:*\n${product.description}`;

    const inlineKeyboard = {
      inline_keyboard: [
        [
          {
            text: '🛒 Buyurtma berish',
            callback_data: `order_${productId}`,
          },
        ],
      ],
    };

    try {
      await this.bot.sendPhoto(chatId, product.imageUrl, {
        caption,
        parse_mode: 'Markdown',
        reply_markup: inlineKeyboard,
      });
    } catch {
      // Rasm yuklanmasa faqat matn ko'rsatish
      await this.bot.sendMessage(chatId, caption, {
        parse_mode: 'Markdown',
        reply_markup: inlineKeyboard,
      });
    }
  }

  // Savatchaga mahsulot qo'shish
  private async addToCart(chatId: number, telegramId: number, productId: string) {
    const product = await this.productService.findById(productId);
    if (!product) {
      return this.bot.sendMessage(chatId, '❌ Mahsulot topilmadi.');
    }

    // Aktiv (pending) buyurtmani topish yoki yangi yaratish
    let order = await this.orderModel.findOne({ telegramId, status: 'pending' });

    if (!order) {
      order = await this.orderModel.create({
        telegramId,
        items: [],
        totalPrice: 0,
        status: 'pending',
      });
    }

    // Mahsulot savatda bormi? Bor bo'lsa miqdorini oshirish
    const existingItem = order.items.find(
      (item) => item.productId === productId,
    );

    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      order.items.push({
        productId,
        productName: product.name,
        price: product.price,
        quantity: 1,
      });
    }

    // Jami narxni qayta hisoblash
    order.totalPrice = order.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );

    await order.save();

    return this.bot.sendMessage(
      chatId,
      `✅ *${product.name}* savatchaga qo'shildi!\n\n` +
      `💰 Jami: *${this.formatPrice(order.totalPrice)} so'm*\n` +
      `📦 Savatchadagi mahsulotlar: *${order.items.length} ta*\n\n` +
      `🛒 Savatchani ko'rish uchun "Savat" tugmasini bosing.`,
      { parse_mode: 'Markdown' },
    );
  }

  // Savatchani ko'rsatish
  private async showCart(chatId: number, telegramId: number) {
    const order = await this.orderModel.findOne({
      telegramId,
      status: 'pending',
    });

    if (!order || order.items.length === 0) {
      return this.bot.sendMessage(
        chatId,
        '🛒 *Savatingiz bo\'sh.*\n\nMahsulotlarni tanlang va buyurtma bering!',
        { parse_mode: 'Markdown' },
      );
    }

    let cartText = '🛒 *Sizning savatingiz:*\n\n';

    order.items.forEach((item, index) => {
      cartText += `${index + 1}. *${item.productName}*\n`;
      cartText += `   ${item.quantity} x ${this.formatPrice(item.price)} = *${this.formatPrice(item.price * item.quantity)} so'm*\n\n`;
    });

    cartText += `━━━━━━━━━━━━━━━━\n`;
    cartText += `💰 *Jami: ${this.formatPrice(order.totalPrice)} so'm*`;

    return this.bot.sendMessage(chatId, cartText, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: '✅ Buyurtmani tasdiqlash',
              callback_data: 'confirm_order',
            },
          ],
          [
            {
              text: '🗑 Savatchani tozalash',
              callback_data: 'clear_cart',
            },
          ],
        ],
      },
    });
  }

  // Buyurtmani tasdiqlash
  private async confirmOrder(chatId: number, telegramId: number) {
    const order = await this.orderModel.findOne({
      telegramId,
      status: 'pending',
    });

    if (!order || order.items.length === 0) {
      return this.bot.sendMessage(
        chatId,
        '❌ Tasdiqlash uchun savatchangizda mahsulot yo\'q.',
      );
    }

    order.status = 'confirmed';
    await order.save();

    const user = await this.userModel.findOne({ telegramId });
    const orderNumber = (order as any)._id.toString().slice(-6).toUpperCase();

    return this.bot.sendMessage(
      chatId,
      `🎉 *Buyurtmangiz tasdiqlandi!*\n\n` +
      `📋 Buyurtma raqami: *#${orderNumber}*\n` +
      `💰 To'lov summasi: *${this.formatPrice(order.totalPrice)} so'm*\n` +
      `📍 Manzil: ${user?.location ? 'Joylashuvingiz saqlangan ✅' : 'Noma\'lum'}\n\n` +
      `⏱ Taxminiy yetkazib berish: *30-45 daqiqa*\n\n` +
      `Rahmat! Buyurtmangiz qabul qilindi 🙏\nYaqinda yetkazib beramiz!`,
      { parse_mode: 'Markdown' },
    );
  }

  // Savatchani tozalash
  private async clearCart(chatId: number, telegramId: number) {
    await this.orderModel.findOneAndUpdate(
      { telegramId, status: 'pending' },
      { items: [], totalPrice: 0 },
    );

    return this.bot.sendMessage(
      chatId,
      '🗑 Savatchingiz tozalandi!\n\nYangi buyurtma berish uchun mahsulotlardan birini tanlang.',
    );
  }

  // Narxni formatlash: 10000 → 10,000
  private formatPrice(price: number): string {
    return price.toLocaleString('uz-UZ');
  }
}
