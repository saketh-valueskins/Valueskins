// Map country codes to currency symbols
const countryToCurrency: Record<string, string> = {
  US: '$', CA: '$', MX: '$', AU: '$', NZ: '$',
  GB: '£', IE: '£',
  EU: '€', DE: '€', FR: '€', IT: '€', ES: '€', NL: '€', BE: '€', AT: '€', GR: '€',
  IN: '₹',
  JP: '¥', CN: '¥', KR: '₩',
  SG: 'S$', HK: 'HK$', TH: '฿', MY: 'RM',
  ZA: 'R', AE: 'د.إ', SA: '﷼',
  BR: 'R$', AR: 'ARS', CL: '$',
  SE: 'kr', NO: 'kr', DK: 'kr', CH: 'CHF',
  TR: '₺', RU: '₽', PL: 'zł',
};

export async function getCurrencySymbol(): Promise<string> {
  try {
    // Try to get country from IP using a simple endpoint
    // Falls back to $ if unavailable
    const res = await fetch('https://ipapi.co/json/', {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    if (!res.ok) return '$';

    const data = await res.json();
    const countryCode = data.country_code?.toUpperCase();

    if (!countryCode) return '$';

    // For EU countries, check if country code matches EU member
    if (countryCode && ['DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'GR', 'PT', 'FI', 'IE'].includes(countryCode)) {
      return '€';
    }

    return countryToCurrency[countryCode] || '$';
  } catch (err) {
    console.error('Currency detection failed:', err);
    return '$'; // Default to USD
  }
}
