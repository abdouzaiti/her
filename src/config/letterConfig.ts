import type { LetterConfig } from '../types/telegram';

/**
 * Editable configuration for the romantic telegram and literary Arabic letter.
 * Modify any text below to personalize the recipient, message, postmark, and signature.
 */
export const LETTER_CONFIG: LetterConfig = {
  recipientName: 'MERIEM',
  telegramHeader: 'TÉLÉGRAMME · SERVICE D’AMOUR',
  postmarkCity: 'PARIS',
  postmarkDate: '14 NOVEMBRE',
  dispatchNumber: 'N° 042 — URGENT',
  envelopeMonogram: 'مريم',
  recipientLine: 'يا صاحبةَ الشعرِ الذهبي، يا من سكنتِ القلبَ دونَ انتظار،',
  paragraphs: [
    'في عينيكِ من سحرِ الجمالِ ما تعجزُ عنه الأشعار.\nأنتِ عاصفةٌ في طبعكِ، وأنا هدوءٌ رغمَ الإعصار،\nلكنّ قلبي لا يعرفُ أمامَ حبّكِ فرار.',
    'وفي أعماقي عالمٌ من الصمتِ والأفكار،\nوجانبٌ غامضٌ لا يدركه بشر، ولا يراهُ نهار.\nلكنّكِ وحدكِ غصتِ في أعماقي، وعرفتِ ما وراءَ الأسوار،\nورأيتِ في عتمتي ما لم ترَهُ العيون، ولا لمحته الأبصار.\nفأنتِ لقلبي سكينةٌ، ولروحي أجملُ استقرار...',
    'فإن تاهتْ بيَ الأيامُ، كنتِ ليَ الدليلَ والمنار،\nوإن ضاقتْ بيَ الدنيا، وجدتُ في قربكِ ألفَ انتصار.\nلا أطلبُ من العمرِ سوى أن نبقى معاً مهما طالَ المشوار،\nفما عرفتُ معنى الطمأنينةِ حتى صرتِ لي داراً وقرار.\nوإن سألوني عن الحبِّ، فلن أبحثَ عن وصفٍ أو اختيار،\nسأكتفي بذكرِ اسمكِ، فكلُّ المعاني فيكِ تختصرُها الأقدار.',
  ],
  closing: '',
  signature: 'مريم',
};
