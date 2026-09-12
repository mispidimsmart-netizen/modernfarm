export const EXPENSE_CATEGORIES = [
  { value: 'feed', bn: 'খাদ্য', en: 'Feed' },
  { value: 'medicine', bn: 'ওষুধ', en: 'Medicine' },
  { value: 'electricity', bn: 'বিদ্যুৎ', en: 'Electricity' },
  { value: 'labor', bn: 'শ্রমিক', en: 'Labor' },
  { value: 'maintenance', bn: 'মেরামত', en: 'Maintenance' },
  { value: 'other', bn: 'অন্যান্য', en: 'Other' },
];

export const INCOME_CATEGORIES = [
  { value: 'eggs', bn: 'ডিম বিক্রি', en: 'Egg Sales', mode: 'layer' as const },
  { value: 'culled_birds', bn: 'মুরগি বিক্রি (broiler)', en: 'Bird Sales (Broiler)', mode: 'broiler' as const },
  { value: 'spent_hen', bn: 'পুরাতন মুরগি বিক্রি', en: 'Spent Hen Sales', mode: 'layer' as const },
  { value: 'manure', bn: 'সার বিক্রি', en: 'Manure Sales', mode: 'both' as const },
  { value: 'other', bn: 'অন্যান্য', en: 'Other', mode: 'both' as const },
];

export const FINANCE_LABELS = {
  title: { bn: 'আয়-ব্যয় হিসাব', en: 'Finance' },
  summary: { bn: 'সারাংশ', en: 'Summary' },
  addExpense: { bn: 'খরচ যোগ', en: 'Add Expense' },
  addIncome: { bn: 'আয় যোগ', en: 'Add Income' },
  totalIncome: { bn: 'মোট আয়', en: 'Total Income' },
  totalExpense: { bn: 'মোট খরচ', en: 'Total Expense' },
  profit: { bn: 'লাভ', en: 'Profit' },
  loss: { bn: 'ক্ষতি', en: 'Loss' },
  category: { bn: 'ক্যাটাগরি', en: 'Category' },
  amount: { bn: 'টাকা', en: 'Amount' },
  date: { bn: 'তারিখ', en: 'Date' },
  description: { bn: 'বিবরণ', en: 'Description' },
  quantity: { bn: 'পরিমাণ', en: 'Quantity' },
  unitPrice: { bn: 'একক দাম', en: 'Unit Price' },
  save: { bn: 'সংরক্ষণ', en: 'Save' },
  taka: { bn: '৳', en: '৳' },
  last30Days: { bn: 'গত ৩০ দিন', en: 'Last 30 days' },
};

export type FinanceLabels = typeof FINANCE_LABELS;
export type Lang = 'bn' | 'en';
