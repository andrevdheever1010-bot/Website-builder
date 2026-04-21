import type { Order, OrderStatus } from '@/types';

const PHONE = process.env.WHATSAPP_PHONE;
const API_KEY = process.env.WHATSAPP_API_KEY;

export async function sendWhatsAppMessage(phone: string, message: string): Promise<boolean> {
  if (!API_KEY) return false;
  try {
    const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(message)}&apikey=${API_KEY}`;
    const res = await fetch(url);
    return res.ok;
  } catch {
    return false;
  }
}

export async function notifyAdminNewOrder(order: Order): Promise<void> {
  if (!PHONE || !API_KEY) return;
  const items = order.items
    .map((i) => `• ${i.quantity}x ${i.productName} ${i.size}`)
    .join('\n');
  const message = `🍗 *New A+Market Order!*\n\nOrder #${order.orderNumber}\nCustomer: ${order.name}\nPhone: ${order.phone}\nTotal: R${order.total.toFixed(2)}\nDelivery: ${order.deliveryType}\n\n${items}`;
  await sendWhatsAppMessage(PHONE, message);
}

export async function notifyCustomerOrderStatus(order: Order, status: OrderStatus): Promise<void> {
  if (!API_KEY) return;

  const normalize = (p: string) => p.startsWith('+') ? p : `+27${p.replace(/^0/, '')}`;
  const customerPhone = normalize(order.phone);

  const messages: Partial<Record<OrderStatus, string>> = {
    paid:       `✅ Hi ${order.name}! Your A+Market order #${order.orderNumber} has been paid and confirmed. We'll prepare it fresh for Saturday. 🍗`,
    processing: `👨‍🍳 Hi ${order.name}! Your order #${order.orderNumber} is now being prepared. Fresh chicken coming your way on Saturday!`,
    ready:      `📦 Hi ${order.name}! Your order #${order.orderNumber} is ready for ${order.deliveryType === 'pickup' ? 'pickup' : 'dispatch'}!`,
    delivered:  `🎉 Hi ${order.name}! Your A+Market order #${order.orderNumber} has been delivered. Enjoy your meal! 🍗`,
    cancelled:  `❌ Hi ${order.name}, your order #${order.orderNumber} has been cancelled. Contact Andre on 069 427 4833 for assistance.`,
  };

  const msg = messages[status];
  if (!msg) return;
  await sendWhatsAppMessage(customerPhone, msg);
}
