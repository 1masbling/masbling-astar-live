import { MapPin, MessageCircle, Phone } from 'lucide-react';
import { mapsDirUrl, onMyWayMessage, telUrl, whatsappUrl } from '@/lib/road-links';

interface RoadActionBarProps {
  customerName: string;
  address: string;
  phone: string;
  serviceLabel: string;
}

// Thumb-friendly one-tap road actions: navigate, WhatsApp "on my way", call.
export default function RoadActionBar({ customerName, address, phone, serviceLabel }: RoadActionBarProps) {
  const onMyWay = () => {
    window.open(whatsappUrl(phone, onMyWayMessage(customerName, address, serviceLabel)), '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="grid grid-cols-3 gap-1.5" onClick={e => e.stopPropagation()}>
      <a
        href={mapsDirUrl(address)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center gap-1 rounded-lg bg-navy-800 hover:bg-navy-700 px-2 py-2 text-[11px] font-semibold text-navy-100 transition-colors"
      >
        <MapPin className="w-3.5 h-3.5 text-gold-400 shrink-0" /> Navigate
      </a>
      <button
        type="button"
        onClick={onMyWay}
        disabled={!phone}
        className="inline-flex items-center justify-center gap-1 rounded-lg bg-teal-900/40 hover:bg-teal-900/70 px-2 py-2 text-[11px] font-semibold text-teal-200 transition-colors disabled:opacity-40"
      >
        <MessageCircle className="w-3.5 h-3.5 shrink-0" /> On My Way
      </button>
      <a
        href={telUrl(phone)}
        className="inline-flex items-center justify-center gap-1 rounded-lg bg-navy-800 hover:bg-navy-700 px-2 py-2 text-[11px] font-semibold text-navy-100 transition-colors"
      >
        <Phone className="w-3.5 h-3.5 text-success-400 shrink-0" /> Call
      </a>
    </div>
  );
}
