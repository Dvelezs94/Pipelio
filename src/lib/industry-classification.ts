/**
 * Maps Google Place types/categories into simplified industries for market research.
 * Reusable utility: add new mappings here to extend coverage.
 * @see https://developers.google.com/maps/documentation/places/web-service/supported_types
 */

/** Map of Google type keywords (lowercase) to legacy local-business industries */
const GOOGLE_TYPE_TO_INDUSTRY: Record<string, string> = {
  // Food & Beverage
  restaurant: "Food & Beverage",
  cafe: "Food & Beverage",
  bar: "Food & Beverage",
  meal_takeaway: "Food & Beverage",
  meal_delivery: "Food & Beverage",
  food: "Food & Beverage",
  bakery: "Food & Beverage",
  // Automotive
  car_repair: "Automotive",
  car_dealer: "Automotive",
  car_wash: "Automotive",
  gas_station: "Automotive",
  // Healthcare
  dentist: "Healthcare",
  doctor: "Healthcare",
  hospital: "Healthcare",
  pharmacy: "Healthcare",
  physiotherapist: "Healthcare",
  veterinary_care: "Healthcare",
  // Legal
  lawyer: "Legal",
  law_firm: "Legal",
  // Real Estate
  real_estate_agency: "Real Estate",
  real_estate_agent: "Real Estate",
  // Fitness
  gym: "Fitness",
  spa: "Fitness",
  // Retail
  store: "Retail",
  clothing_store: "Retail",
  shoe_store: "Retail",
  jewelry_store: "Retail",
  home_goods_store: "Retail",
  furniture_store: "Retail",
  supermarket: "Retail",
  convenience_store: "Retail",
  // Finance
  accounting: "Finance",
  finance: "Finance",
  bank: "Finance",
  insurance_agency: "Finance",
  // Beauty
  beauty_salon: "Beauty",
  hair_care: "Beauty",
  // Home Services
  plumber: "Home Services",
  electrician: "Home Services",
  roofing_contractor: "Home Services",
  general_contractor: "Home Services",
  moving_company: "Home Services",
  locksmith: "Home Services",
  painter: "Home Services",
};

const OTHER = "Other";

/**
 * Classify a place into an industry from Google types (legacy Google Places).
 */
export function classifyIndustry(googleTypes: string[] | undefined): string {
  if (!googleTypes?.length) return OTHER;

  const normalized = googleTypes.map((t) => t.toLowerCase().replace(/\s+/g, "_"));

  for (const type of normalized) {
    if (GOOGLE_TYPE_TO_INDUSTRY[type]) return GOOGLE_TYPE_TO_INDUSTRY[type];
    for (const [key, industry] of Object.entries(GOOGLE_TYPE_TO_INDUSTRY)) {
      if (type.includes(key) || key.includes(type)) return industry;
    }
  }

  return OTHER;
}
