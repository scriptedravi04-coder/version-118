export function formatEnglishNotification(message) {
  if (!message || typeof message !== 'string') return message;
  let text = message;

  // KYC Approved Hinglish -> English
  text = text.replace(/KYC Approved!\s*Ab aap platform fully use kar sakte ho\.?/gi, 'KYC Approved! You can now fully use the platform.');
  text = text.replace(/KYC Approved!\s*Ab aap platform fully use kar sakte hain\.?/gi, 'KYC Approved! You can now fully use the platform.');

  // Brand contact Hinglish -> English
  text = text.replace(/(.+) ne aapko "(.+)" ke liye contact kiya!/gi, '$1 contacted you for "$2"!');
  text = text.replace(/(.+) ne aapko (.+) ke liye contact kiya!/gi, '$1 contacted you for $2!');

  // Payment method review Hinglish -> English
  text = text.replace(/(.+) ka naya payment method review ke liye hai/gi, "$1's new payment method is under review.");

  // Wave Hinglish -> English
  text = text.replace(/(.+) ne aapko wave kiya!/gi, '$1 waved at you!');

  // Category rejection Hinglish -> English
  text = text.replace(/Yeh category allowed nahi hai\.?/gi, 'This category is not allowed.');

  return text;
}
