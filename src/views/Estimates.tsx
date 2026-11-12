
import { useState, useMemo } from 'react';
import {
  Send, CheckCircle2, Loader2, AlertCircle,
  Clock, Calculator, ShieldCheck,
  CreditCard, Banknote, Lock, ShieldAlert
} from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { uploadProjectFiles } from '@/lib/project-media';
import ProjectMediaUpload from '@/components/ProjectMediaUpload';

export default function Estimates() {
  const [gutterChecked, setGutterChecked] = useState(false);
  const [gutterTier, setGutterTier] = useState(190);

  const [leakChecked, setLeakChecked] = useState(false);
  const [extraLeaksCount, setExtraLeaksCount] = useState(0);

  const [reattachChecked, setReattachChecked] = useState(false);
  const [reattachDownpipes, setReattachDownpipes] = useState(false);
  const [reattachFascia, setReattachFascia] = useState(false);
  const [reattachSoffits, setReattachSoffits] = useState(false);
  const [reattachGutters, setReattachGutters] = useState(false);

  const [windowCaulkingChecked, setWindowCaulkingChecked] = useState(false);
  const [windowCleaningChecked, setWindowCleaningChecked] = useState(false);
  const [windowCleaningElevation, setWindowCleaningElevation] = useState<'standard' | 'high'>('standard');

  const [ventChecked, setVentChecked] = useState(false);
  const [ventCount, setVentCount] = useState(1);

  const [heatWireChecked, setHeatWireChecked] = useState(false);
  const [heatWireTier, setHeatWireTier] = useState<'standard' | 'custom'>('standard');

  const [xmasLightsChecked, setXmasLightsChecked] = useState(false);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [propertyAddress, setPropertyAddress] = useState('');

  const [paymentMethod, setPaymentMethod] = useState<'card' | 'etransfer' | null>(null);
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [cardName, setCardName] = useState('');
  const [agreedCcPolicy, setAgreedCcPolicy] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [submitted, setSubmitted] = useState(false);

  const totals = useMemo(() => {
    let subtotal = 0;
    let customQuoteFlag = false;

    if (gutterChecked) subtotal += gutterTier;
    if (leakChecked) subtotal += 170 + (extraLeaksCount * 30);
    if (reattachChecked && reattachDownpipes) subtotal += 170;
    if (reattachChecked && (reattachFascia || reattachSoffits || reattachGutters)) customQuoteFlag = true;
    if (windowCaulkingChecked) subtotal += 250;
    if (windowCleaningChecked) {
      if (windowCleaningElevation === 'standard') subtotal += 225;
      else customQuoteFlag = true;
    }

    if (ventChecked) {
      subtotal += 120 + ((ventCount - 1) * 30);
    }

    if (heatWireChecked) {
      if (heatWireTier === 'standard') subtotal += 150;
      else customQuoteFlag = true;
    }

    if (xmasLightsChecked) {
      customQuoteFlag = true;
    }

    const taxRate = 13;
    const taxAmount = (subtotal * taxRate) / 100;
    const finalTotal = subtotal + taxAmount;

    return { subtotal, taxAmount, finalTotal, customQuoteFlag };
  }, [
    gutterChecked, gutterTier, leakChecked, extraLeaksCount,
    reattachChecked, reattachDownpipes, reattachFascia, reattachSoffits, reattachGutters,
    windowCaulkingChecked, windowCleaningChecked, windowCleaningElevation,
    ventChecked, ventCount, heatWireChecked, heatWireTier, xmasLightsChecked
  ]);

  const reattachCustomQuote = reattachChecked && (reattachFascia || reattachSoffits || reattachGutters);
  const reattachHasSelection = reattachDownpipes || reattachFascia || reattachSoffits || reattachGutters;
  const windowCleaningCustomQuote = windowCleaningChecked && windowCleaningElevation === 'high';
  const heatWireCustomQuote = heatWireChecked && heatWireTier === 'custom';

  const buildServiceList = () => {
    const services: { label: string; price: number }[] = [];
    if (gutterChecked) services.push({ label: `Gutter Cleaning (${gutterTier === 190 ? 'Bungalow' : 'Two-Story House'})`, price: gutterTier });
    if (leakChecked) services.push({ label: `Leak Sealing (+${extraLeaksCount} extra joints)`, price: 170 + (extraLeaksCount * 30) });
    if (reattachChecked) {
      const reattachParts: string[] = [];
      if (reattachDownpipes) reattachParts.push('Downpipes ($170 flat)');
      if (reattachFascia) reattachParts.push('Fascia (Custom Quote)');
      if (reattachSoffits) reattachParts.push('Soffits (Custom Quote)');
      if (reattachGutters) reattachParts.push('Gutters (Custom Quote)');
      services.push({ label: `Reattachment Services (${reattachParts.join(', ')})`, price: reattachDownpipes ? 170 : 0 });
    }
    if (windowCaulkingChecked) services.push({ label: 'Window Caulking', price: 250 });
    if (windowCleaningChecked) services.push({ label: `Window Cleaning (${windowCleaningElevation === 'standard' ? 'Standard 10-12' : 'High Elevation'})`, price: windowCleaningElevation === 'standard' ? 225 : 0 });
    if (ventChecked) services.push({ label: `Vent Replacement (${ventCount} vent${ventCount > 1 ? 's' : ''})`, price: 120 + ((ventCount - 1) * 30) });
    if (heatWireChecked) services.push({ label: `Heated Wire/Cable (${heatWireTier === 'standard' ? 'Up to 25 ft' : 'Over 25 ft'})`, price: heatWireTier === 'standard' ? 150 : 0 });
    if (xmasLightsChecked) services.push({ label: 'Christmas Lights Installation & Removal (Custom Quote)', price: 0 });
    return services;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || submitting) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      const services = buildServiceList();
      const media = await uploadProjectFiles(mediaFiles);
      const { error } = await supabase.functions.invoke('submit-estimate', {
        body: {
          services,
          customerName: fullName,
          phone,
          address: propertyAddress,
          paymentMethod: paymentMethodLabel,
          subtotal: totals.subtotal,
          taxAmount: totals.taxAmount,
          total: totals.finalTotal,
          customQuoteFlag: totals.customQuoteFlag,
          mediaFiles: media,
        },
      });

      if (error) throw error;
      setSubmitted(true);
    } catch {
      setSubmitError('Something went wrong sending your estimate. Please try again or call us at 437-440-4072.');
    } finally {
      setSubmitting(false);
    }
  };

  const hasSelection = gutterChecked || leakChecked || reattachChecked || windowCaulkingChecked || windowCleaningChecked || ventChecked || heatWireChecked || xmasLightsChecked;

  const cardDigits = cardNumber.replace(/\D/g, '');
  const isCardValid = cardDigits.length === 16 && cardExpiry.length >= 4 && cardCvc.length >= 3 && cardName.trim().length > 0;
  const isEtransferValid = paymentMethod === 'etransfer';
  const canSubmit = hasSelection && fullName && phone && propertyAddress && paymentMethod !== null && (paymentMethod === 'etransfer' || (paymentMethod === 'card' && isCardValid)) && agreedCcPolicy;
  const cardLocked = paymentMethod === 'card' && !isCardValid;

  const formatCardNumber = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(.{4})/g, '$1 ').trim();
  };

  const formatExpiry = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 4);
    if (digits.length >= 3) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return digits;
  };

  const paymentMethodLabel = paymentMethod === 'card' ? 'Credit/Debit Card (Held Securely on File)' : paymentMethod === 'etransfer' ? 'E-Transfer' : 'None Selected';

  if (submitted) {
    return <SuccessScreen onReset={() => setSubmitted(false)} />;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-4 text-navy-50 animate-fade-in">
      {/* Branding Header Ribbon */}
      <div className="flex items-center justify-between border-b border-navy-700 pb-4 flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold font-display flex items-center gap-2">
            <Calculator className="w-5 h-5 text-gold-400" />
            Interactive Estimate Engine
          </h2>
          <p className="text-xs text-navy-300 mt-0.5">Stack multiple services to compile your exterior maintenance pricing locally</p>
        </div>
        <div className="text-xs font-semibold text-teal-400 bg-navy-800/40 border border-navy-700 rounded-lg px-3 py-1.5 flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Local Mail Sandbox</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Interactive Input Option Tiers */}
        <div className="lg:col-span-2 space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-navy-400 mb-1">1. Choose Structural Maintenance Options</p>

          {/* Item 1: Gutter Cleaning */}
          <div className={`card p-4 border transition-all rounded-xl ${gutterChecked ? 'border-gold-400 bg-navy-800/60 shadow-lg' : 'border-navy-700 bg-navy-800/20'}`}>
            <div className="flex items-start justify-between gap-3">
              <label className="flex items-start gap-3 cursor-pointer select-none flex-1">
                <input type="checkbox" checked={gutterChecked} onChange={(e) => setGutterChecked(e.target.checked)} className="mt-1 accent-gold-400 w-4 h-4" />
                <div>
                  <span className="text-sm font-bold block">Gutter Cleaning</span>
                  <span className="text-xs text-navy-300 block mt-0.5">Debris clearance extraction, flushing downpipes, and muck clearing. $190 for a 1-story bungalow, $220+ for a two-story house.</span>
                </div>
              </label>
              <span className="text-sm font-black text-gold-400 shrink-0">{gutterChecked ? formatCurrency(gutterTier) : '$0.00'}</span>
            </div>
            {gutterChecked && (
              <div className="mt-3 pt-3 border-t border-dashed border-navy-700 animate-slide-up flex gap-3 items-center">
                <span className="text-[11px] font-semibold text-navy-300">Property Elevation Type:</span>
                <div className="flex gap-2 flex-1">
                  <button type="button" onClick={() => setGutterTier(190)} className={`flex-1 text-xs py-1.5 px-3 rounded-lg border font-semibold ${gutterTier === 190 ? 'bg-gold-400 text-navy-950 border-gold-400' : 'bg-navy-900 text-navy-300 border-navy-700 hover:border-navy-600'}`}>Bungalow ($190.00)</button>
                  <button type="button" onClick={() => setGutterTier(220)} className={`flex-1 text-xs py-1.5 px-3 rounded-lg border font-semibold ${gutterTier === 220 ? 'bg-gold-400 text-navy-950 border-gold-400' : 'bg-navy-900 text-navy-300 border-navy-700 hover:border-navy-600'}`}>Two-Story House ($220.00+)</button>
                </div>
              </div>
            )}
          </div>

          {/* Item 2: Leak Sealing */}
          <div className={`card p-4 border transition-all rounded-xl ${leakChecked ? 'border-gold-400 bg-navy-800/60 shadow-lg' : 'border-navy-700 bg-navy-800/20'}`}>
            <div className="flex items-start justify-between gap-3">
              <label className="flex items-start gap-3 cursor-pointer select-none flex-1">
                <input type="checkbox" checked={leakChecked} onChange={(e) => setLeakChecked(e.target.checked)} className="mt-1 accent-gold-400 w-4 h-4" />
                <div>
                  <span className="text-sm font-bold block">Leak Sealing</span>
                  <span className="text-xs text-navy-300 block mt-0.5">$170 service and material plus $30 for each additional leak joints.</span>
                </div>
              </label>
              <span className="text-sm font-black text-gold-400 shrink-0">{leakChecked ? formatCurrency(170 + (extraLeaksCount * 30)) : '$0.00'}</span>
            </div>
            {leakChecked && (
              <div className="mt-3 pt-3 border-t border-dashed border-navy-700 animate-slide-up flex items-center justify-between gap-3">
                <span className="text-[11px] font-semibold text-navy-300">Additional Leak Joints (+$30.00 each):</span>
                <div className="flex items-center gap-1.5 bg-navy-950 border border-navy-700 rounded-lg px-2 py-1">
                  <button type="button" disabled={extraLeaksCount <= 0} onClick={() => setExtraLeaksCount(prev => prev - 1)} className="text-navy-300 text-sm font-bold px-1.5 hover:text-navy-100 disabled:opacity-20">-</button>
                  <span className="text-sm font-bold text-navy-50 min-w-[1.5rem] text-center tabular-nums">{extraLeaksCount}</span>
                  <button type="button" disabled={extraLeaksCount >= 20} onClick={() => setExtraLeaksCount(prev => prev + 1)} className="text-navy-300 text-sm font-bold px-1.5 hover:text-navy-100 disabled:opacity-20">+</button>
                </div>
              </div>
            )}
          </div>

          {/* Item 3: Reattachment Services */}
          <div className={`card p-4 border transition-all rounded-xl ${reattachChecked ? 'border-gold-400 bg-navy-800/60 shadow-lg' : 'border-navy-700 bg-navy-800/20'}`}>
            <div className="flex items-start justify-between gap-3">
              <label className="flex items-start gap-3 cursor-pointer select-none flex-1">
                <input type="checkbox" checked={reattachChecked} onChange={(e) => { setReattachChecked(e.target.checked); if (!e.target.checked) { setReattachDownpipes(false); setReattachFascia(false); setReattachSoffits(false); setReattachGutters(false); } }} className="mt-1 accent-gold-400 w-4 h-4" />
                <div>
                  <span className="text-sm font-bold block">Reattachment Services</span>
                  <span className="text-xs text-navy-300 block mt-0.5">Downpipes reattach: $170 flat. For fascia, soffits, and gutters, pricing varies (Custom Quote Required).</span>
                </div>
              </label>
              <span className="text-sm font-black text-gold-400 shrink-0">
                {reattachChecked ? (reattachCustomQuote ? 'Custom Quote' : reattachDownpipes ? formatCurrency(170) : '$0.00') : '$0.00'}
              </span>
            </div>
            {reattachChecked && (
              <div className="mt-3 pt-3 border-t border-dashed border-navy-700 animate-slide-up space-y-2">
                <span className="text-[11px] font-semibold text-navy-300 block">Select reattachment type(s):</span>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setReattachDownpipes(!reattachDownpipes)} className={`text-xs py-1.5 px-3 rounded-lg border font-semibold transition-all ${reattachDownpipes ? 'bg-gold-400 text-navy-950 border-gold-400' : 'bg-navy-900 text-navy-300 border-navy-700 hover:border-navy-600'}`}>Downpipes ($170)</button>
                  <button type="button" onClick={() => setReattachFascia(!reattachFascia)} className={`text-xs py-1.5 px-3 rounded-lg border font-semibold transition-all ${reattachFascia ? 'bg-gold-400 text-navy-950 border-gold-400' : 'bg-navy-900 text-navy-300 border-navy-700 hover:border-navy-600'}`}>Fascia (Custom)</button>
                  <button type="button" onClick={() => setReattachSoffits(!reattachSoffits)} className={`text-xs py-1.5 px-3 rounded-lg border font-semibold transition-all ${reattachSoffits ? 'bg-gold-400 text-navy-950 border-gold-400' : 'bg-navy-900 text-navy-300 border-navy-700 hover:border-navy-600'}`}>Soffits (Custom)</button>
                  <button type="button" onClick={() => setReattachGutters(!reattachGutters)} className={`text-xs py-1.5 px-3 rounded-lg border font-semibold transition-all ${reattachGutters ? 'bg-gold-400 text-navy-950 border-gold-400' : 'bg-navy-900 text-navy-300 border-navy-700 hover:border-navy-600'}`}>Gutters (Custom)</button>
                </div>
                {reattachCustomQuote && (
                  <div className="flex items-center gap-2 text-[11px] text-gold-300 bg-gold-900/20 border border-gold-700/50 rounded-lg px-3 py-2">
                    <Clock className="w-3 h-3 shrink-0" />
                    <span>Fascia, soffits, and gutters require an on-site custom quote evaluation.</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Item 4: Window Caulking */}
          <div className={`card p-4 border transition-all rounded-xl ${windowCaulkingChecked ? 'border-gold-400 bg-navy-800/60 shadow-lg' : 'border-navy-700 bg-navy-800/20'}`}>
            <div className="flex items-start justify-between gap-3">
              <label className="flex items-start gap-3 cursor-pointer select-none flex-1">
                <input type="checkbox" checked={windowCaulkingChecked} onChange={(e) => setWindowCaulkingChecked(e.target.checked)} className="mt-1 accent-gold-400 w-4 h-4" />
                <div>
                  <span className="text-sm font-bold block">Window Caulking</span>
                  <span className="text-xs text-navy-300 block mt-0.5">Professional sealant application around window frames. Flat baseline of $250.00.</span>
                </div>
              </label>
              <span className="text-sm font-black text-gold-400 shrink-0">{windowCaulkingChecked ? formatCurrency(250) : '$0.00'}</span>
            </div>
          </div>

          {/* Item 5: Window Cleaning */}
          <div className={`card p-4 border transition-all rounded-xl ${windowCleaningChecked ? 'border-gold-400 bg-navy-800/60 shadow-lg' : 'border-navy-700 bg-navy-800/20'}`}>
            <div className="flex items-start justify-between gap-3">
              <label className="flex items-start gap-3 cursor-pointer select-none flex-1">
                <input type="checkbox" checked={windowCleaningChecked} onChange={(e) => { setWindowCleaningChecked(e.target.checked); if (!e.target.checked) setWindowCleaningElevation('standard'); }} className="mt-1 accent-gold-400 w-4 h-4" />
                <div>
                  <span className="text-sm font-bold block">Window Cleaning</span>
                  <span className="text-xs text-navy-300 block mt-0.5">Standard elevation (10–12 windows) $225.00 flat. High elevation or multi-pane (12+ windows) requires a custom quote.</span>
                </div>
              </label>
              <span className="text-sm font-black text-gold-400 shrink-0">{windowCleaningChecked ? (windowCleaningCustomQuote ? 'Custom Quote' : formatCurrency(225)) : '$0.00'}</span>
            </div>
            {windowCleaningChecked && (
              <div className="mt-3 pt-3 border-t border-dashed border-navy-700 animate-slide-up flex gap-3 items-center">
                <span className="text-[11px] font-semibold text-navy-300">Elevation Type:</span>
                <div className="flex gap-2 flex-1">
                  <button type="button" onClick={() => setWindowCleaningElevation('standard')} className={`flex-1 text-xs py-1.5 px-3 rounded-lg border font-semibold ${windowCleaningElevation === 'standard' ? 'bg-gold-400 text-navy-950 border-gold-400' : 'bg-navy-900 text-navy-300 border-navy-700 hover:border-navy-600'}`}>Standard (10–12) $225</button>
                  <button type="button" onClick={() => setWindowCleaningElevation('high')} className={`flex-1 text-xs py-1.5 px-3 rounded-lg border font-semibold ${windowCleaningElevation === 'high' ? 'bg-gold-400 text-navy-950 border-gold-400' : 'bg-navy-900 text-navy-300 border-navy-700 hover:border-navy-600'}`}>High / Multi-Pane (12+) Custom</button>
                </div>
              </div>
            )}
            {windowCleaningCustomQuote && (
              <div className="mt-2 flex items-center gap-2 text-[11px] text-gold-300 bg-gold-900/20 border border-gold-700/50 rounded-lg px-3 py-2 animate-slide-up">
                <Clock className="w-3 h-3 shrink-0" />
                <span>High elevation or multi-pane properties (12+ windows) require an on-site custom quote evaluation.</span>
              </div>
            )}
          </div>

          {/* Item 6: Vent Replacement */}
          <div className={`card p-4 border transition-all rounded-xl ${ventChecked ? 'border-gold-400 bg-navy-800/60 shadow-lg' : 'border-navy-700 bg-navy-800/20'}`}>
            <div className="flex items-start justify-between gap-3">
              <label className="flex items-start gap-3 cursor-pointer select-none flex-1">
                <input type="checkbox" checked={ventChecked} onChange={(e) => setVentChecked(e.target.checked)} className="mt-1 accent-gold-400 w-4 h-4" />
                <div>
                  <span className="text-sm font-bold block">Vent Replacement</span>
                  <span className="text-xs text-navy-300 block mt-0.5">Replace damaged or deteriorated vents. $120 for the first vent unit, plus $30 for each additional vent.</span>
                </div>
              </label>
              <span className="text-sm font-black text-gold-400 shrink-0">{ventChecked ? formatCurrency(120 + ((ventCount - 1) * 30)) : '$0.00'}</span>
            </div>
            {ventChecked && (
              <div className="mt-3 pt-3 border-t border-dashed border-navy-700 animate-slide-up flex items-center justify-between gap-3">
                <span className="text-[11px] font-semibold text-navy-300">Number of Vents:</span>
                <div className="flex items-center gap-1.5 bg-navy-950 border border-navy-700 rounded-lg px-2 py-1">
                  <button type="button" disabled={ventCount <= 1} onClick={() => setVentCount(prev => prev - 1)} className="text-navy-300 text-sm font-bold px-1.5 hover:text-navy-100 disabled:opacity-20">-</button>
                  <span className="text-sm font-bold text-navy-50 min-w-[1.5rem] text-center tabular-nums">{ventCount}</span>
                  <button type="button" disabled={ventCount >= 20} onClick={() => setVentCount(prev => prev + 1)} className="text-navy-300 text-sm font-bold px-1.5 hover:text-navy-100 disabled:opacity-20">+</button>
                </div>
              </div>
            )}
          </div>

          {/* Item 7: Heated Wire/Cable Installation */}
          <div className={`card p-4 border transition-all rounded-xl ${heatWireChecked ? 'border-gold-400 bg-navy-800/60 shadow-lg' : 'border-navy-700 bg-navy-800/20'}`}>
            <div className="flex items-start justify-between gap-3">
              <label className="flex items-start gap-3 cursor-pointer select-none flex-1">
                <input type="checkbox" checked={heatWireChecked} onChange={(e) => { setHeatWireChecked(e.target.checked); if (!e.target.checked) setHeatWireTier('standard'); }} className="mt-1 accent-gold-400 w-4 h-4" />
                <div>
                  <span className="text-sm font-bold block">Heated Wire/Cable Installation</span>
                  <span className="text-xs text-navy-300 block mt-0.5">Heated cable to prevent ice dams. $150.00 for up to 25 linear feet. Lengths exceeding 25 linear feet require a custom quote.</span>
                </div>
              </label>
              <span className="text-sm font-black text-gold-400 shrink-0">
                {heatWireChecked ? (heatWireCustomQuote ? 'Custom Quote' : formatCurrency(150)) : '$0.00'}
              </span>
            </div>
            {heatWireChecked && (
              <div className="mt-3 pt-3 border-t border-dashed border-navy-700 animate-slide-up flex gap-3 items-center">
                <span className="text-[11px] font-semibold text-navy-300">Cable Length:</span>
                <div className="flex gap-2 flex-1">
                  <button type="button" onClick={() => setHeatWireTier('standard')} className={`flex-1 text-xs py-1.5 px-3 rounded-lg border font-semibold ${heatWireTier === 'standard' ? 'bg-gold-400 text-navy-950 border-gold-400' : 'bg-navy-900 text-navy-300 border-navy-700 hover:border-navy-600'}`}>Up to 25 ft ($150)</button>
                  <button type="button" onClick={() => setHeatWireTier('custom')} className={`flex-1 text-xs py-1.5 px-3 rounded-lg border font-semibold ${heatWireTier === 'custom' ? 'bg-gold-400 text-navy-950 border-gold-400' : 'bg-navy-900 text-navy-300 border-navy-700 hover:border-navy-600'}`}>Over 25 ft (Custom)</button>
                </div>
              </div>
            )}
            {heatWireCustomQuote && (
              <div className="mt-2 flex items-center gap-2 text-[11px] text-gold-300 bg-gold-900/20 border border-gold-700/50 rounded-lg px-3 py-2 animate-slide-up">
                <Clock className="w-3 h-3 shrink-0" />
                <span>Lengths exceeding 25 linear feet require an on-site custom quote evaluation.</span>
              </div>
            )}
          </div>

          {/* Item 8: Christmas Lights Installation & Removal */}
          <div className={`card p-4 border transition-all rounded-xl ${xmasLightsChecked ? 'border-gold-400 bg-navy-800/60 shadow-lg' : 'border-navy-700 bg-navy-800/20'}`}>
            <div className="flex items-start justify-between gap-3">
              <label className="flex items-start gap-3 cursor-pointer select-none flex-1">
                <input type="checkbox" checked={xmasLightsChecked} onChange={(e) => setXmasLightsChecked(e.target.checked)} className="mt-1 accent-gold-400 w-4 h-4" />
                <div>
                  <span className="text-sm font-bold block">Christmas Lights Installation & Removal</span>
                  <span className="text-xs text-navy-300 block mt-0.5">Professional holiday lighting installation and post-season removal. Custom Quote Required.</span>
                </div>
              </label>
              <span className="text-sm font-black text-gold-400 shrink-0">
                {xmasLightsChecked ? 'Custom Quote' : '$0.00'}
              </span>
            </div>
            {xmasLightsChecked && (
              <div className="mt-3 pt-3 border-t border-dashed border-navy-700 animate-slide-up">
                <div className="flex items-center gap-2 text-[11px] text-gold-300 bg-gold-900/20 border border-gold-700/50 rounded-lg px-3 py-2">
                  <Clock className="w-3 h-3 shrink-0" />
                  <span>Pricing varies based on property size, lighting design, and installation complexity. An on-site custom quote evaluation is required.</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Live Calculation Summary */}
        <div className="lg:col-span-1">
          <div className="card sticky top-4 rounded-xl border border-navy-700 bg-navy-800/40 overflow-hidden">
            <div className="px-4 py-3 border-b border-navy-700 bg-navy-900/50">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Calculator className="w-4 h-4 text-gold-400" />
                Live Estimate Summary
              </h3>
            </div>

            <div className="p-4 space-y-2">
              {!hasSelection && (
                <p className="text-xs text-navy-400 text-center py-6">Select services to see pricing</p>
              )}

              {gutterChecked && (
                <div className="flex justify-between text-xs">
                  <span className="text-navy-300">Gutter Cleaning ({gutterTier === 190 ? 'Bungalow' : '2-Story'})</span>
                  <span className="font-semibold text-navy-50">{formatCurrency(gutterTier)}</span>
                </div>
              )}
              {leakChecked && (
                <div className="flex justify-between text-xs">
                  <span className="text-navy-300">Leak Sealing {extraLeaksCount > 0 && `(+${extraLeaksCount} joints)`}</span>
                  <span className="font-semibold text-navy-50">{formatCurrency(170 + (extraLeaksCount * 30))}</span>
                </div>
              )}
              {reattachChecked && (
                <div className="flex justify-between text-xs">
                  <span className="text-navy-300">Reattachment {reattachDownpipes && 'Downpipes'}</span>
                  <span className="font-semibold text-navy-50">{reattachDownpipes ? formatCurrency(170) : '$0.00'}</span>
                </div>
              )}
              {reattachCustomQuote && (
                <div className="flex justify-between text-xs">
                  <span className="text-gold-400 font-semibold">Reattachment (Fascia/Soffits/Gutters)</span>
                  <span className="font-semibold text-gold-400">Custom Quote</span>
                </div>
              )}
              {windowCaulkingChecked && (
                <div className="flex justify-between text-xs">
                  <span className="text-navy-300">Window Caulking</span>
                  <span className="font-semibold text-navy-50">{formatCurrency(250)}</span>
                </div>
              )}
              {windowCleaningChecked && (
                <div className="flex justify-between text-xs">
                  <span className={windowCleaningCustomQuote ? 'text-gold-400 font-semibold' : 'text-navy-300'}>Window Cleaning {windowCleaningElevation === 'high' && '(High Elevation)'}</span>
                  <span className={windowCleaningCustomQuote ? 'font-semibold text-gold-400' : 'font-semibold text-navy-50'}>{windowCleaningCustomQuote ? 'Custom Quote' : formatCurrency(225)}</span>
                </div>
              )}
              {ventChecked && (
                <div className="flex justify-between text-xs">
                  <span className="text-navy-300">Vent Replacement ({ventCount} vent{ventCount > 1 ? 's' : ''})</span>
                  <span className="font-semibold text-navy-50">{formatCurrency(120 + ((ventCount - 1) * 30))}</span>
                </div>
              )}
              {heatWireChecked && (
                <div className="flex justify-between text-xs">
                  <span className={heatWireCustomQuote ? 'text-gold-400 font-semibold' : 'text-navy-300'}>Heated Wire/Cable {heatWireTier === 'custom' && '(Over 25 ft)'}</span>
                  <span className={heatWireCustomQuote ? 'font-semibold text-gold-400' : 'font-semibold text-navy-50'}>{heatWireCustomQuote ? 'Custom Quote' : formatCurrency(150)}</span>
                </div>
              )}
              {xmasLightsChecked && (
                <div className="flex justify-between text-xs">
                  <span className="text-gold-400 font-semibold">Christmas Lights</span>
                  <span className="font-semibold text-gold-400">Custom Quote</span>
                </div>
              )}

              {hasSelection && (
                <>
                  <div className="border-t border-navy-700 pt-2 mt-2 space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-navy-400">Subtotal</span>
                      <span className="font-semibold text-navy-50 tabular-nums">${totals.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-navy-400">HST (13%)</span>
                      <span className="font-semibold text-navy-50 tabular-nums">${totals.taxAmount.toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="border-t border-navy-700 pt-2 flex justify-between items-baseline">
                    <span className="text-sm font-bold text-navy-200">Estimated Total</span>
                    <span className="text-lg font-black text-gold-400 tabular-nums">${totals.finalTotal.toFixed(2)}</span>
                  </div>
                  {totals.customQuoteFlag && (
                    <div className="mt-2 text-[11px] text-gold-300 bg-gold-900/20 border border-gold-700/50 rounded-lg px-3 py-2 flex items-start gap-1.5">
                      <Clock className="w-3 h-3 mt-0.5 shrink-0" />
                      <span>Some items require an on-site evaluation for a final custom quote.</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Payment Method Selection */}
      <div className="card rounded-xl border border-navy-700 bg-navy-800/40 p-5 space-y-4">
        <p className="text-xs font-bold uppercase tracking-wider text-navy-400">2. Select Payment Method</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Credit Card Option */}
          <button
            type="button"
            onClick={() => setPaymentMethod('card')}
            className={`text-left p-4 rounded-xl border-2 transition-all ${paymentMethod === 'card' ? 'border-gold-400 bg-navy-800/60 shadow-lg scale-[1.01]' : 'border-navy-700 bg-navy-900/40 hover:border-navy-600'}`}
          >
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg transition-colors ${paymentMethod === 'card' ? 'bg-gold-400 text-navy-950' : 'bg-navy-800 text-navy-400'}`}>
                <CreditCard className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <span className="text-sm font-bold block">Pay by Credit/Debit Card</span>
                <span className="text-[11px] text-navy-300 block mt-0.5">Card held securely on file to lock your booking slots</span>
              </div>
              {paymentMethod === 'card' && <CheckCircle2 className="w-4 h-4 text-gold-400 shrink-0 mt-0.5" />}
            </div>
          </button>

          {/* E-Transfer Option */}
          <button
            type="button"
            onClick={() => setPaymentMethod('etransfer')}
            className={`text-left p-4 rounded-xl border-2 transition-all ${paymentMethod === 'etransfer' ? 'border-gold-400 bg-navy-800/60 shadow-lg scale-[1.01]' : 'border-navy-700 bg-navy-900/40 hover:border-navy-600'}`}
          >
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg transition-colors ${paymentMethod === 'etransfer' ? 'bg-gold-400 text-navy-950' : 'bg-navy-800 text-navy-400'}`}>
                <Banknote className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <span className="text-sm font-bold block">Pay via E-Transfer</span>
                <span className="text-[11px] text-navy-300 block mt-0.5">Send payment by Interac e-Transfer after job completion</span>
              </div>
              {paymentMethod === 'etransfer' && <CheckCircle2 className="w-4 h-4 text-gold-400 shrink-0 mt-0.5" />}
            </div>
          </button>
        </div>

        {/* Card on File Details Form */}
        {paymentMethod === 'card' && (
          <div className="space-y-4">
            <div className="rounded-xl border border-navy-700 bg-navy-900/50 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-gold-400" />
                <span className="text-sm font-bold text-navy-50">Card on File Details <span className="text-gold-400">(Required in Advance to Secure Booking)</span></span>
              </div>

              {/* Card Number */}
              <div>
                <label className="block text-[11px] font-semibold text-navy-400 mb-1">Card Number</label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                    placeholder="0000 0000 0000 0000"
                    maxLength={19}
                    className={`w-full bg-navy-950 border rounded-lg px-3 py-2.5 text-sm text-navy-50 placeholder:text-navy-600 focus:outline-none transition-colors font-mono tracking-wider pr-10 ${cardDigits.length === 16 ? 'border-success-600 focus:border-success-500' : 'border-navy-700 focus:border-gold-400'}`}
                  />
                  <CreditCard className="w-4 h-4 text-navy-500 absolute right-3 top-1/2 -translate-y-1/2" />
                </div>
                {cardNumber && cardDigits.length < 16 && (
                  <p className="text-[11px] text-navy-400 mt-1">{16 - cardDigits.length} digit(s) remaining</p>
                )}
                {cardDigits.length === 16 && (
                  <p className="text-[11px] text-success-300 mt-1 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> 16-digit card number entered</p>
                )}
              </div>

              {/* Expiry, CVC, Name row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-navy-400 mb-1">Expiry (MM/YY)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={cardExpiry}
                    onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                    placeholder="MM/YY"
                    maxLength={5}
                    className="w-full bg-navy-950 border border-navy-700 rounded-lg px-3 py-2.5 text-sm text-navy-50 placeholder:text-navy-600 focus:border-gold-400 focus:outline-none transition-colors font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-navy-400 mb-1">CVC</label>
                  <input
                    type="password"
                    inputMode="numeric"
                    value={cardCvc}
                    onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="•••"
                    maxLength={4}
                    className="w-full bg-navy-950 border border-navy-700 rounded-lg px-3 py-2.5 text-sm text-navy-50 placeholder:text-navy-600 focus:border-gold-400 focus:outline-none transition-colors font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-navy-400 mb-1">Name on Card</label>
                  <input
                    type="text"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full bg-navy-950 border border-navy-700 rounded-lg px-3 py-2.5 text-sm text-navy-50 placeholder:text-navy-600 focus:border-gold-400 focus:outline-none transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Security Hold Policy Disclaimer */}
            <div className="rounded-xl border border-amber-600/40 bg-amber-900/15 p-4 flex items-start gap-3">
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-[11px] font-bold text-amber-300 uppercase tracking-wide mb-1">Security Hold Policy</p>
                <p className="text-[11px] text-amber-100/80 leading-relaxed">
                  In accordance with standard service platform guidelines (Jiffy/Housecall model), your credit card is held securely on file to lock your booking slots. No payment is drawn or finalized until before-and-after project area completion photos are dispatched directly to your confirmation email.
                </p>
              </div>
            </div>
          </div>
        )}

        {paymentMethod === 'etransfer' && (
          <div className="animate-slide-up rounded-xl border border-navy-700 bg-navy-900/50 p-4 flex items-start gap-3">
            <Banknote className="w-4 h-4 text-gold-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-navy-300 leading-relaxed">
              You will receive an Interac e-Transfer request to your email after project completion. Before-and-after photos will be included in your confirmation email prior to payment being sent.
            </p>
          </div>
        )}
      </div>

      {/* Client Information & Dispatch Form */}
      <div className="card rounded-xl border border-navy-700 bg-navy-800/40 p-5 space-y-4">
        <p className="text-xs font-bold uppercase tracking-wider text-navy-400">3. Enter Your Contact Details</p>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-navy-400 mb-1">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              placeholder="John Doe"
              className="w-full bg-navy-900 border border-navy-700 rounded-lg px-3 py-2 text-sm text-navy-50 placeholder:text-navy-600 focus:border-gold-400 focus:outline-none transition-colors"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-navy-400 mb-1">Phone</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              placeholder="437-440-4072"
              className="w-full bg-navy-900 border border-navy-700 rounded-lg px-3 py-2 text-sm text-navy-50 placeholder:text-navy-600 focus:border-gold-400 focus:outline-none transition-colors"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-navy-400 mb-1">Property Address</label>
            <input
              type="text"
              value={propertyAddress}
              onChange={(e) => setPropertyAddress(e.target.value)}
              required
              placeholder="123 Main St, Brampton ON"
              className="w-full bg-navy-900 border border-navy-700 rounded-lg px-3 py-2 text-sm text-navy-50 placeholder:text-navy-600 focus:border-gold-400 focus:outline-none transition-colors"
            />
          </div>

          {/* Credit Card on File Policy */}
          <div className="sm:col-span-3 mt-1">
            <div className="rounded-xl border p-4" style={{ borderColor: 'rgba(48,166,224,0.4)', background: 'rgba(15,29,58,0.6)' }}>
              <div className="flex items-center gap-2 mb-3">
                <CreditCard className="w-4 h-4" style={{ color: '#30a6e0' }} />
                <p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#30a6e0' }}>Booking Policy — Credit Card on File</p>
              </div>
              <button
                type="button"
                onClick={() => setAgreedCcPolicy(!agreedCcPolicy)}
                className="w-full flex items-start gap-3 rounded-lg border px-3 py-3 transition-all"
                style={{
                  borderColor: agreedCcPolicy ? '#fbbe02' : '#01519f',
                  background: agreedCcPolicy ? 'rgba(251,190,2,0.1)' : '#0f1d3a',
                }}
              >
                <div
                  className="flex items-center justify-center w-5 h-5 rounded-md shrink-0 transition-all mt-0.5"
                  style={{ background: agreedCcPolicy ? '#fbbe02' : '#01519f' }}
                >
                  {agreedCcPolicy && <CheckCircle2 className="w-3.5 h-3.5" style={{ color: '#0f1d3a' }} />}
                </div>
                <span
                  className="text-xs leading-relaxed text-left"
                  style={{ color: agreedCcPolicy ? '#ffffff' : '#cbd5e1' }}
                >
                  I understand that a valid credit card must be placed on file in advance to secure my booking slot. Payment will only be processed after before-and-after photos of the completed service are sent to me.
                </span>
              </button>
            </div>
          </div>

          {submitError && (
            <div className="sm:col-span-3 flex items-center gap-2 text-xs text-error-300 bg-error-900/20 border border-error-700/50 rounded-lg px-3 py-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          <div className="sm:col-span-3 flex items-center justify-end gap-4 pt-2">
            <button
              type="submit"
              disabled={!canSubmit || submitting}
              className={`flex items-center gap-2 font-bold text-sm px-5 py-2.5 rounded-lg transition-colors ${canSubmit && !submitting ? 'bg-gold-400 hover:bg-gold-300 text-navy-950' : 'bg-navy-700 text-navy-500 cursor-not-allowed'}`}
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {submitting ? 'Sending...' : 'Send Estimate Request'}
            </button>
          </div>
        </form>
      </div>

      {/* Quick Status Indicators */}
      {hasSelection && (
        <div className="flex flex-wrap gap-2">
          {gutterChecked && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-success-300 bg-success-900/30 border border-success-700/50 rounded-full px-2.5 py-1">
              <CheckCircle2 className="w-3 h-3" /> Gutter
            </span>
          )}
          {leakChecked && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-success-300 bg-success-900/30 border border-success-700/50 rounded-full px-2.5 py-1">
              <CheckCircle2 className="w-3 h-3" /> Leak Sealing
            </span>
          )}
          {reattachChecked && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-success-300 bg-success-900/30 border border-success-700/50 rounded-full px-2.5 py-1">
              <CheckCircle2 className="w-3 h-3" /> Reattachment
            </span>
          )}
          {windowCaulkingChecked && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-success-300 bg-success-900/30 border border-success-700/50 rounded-full px-2.5 py-1">
              <CheckCircle2 className="w-3 h-3" /> Window Caulking
            </span>
          )}
          {windowCleaningChecked && (
            <span className={`inline-flex items-center gap-1 text-[11px] font-semibold rounded-full px-2.5 py-1 ${windowCleaningCustomQuote ? 'text-gold-400 bg-gold-900/30 border border-gold-700/50' : 'text-success-300 bg-success-900/30 border border-success-700/50'}`}>
              {windowCleaningCustomQuote ? <Clock className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />} Window Cleaning {windowCleaningCustomQuote ? '(Custom Quote)' : ''}
            </span>
          )}
          {ventChecked && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-success-300 bg-success-900/30 border border-success-700/50 rounded-full px-2.5 py-1">
              <CheckCircle2 className="w-3 h-3" /> Vent Replacement
            </span>
          )}
          {heatWireChecked && (
            <span className={`inline-flex items-center gap-1 text-[11px] font-semibold rounded-full px-2.5 py-1 ${heatWireCustomQuote ? 'text-gold-400 bg-gold-900/30 border border-gold-700/50' : 'text-success-300 bg-success-900/30 border border-success-700/50'}`}>
              {heatWireCustomQuote ? <Clock className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />} Heated Wire {heatWireCustomQuote ? '(Custom Quote)' : '($150)'}
            </span>
          )}
          {xmasLightsChecked && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-gold-400 bg-gold-900/30 border border-gold-700/50 rounded-full px-2.5 py-1">
              <Clock className="w-3 h-3" /> Christmas Lights (Custom Quote)
            </span>
          )}
        </div>
      )}

      <ProjectMediaUpload files={mediaFiles} onFilesChange={setMediaFiles} disabled={submitting} />
    </div>
  );
}

function SuccessScreen({ onReset }: { onReset: () => void }) {
  return (
    <div className="max-w-2xl mx-auto p-4 animate-fade-in">
      <div className="card rounded-xl border border-success-700/50 bg-navy-800/40 p-8 text-center space-y-5">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-success-900/40 border border-success-700/50 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-success-400" />
          </div>
        </div>
        <h2 className="text-xl font-bold font-display text-navy-50">Thank You!</h2>
        <p className="text-sm text-navy-200 leading-relaxed">
          Your estimate request has been securely submitted. A team member will contact you shortly to finalize your slot.
        </p>
        <button
          onClick={onReset}
          className="inline-flex items-center gap-2 font-bold text-sm px-5 py-2.5 rounded-lg bg-gold-400 hover:bg-gold-300 text-navy-950 transition-colors"
        >
          <Calculator className="w-4 h-4" />
          Start a New Estimate
        </button>
      </div>
    </div>
  );
}
