export type TelegramUser = { id: number; is_bot?: boolean; first_name: string; last_name?: string; username?: string; language_code?: string };
export type TelegramChat = { id: number; type: string };
export type TelegramContact = { phone_number: string; first_name: string; last_name?: string; user_id?: number };
export type TelegramMessage = { message_id: number; from?: TelegramUser; chat: TelegramChat; text?: string; contact?: TelegramContact };
export type TelegramCallbackQuery = { id: string; from: TelegramUser; message?: TelegramMessage; data?: string };
export type TelegramUpdate = { update_id: number; message?: TelegramMessage; callback_query?: TelegramCallbackQuery };

export type ReplyMarkup =
  | { inline_keyboard: Array<Array<{ text: string; callback_data: string }>> }
  | { keyboard: Array<Array<{ text: string; request_contact?: boolean }>>; resize_keyboard?: boolean; one_time_keyboard?: boolean; is_persistent?: boolean }
  | { remove_keyboard: true };

/** The few bot actions the update handler needs; injectable for tests. */
export type BotSender = {
  sendMessage(chatId: number | string, text: string, replyMarkup?: ReplyMarkup): Promise<void>;
  answerCallback(callbackQueryId: string, text?: string): Promise<void>;
  clearInlineKeyboard(chatId: number | string, messageId: number): Promise<void>;
};

export type WebhookInfo = { url: string; pending_update_count: number; last_error_message?: string; last_error_date?: number };

export function createTelegramApi(botToken: string) {
  async function call<T>(method: string, payload: Record<string, unknown> = {}): Promise<T> {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = (await response.json().catch(() => null)) as { ok?: boolean; result?: T; description?: string } | null;
    if (!data?.ok) throw new Error(data?.description ?? `Telegram ${method} failed with HTTP ${response.status}`);
    return data.result as T;
  }

  const sender: BotSender = {
    async sendMessage(chatId, text, replyMarkup) {
      await call('sendMessage', { chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true, ...(replyMarkup ? { reply_markup: replyMarkup } : {}) });
    },
    async answerCallback(callbackQueryId, text) {
      await call('answerCallbackQuery', { callback_query_id: callbackQueryId, ...(text ? { text } : {}) });
    },
    async clearInlineKeyboard(chatId, messageId) {
      await call('editMessageReplyMarkup', { chat_id: chatId, message_id: messageId, reply_markup: { inline_keyboard: [] } }).catch(() => undefined);
    },
  };

  return {
    call,
    sender,
    setWebhook: (url: string, secretToken: string) =>
      call<boolean>('setWebhook', { url, secret_token: secretToken, allowed_updates: ['message', 'callback_query'], drop_pending_updates: true }),
    getWebhookInfo: () => call<WebhookInfo>('getWebhookInfo'),
  };
}
