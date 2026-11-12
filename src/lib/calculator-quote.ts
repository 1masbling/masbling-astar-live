import { supabase } from '@/lib/supabase';
import { uploadProjectFiles, type ProjectMediaRef } from '@/lib/project-media';

export interface CalculatorQuoteResult {
  id: string;
  subtotal: number;
  hstAmount: number;
  total: number;
}

export async function submitCalculatorQuote(serviceKeys: string[], files: File[]): Promise<CalculatorQuoteResult> {
  const media: ProjectMediaRef[] = await uploadProjectFiles(files);

  const { data, error } = await supabase.functions.invoke('submit-calculator-quote', {
    body: { services: serviceKeys, media },
  });
  if (error) throw new Error('Could not save your quote. Please try again.');
  if (!data?.success || typeof data.id !== 'string') throw new Error('Unexpected response. Please try again.');

  return {
    id: data.id,
    subtotal: Number(data.subtotal),
    hstAmount: Number(data.hstAmount),
    total: Number(data.total),
  };
}
