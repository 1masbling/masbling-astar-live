const REVIEW_URL = 'https://g.page/r/CU5FcHh35s78EBM/review';
const INVOICE_ETRANSFER_EMAIL = 'masblingteam1@gmail.com';

export function cleanPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `1${digits}`;
  return digits;
}

export function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || 'there';
}

export function mapsDirUrl(address: string): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
}

export function telUrl(phone: string): string {
  return `tel:${cleanPhone(phone)}`;
}

export function onMyWayMessage(customerName: string, address: string, serviceLabel: string): string {
  return `Hi ${firstName(customerName)}, Mark from Masbling Astar Services is on the way to ${address} for your ${serviceLabel} today! #MasblingAstarServices`;
}

export function whatsappUrl(phone: string, message: string): string {
  return `https://wa.me/${cleanPhone(phone)}?text=${encodeURIComponent(message)}`;
}

export function invoiceWhatsAppMessage(customerName: string, invoiceNumber: string, serviceLabel: string, amount: string): string {
  const servicePart = serviceLabel ? ` for ${serviceLabel}` : '';
  return `Hi ${firstName(customerName)}, here is your invoice ${invoiceNumber}${servicePart} from Masbling Astar Services. Total: ${amount}. Please send an Interac e-Transfer to ${INVOICE_ETRANSFER_EMAIL} (Auto-Deposit enabled — no security question needed). Thank you for your business! #MasblingAstarServices`;
}

export function reviewRequestMessage(customerName: string): string {
  return `Hi ${firstName(customerName)}, thank you for choosing Masbling Astar Services! If you are happy with our work, we would really appreciate a quick Google review: ${REVIEW_URL}. Thanks so much! #MasblingAstarServices`;
}
