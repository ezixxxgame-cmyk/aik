export type Lead = { name: string; phone: string; budget?: string; model?: string };

// Заглушка: подключить CRM, Telegram-бота или почту — заменить тело этой функции.
export async function submitLead(lead: Lead): Promise<void> {
  await new Promise((r) => setTimeout(r, 700));
  if (!lead.phone) throw new Error("no phone");
}
