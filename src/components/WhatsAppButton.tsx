import { MessageCircle } from 'lucide-react';
import { useCarpool } from '../state/CarpoolContext';
import { buildWhatsAppSummary, copyToClipboard } from '../utils/whatsapp';

export function WhatsAppButton({ variant = 'compact' }: { variant?: 'compact' | 'pill' }) {
  const { state, showToast } = useCarpool();
  const disabled = state.rides.length === 0;

  const onClick = async () => {
    const ok = await copyToClipboard(buildWhatsAppSummary(state));
    showToast(ok ? '📋 הסיכום הועתק! אפשר להדביק בוואטסאפ' : 'ההעתקה נכשלה — נסו שוב');
  };

  if (variant === 'pill') {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="flex h-14 items-center justify-center gap-2.5 rounded-full bg-[#25D366] text-[15px] font-bold text-ink shadow-[0_12px_28px_-10px_rgba(37,211,102,0.7)] hover:brightness-95 disabled:opacity-40"
      >
        <MessageCircle size={18} /> העתק סיכום שבועי לוואטסאפ
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex h-9 items-center gap-1.5 rounded-xl bg-[#25D366] px-3 text-sm font-bold whitespace-nowrap text-ink hover:brightness-95 disabled:opacity-40"
    >
      <MessageCircle size={16} /> העתק לוואטסאפ
    </button>
  );
}
