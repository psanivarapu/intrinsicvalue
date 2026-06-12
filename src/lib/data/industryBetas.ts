/**
 * Damodaran India industry unlevered betas.
 *
 * PLACEHOLDER VALUES — replace with the latest 'India' dataset from:
 * https://pages.stern.nyu.edu/~adamodar/
 * File: Datasets → "betas.xls" or "indname.xls" → filter "India"
 * Published annually each January.
 *
 * The values below are reasonable approximations based on Damodaran's
 * January 2024 India dataset and should be verified annually.
 *
 * Beta data as of: January 2024
 * Source: A. Damodaran, NYU Stern School of Business
 */

export interface Industry {
  id: string
  name: string
  unleveredBeta: number  // median unlevered beta for India market
  /** Hint for which NSE sectors map to this industry */
  sectorHint?: string
}

// REVIEW: verify each beta value against latest Damodaran India dataset
export const INDUSTRY_BETAS: Industry[] = [
  { id: 'advertising',       name: 'Advertising',                     unleveredBeta: 0.73  },
  { id: 'apparel',           name: 'Apparel',                         unleveredBeta: 0.79  },
  { id: 'auto_truck',        name: 'Auto & Truck',                    unleveredBeta: 0.68, sectorHint: 'MARUTI, TATAMOTORS' },
  { id: 'auto_parts',        name: 'Auto Parts',                      unleveredBeta: 0.73, sectorHint: 'BOSCH, MOTHERSUMI' },
  { id: 'banking',           name: 'Banking',                         unleveredBeta: 0.35, sectorHint: 'HDFCBANK, ICICIBANK, SBIN' },
  { id: 'beverage_alc',      name: 'Beverage (Alcoholic)',            unleveredBeta: 0.72  },
  { id: 'beverage_soft',     name: 'Beverage (Non-Alcoholic)',        unleveredBeta: 0.84  },
  { id: 'biotech',           name: 'Biotechnology',                   unleveredBeta: 0.90  },
  { id: 'building_mat',      name: 'Building Materials / Cement',     unleveredBeta: 0.70, sectorHint: 'ULTRACEMCO, SHREECEM' },
  { id: 'chem_basic',        name: 'Chemical (Basic)',                 unleveredBeta: 0.66  },
  { id: 'chem_diversified',  name: 'Chemical (Diversified)',          unleveredBeta: 0.70  },
  { id: 'comp_services',     name: 'Computer Services / IT',          unleveredBeta: 0.87, sectorHint: 'TCS, INFY, WIPRO, HCLTECH' },
  { id: 'consumer_products', name: 'Consumer Products',               unleveredBeta: 0.71  },
  { id: 'ecommerce',         name: 'E-Commerce / Online Retail',      unleveredBeta: 1.00, sectorHint: 'ZOMATO, NYKAA' },
  { id: 'electrical_equip',  name: 'Electrical Equipment',            unleveredBeta: 0.72, sectorHint: 'HAVELLS, ABB, SIEMENS' },
  { id: 'engineering',       name: 'Engineering & Construction',      unleveredBeta: 0.79, sectorHint: 'LT, HAL, BEL' },
  { id: 'entertainment',     name: 'Entertainment / Media',           unleveredBeta: 0.84  },
  { id: 'financial_svcs',    name: 'Financial Services (Non-Bank)',   unleveredBeta: 0.43, sectorHint: 'BAJFINANCE, CHOLAFIN' },
  { id: 'fmcg',              name: 'FMCG / Consumer Staples',         unleveredBeta: 0.63, sectorHint: 'HINDUNILVR, ITC, NESTLE, DABUR' },
  { id: 'healthcare_prod',   name: 'Healthcare Products',             unleveredBeta: 0.68  },
  { id: 'healthcare_svcs',   name: 'Healthcare Services / Hospitals', unleveredBeta: 0.63, sectorHint: 'APOLLOHOSP' },
  { id: 'hotel_gaming',      name: 'Hotel / Hospitality',             unleveredBeta: 0.77  },
  { id: 'indus_services',    name: 'Industrial Services',             unleveredBeta: 0.75  },
  { id: 'insurance',         name: 'Insurance',                       unleveredBeta: 0.47, sectorHint: 'SBILIFE, HDFCLIFE, ICICIPRU' },
  { id: 'jewellery',         name: 'Jewellery / Gems',                unleveredBeta: 0.75, sectorHint: 'TITAN, KALYAN' },
  { id: 'metals_mining',     name: 'Metals & Mining',                 unleveredBeta: 0.72, sectorHint: 'TATASTEEL, HINDALCO, VEDL' },
  { id: 'oil_gas',           name: 'Oil / Gas (Integrated)',          unleveredBeta: 0.64, sectorHint: 'RELIANCE, ONGC, BPCL' },
  { id: 'paint',             name: 'Paints / Coatings',               unleveredBeta: 0.69, sectorHint: 'ASIANPAINT, BERGEPAINT' },
  { id: 'pharma',            name: 'Pharma & Drugs',                  unleveredBeta: 0.62, sectorHint: 'SUNPHARMA, DRREDDY, CIPLA' },
  { id: 'power',             name: 'Power / Electricity',             unleveredBeta: 0.44, sectorHint: 'NTPC, POWERGRID, TATAPOWER' },
  { id: 'real_estate',       name: 'Real Estate',                     unleveredBeta: 0.64  },
  { id: 'retail',            name: 'Retail',                          unleveredBeta: 0.73, sectorHint: 'DMART, TRENT' },
  { id: 'software_app',      name: 'Software (System & Application)', unleveredBeta: 0.95  },
  { id: 'steel',             name: 'Steel',                           unleveredBeta: 0.72, sectorHint: 'JSWSTEEL, SAIL' },
  { id: 'telecom',           name: 'Telecom',                         unleveredBeta: 0.64, sectorHint: 'BHARTIARTL' },
  { id: 'tobacco',           name: 'Tobacco / Cigarettes',            unleveredBeta: 0.58, sectorHint: 'ITC' },
  { id: 'transport',         name: 'Transportation (Non-Air)',        unleveredBeta: 0.65, sectorHint: 'IRCTC, ADANIPORTS' },
  { id: 'transport_air',     name: 'Airline',                         unleveredBeta: 0.79, sectorHint: 'INDIGO' },
  { id: 'utilities_gas',     name: 'Utilities (Gas Distribution)',    unleveredBeta: 0.42, sectorHint: 'ATGL, IGL, MGL' },
  { id: 'utilities_elec',    name: 'Utilities (Electric)',            unleveredBeta: 0.38  },
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

export const BETA_DATA_DATE = 'January 2024'
