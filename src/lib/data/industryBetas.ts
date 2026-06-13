/**
 * Damodaran India industry unlevered betas — January 2026.
 *
 * Source file: input_data/betaIndia.xls
 * Published annually each January by A. Damodaran, NYU Stern.
 * https://pages.stern.nyu.edu/~adamodar/
 *
 * Column used: "Unlevered beta" (D/E and effective tax rate from the same dataset).
 * Homebuilding and Utility (General) omitted (negative / N/A values).
 */

export interface Industry {
  id: string
  name: string
  unleveredBeta: number
  sectorHint?: string
}

export const INDUSTRY_BETAS: Industry[] = [
  { id: 'advertising',      name: 'Advertising',                      unleveredBeta: 1.357  },
  { id: 'aerospace',        name: 'Aerospace / Defence',               unleveredBeta: 1.366, sectorHint: 'HAL, BEL, MTAR' },
  { id: 'apparel',          name: 'Apparel',                           unleveredBeta: 0.492  },
  { id: 'auto_truck',       name: 'Auto & Truck',                      unleveredBeta: 1.080, sectorHint: 'MARUTI, TATAMOTORS' },
  { id: 'auto_parts',       name: 'Auto Parts',                        unleveredBeta: 0.881, sectorHint: 'BOSCH, MOTHERSUMI' },
  { id: 'banking',          name: 'Banking',                           unleveredBeta: 0.897, sectorHint: 'HDFCBANK, ICICIBANK, SBIN' },
  { id: 'beverage_alc',     name: 'Beverage (Alcoholic)',              unleveredBeta: 0.924  },
  { id: 'beverage_soft',    name: 'Beverage (Non-Alcoholic)',          unleveredBeta: 0.580  },
  { id: 'biotech',          name: 'Biotechnology',                     unleveredBeta: 0.519  },
  { id: 'building_mat',     name: 'Building Materials / Cement',       unleveredBeta: 0.768, sectorHint: 'ULTRACEMCO, SHREECEM' },
  { id: 'chem_basic',       name: 'Chemical (Basic)',                   unleveredBeta: 0.715  },
  { id: 'chem_diversified', name: 'Chemical (Diversified)',             unleveredBeta: 0.723  },
  { id: 'coal_energy',      name: 'Coal & Related Energy',             unleveredBeta: 0.997, sectorHint: 'COALINDIA' },
  { id: 'comp_services',    name: 'Computer Services / IT',            unleveredBeta: 0.717, sectorHint: 'TCS, INFY, WIPRO, HCLTECH' },
  { id: 'consumer_products',name: 'Consumer Products',                  unleveredBeta: 0.502  },
  { id: 'ecommerce',        name: 'E-Commerce / Online Retail',        unleveredBeta: 1.057, sectorHint: 'ZOMATO, NYKAA' },
  { id: 'electrical_equip', name: 'Electrical Equipment',              unleveredBeta: 0.953, sectorHint: 'HAVELLS, ABB, SIEMENS' },
  { id: 'engineering',      name: 'Engineering & Construction',        unleveredBeta: 0.893, sectorHint: 'LT, HAL, BEL' },
  { id: 'entertainment',    name: 'Entertainment / Media',             unleveredBeta: 0.418  },
  { id: 'financial_svcs',   name: 'Financial Services (Non-Bank)',     unleveredBeta: 0.298, sectorHint: 'BAJFINANCE, CHOLAFIN' },
  { id: 'fmcg',             name: 'FMCG / Consumer Staples',           unleveredBeta: 0.765, sectorHint: 'HINDUNILVR, ITC, NESTLE, DABUR' },
  { id: 'healthcare_prod',  name: 'Healthcare Products',               unleveredBeta: 1.979  },
  { id: 'healthcare_svcs',  name: 'Healthcare Services / Hospitals',   unleveredBeta: 0.506, sectorHint: 'APOLLOHOSP' },
  { id: 'hotel_gaming',     name: 'Hotel / Hospitality',               unleveredBeta: 0.733  },
  { id: 'indus_services',   name: 'Industrial Services',               unleveredBeta: 0.645  },
  { id: 'insurance',        name: 'Insurance',                         unleveredBeta: 0.858, sectorHint: 'SBILIFE, HDFCLIFE, ICICIPRU' },
  { id: 'jewellery',        name: 'Jewellery / Gems',                  unleveredBeta: 0.606, sectorHint: 'TITAN, KALYAN' },
  { id: 'metals_mining',    name: 'Metals & Mining',                   unleveredBeta: 1.271, sectorHint: 'TATASTEEL, HINDALCO, VEDL' },
  { id: 'oil_gas',          name: 'Oil / Gas (Integrated)',            unleveredBeta: 0.540, sectorHint: 'RELIANCE, ONGC, BPCL' },
  { id: 'paint',            name: 'Paints / Coatings',                 unleveredBeta: 0.634, sectorHint: 'ASIANPAINT, BERGEPAINT' },
  { id: 'pharma',           name: 'Pharma & Drugs',                    unleveredBeta: 0.742, sectorHint: 'SUNPHARMA, DRREDDY, CIPLA' },
  { id: 'power',            name: 'Power / Electricity',               unleveredBeta: 0.888, sectorHint: 'NTPC, POWERGRID, TATAPOWER' },
  { id: 'real_estate',      name: 'Real Estate',                       unleveredBeta: 0.657  },
  { id: 'renewable_energy', name: 'Green & Renewable Energy',          unleveredBeta: 0.946, sectorHint: 'ADANIGREEN, TORNTPOWER' },
  { id: 'retail',           name: 'Retail',                            unleveredBeta: 1.057, sectorHint: 'DMART, TRENT' },
  { id: 'semiconductor',    name: 'Semiconductor',                     unleveredBeta: 1.858  },
  { id: 'software_app',     name: 'Software (System & Application)',   unleveredBeta: 0.855  },
  { id: 'steel',            name: 'Steel',                             unleveredBeta: 0.896, sectorHint: 'JSWSTEEL, SAIL' },
  { id: 'telecom',          name: 'Telecom',                           unleveredBeta: 0.641, sectorHint: 'BHARTIARTL' },
  { id: 'tobacco',          name: 'Tobacco / Cigarettes',              unleveredBeta: 0.157, sectorHint: 'ITC' },
  { id: 'transport',        name: 'Transportation (Non-Air)',          unleveredBeta: 0.983, sectorHint: 'IRCTC, ADANIPORTS' },
  { id: 'transport_air',    name: 'Airline',                           unleveredBeta: 0.786, sectorHint: 'INDIGO' },
  { id: 'utilities_gas',    name: 'Utilities (Gas Distribution)',      unleveredBeta: 1.002, sectorHint: 'ATGL, IGL, MGL' },
  { id: 'utilities_elec',   name: 'Utilities (Electric)',              unleveredBeta: 0.888  },
]

export function findIndustry(id: string): Industry | undefined {
  return INDUSTRY_BETAS.find(i => i.id === id)
}

export function searchIndustries(query: string): Industry[] {
  if (!query.trim()) return INDUSTRY_BETAS
  const q = query.toLowerCase()
  return INDUSTRY_BETAS.filter(
    i => i.name.toLowerCase().includes(q) || (i.sectorHint || '').toLowerCase().includes(q)
  )
}

export const BETA_DATA_DATE = 'January 2026'
