import { redirect } from 'next/navigation';

// "/" biasanya sudah disajikan oleh rewrite di next.config.mjs. Ini hanya cadangan.
export default function Page() {
  redirect('/bom-air-rimba.html');
}
