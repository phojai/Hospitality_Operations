import { Booking, Room } from '../types';
import { getBookingRoomNames, formatDateReadable } from './bookingUtils';

export interface TelegramConfig {
  botToken: string;
  chatId: string;
}

export function getStoredTelegramConfig(): TelegramConfig {
  const botToken = localStorage.getItem('homestay_telegram_bot_token') || '';
  const chatId = localStorage.getItem('homestay_telegram_chat_id') || '';
  return { botToken, chatId };
}

export function saveStoredTelegramConfig(config: TelegramConfig) {
  localStorage.setItem('homestay_telegram_bot_token', config.botToken.trim());
  localStorage.setItem('homestay_telegram_chat_id', config.chatId.trim());
}

export function buildHousekeepingReminderMessage(booking: Booking, rooms: Room[]): string {
  const roomNames = getBookingRoomNames(booking, rooms);
  const nowStr = new Date().toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  return `<b>🧹 HOUSEKEEPING REMINDER: CHECK-OUT COMPLETED</b>

<b>🏡 Property:</b> Nohshring Homestay
<b>🚪 Room(s):</b> ${roomNames}
<b>👤 Departed Guest:</b> ${booking.guestName}
<b>📞 Mobile:</b> ${booking.guestMobile || 'N/A'}
<b>📅 Stay Schedule:</b> ${formatDateReadable(booking.checkInDate)} to ${formatDateReadable(booking.checkOutDate)} (${booking.nights} Night${booking.nights > 1 ? 's' : ''})
<b>⏰ Checkout Timestamp:</b> ${nowStr}

<b>🧽 Housekeeping Checklist:</b>
• Strip & replace all bed linens and pillow cases
• Deep clean and sanitize bathroom & mirrors
• Restock fresh bath towels & toiletries
• Disinfect high-touch handles & remote controls
• Mop floors and inspect room amenities
• Mark room status as Clean & Ready for next Check-In!`;
}

export async function sendHousekeepingTelegramReminder(
  booking: Booking,
  rooms: Room[]
): Promise<{ success: boolean; message: string }> {
  const { botToken, chatId } = getStoredTelegramConfig();
  const text = buildHousekeepingReminderMessage(booking, rooms);

  try {
    const res = await fetch('/api/telegram/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        botToken,
        chatId,
        text,
        parseMode: 'HTML'
      })
    });

    const data = await res.json();
    if (data.success) {
      return { success: true, message: 'Telegram housekeeping notification sent successfully!' };
    } else {
      return { success: false, message: data.error || 'Failed to send Telegram message' };
    }
  } catch (err: any) {
    return { success: false, message: err.message || 'Network error sending Telegram notification' };
  }
}

export async function sendTestTelegramMessage(
  botToken?: string,
  chatId?: string
): Promise<{ success: boolean; message: string }> {
  const text = `<b>🧹 Nohshring Homestay Telegram Bot Test</b>\n\nYour Telegram integration is working perfectly! You will receive automatic housekeeping alerts here whenever a room check-out is completed.`;

  try {
    const res = await fetch('/api/telegram/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        botToken,
        chatId,
        text,
        parseMode: 'HTML'
      })
    });

    const data = await res.json();
    if (data.success) {
      return { success: true, message: 'Test message sent to Telegram successfully!' };
    } else {
      return { success: false, message: data.error || 'Failed to send Telegram test message' };
    }
  } catch (err: any) {
    return { success: false, message: err.message || 'Network error sending test notification' };
  }
}
