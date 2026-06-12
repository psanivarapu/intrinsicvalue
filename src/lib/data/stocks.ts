export interface Stock {
  symbol: string
  name: string
  /** Damodaran industry ID for bottom-up beta lookup. REVIEW: verify each mapping. */
  damodaranIndustry: string
}

// NIFTY 100 constituents — well-known, verifiable entries.
// TODO: Paste the full NIFTY 500 list here in the same format.
// Source: https://www.nseindia.com/market-data/live-equity-market
// REVIEW: all damodaranIndustry mappings should be re-verified against latest NSE sector data.
export const NIFTY100_STOCKS: Stock[] = [
  { symbol: 'RELIANCE',   name: 'Reliance Industries Ltd',                   damodaranIndustry: 'oil_gas' },
  { symbol: 'TCS',        name: 'Tata Consultancy Services Ltd',              damodaranIndustry: 'comp_services' },
  { symbol: 'HDFCBANK',   name: 'HDFC Bank Ltd',                             damodaranIndustry: 'banking' },
  { symbol: 'INFY',       name: 'Infosys Ltd',                               damodaranIndustry: 'comp_services' },
  { symbol: 'ICICIBANK',  name: 'ICICI Bank Ltd',                            damodaranIndustry: 'banking' },
  { symbol: 'HINDUNILVR', name: 'Hindustan Unilever Ltd',                    damodaranIndustry: 'fmcg' },
  { symbol: 'ITC',        name: 'ITC Ltd',                                   damodaranIndustry: 'tobacco' },
  { symbol: 'SBIN',       name: 'State Bank of India',                       damodaranIndustry: 'banking' },
  { symbol: 'BHARTIARTL', name: 'Bharti Airtel Ltd',                         damodaranIndustry: 'telecom' },
  { symbol: 'LT',         name: 'Larsen & Toubro Ltd',                       damodaranIndustry: 'engineering' },
  { symbol: 'KOTAKBANK',  name: 'Kotak Mahindra Bank Ltd',                   damodaranIndustry: 'banking' },
  { symbol: 'AXISBANK',   name: 'Axis Bank Ltd',                             damodaranIndustry: 'banking' },
  { symbol: 'BAJFINANCE', name: 'Bajaj Finance Ltd',                         damodaranIndustry: 'financial_svcs' },
  { symbol: 'WIPRO',      name: 'Wipro Ltd',                                 damodaranIndustry: 'comp_services' },
  { symbol: 'HCLTECH',    name: 'HCL Technologies Ltd',                      damodaranIndustry: 'comp_services' },
  { symbol: 'ASIANPAINT', name: 'Asian Paints Ltd',                          damodaranIndustry: 'paint' },
  { symbol: 'MARUTI',     name: 'Maruti Suzuki India Ltd',                   damodaranIndustry: 'auto_truck' },
  { symbol: 'SUNPHARMA',  name: 'Sun Pharmaceutical Industries Ltd',         damodaranIndustry: 'pharma' },
  { symbol: 'TITAN',      name: 'Titan Company Ltd',                         damodaranIndustry: 'jewellery' },
  { symbol: 'ULTRACEMCO', name: 'UltraTech Cement Ltd',                      damodaranIndustry: 'building_mat' },
  { symbol: 'BAJAJFINSV', name: 'Bajaj Finserv Ltd',                         damodaranIndustry: 'financial_svcs' },
  { symbol: 'NESTLEIND',  name: 'Nestle India Ltd',                          damodaranIndustry: 'fmcg' },
  { symbol: 'ONGC',       name: 'Oil & Natural Gas Corporation Ltd',         damodaranIndustry: 'oil_gas' },
  { symbol: 'NTPC',       name: 'NTPC Ltd',                                  damodaranIndustry: 'utilities_elec' },
  { symbol: 'POWERGRID',  name: 'Power Grid Corporation of India Ltd',       damodaranIndustry: 'utilities_elec' },
  { symbol: 'M&M',        name: 'Mahindra & Mahindra Ltd',                   damodaranIndustry: 'auto_truck' },
  { symbol: 'TATAMOTORS', name: 'Tata Motors Ltd',                           damodaranIndustry: 'auto_truck' },
  { symbol: 'TATASTEEL',  name: 'Tata Steel Ltd',                            damodaranIndustry: 'steel' },
  { symbol: 'ADANIENT',   name: 'Adani Enterprises Ltd',                     damodaranIndustry: 'engineering' },
  { symbol: 'ADANIPORTS', name: 'Adani Ports and Special Economic Zone Ltd', damodaranIndustry: 'transport' },
  { symbol: 'COALINDIA',  name: 'Coal India Ltd',                            damodaranIndustry: 'metals_mining' },
  { symbol: 'TECHM',      name: 'Tech Mahindra Ltd',                         damodaranIndustry: 'comp_services' },
  { symbol: 'DRREDDY',    name: "Dr. Reddy's Laboratories Ltd",              damodaranIndustry: 'pharma' },
  { symbol: 'CIPLA',      name: 'Cipla Ltd',                                 damodaranIndustry: 'pharma' },
  { symbol: 'DIVISLAB',   name: "Divi's Laboratories Ltd",                   damodaranIndustry: 'pharma' },
  { symbol: 'EICHERMOT',  name: 'Eicher Motors Ltd',                         damodaranIndustry: 'auto_truck' },
  { symbol: 'HEROMOTOCO', name: 'Hero MotoCorp Ltd',                         damodaranIndustry: 'auto_truck' },
  { symbol: 'BPCL',       name: 'Bharat Petroleum Corporation Ltd',          damodaranIndustry: 'oil_gas' },
  { symbol: 'GRASIM',     name: 'Grasim Industries Ltd',                     damodaranIndustry: 'building_mat' },
  { symbol: 'HINDALCO',   name: 'Hindalco Industries Ltd',                   damodaranIndustry: 'metals_mining' },
  { symbol: 'INDUSINDBK', name: 'IndusInd Bank Ltd',                         damodaranIndustry: 'banking' },
  { symbol: 'JSWSTEEL',   name: 'JSW Steel Ltd',                             damodaranIndustry: 'steel' },
  { symbol: 'BRITANNIA',  name: 'Britannia Industries Ltd',                  damodaranIndustry: 'fmcg' },
  { symbol: 'APOLLOHOSP', name: 'Apollo Hospitals Enterprise Ltd',           damodaranIndustry: 'healthcare_svcs' },
  { symbol: 'BAJAJ-AUTO', name: 'Bajaj Auto Ltd',                            damodaranIndustry: 'auto_truck' },
  { symbol: 'TATACONSUM', name: 'Tata Consumer Products Ltd',                damodaranIndustry: 'fmcg' },
  { symbol: 'PIDILITIND', name: 'Pidilite Industries Ltd',                   damodaranIndustry: 'chem_diversified' },
  { symbol: 'SBILIFE',    name: 'SBI Life Insurance Company Ltd',            damodaranIndustry: 'insurance' },
  { symbol: 'HDFCLIFE',   name: 'HDFC Life Insurance Company Ltd',           damodaranIndustry: 'insurance' },
  { symbol: 'ICICIPRULI', name: 'ICICI Prudential Life Insurance Company Ltd', damodaranIndustry: 'insurance' },
  { symbol: 'SHREECEM',   name: 'Shree Cement Ltd',                          damodaranIndustry: 'building_mat' },
  { symbol: 'DABUR',      name: 'Dabur India Ltd',                           damodaranIndustry: 'fmcg' },
  { symbol: 'GODREJCP',   name: 'Godrej Consumer Products Ltd',              damodaranIndustry: 'fmcg' },
  { symbol: 'MARICO',     name: 'Marico Ltd',                                damodaranIndustry: 'fmcg' },
  { symbol: 'COLPAL',     name: 'Colgate-Palmolive (India) Ltd',             damodaranIndustry: 'fmcg' },
  { symbol: 'PAGEIND',    name: 'Page Industries Ltd',                       damodaranIndustry: 'apparel' },
  { symbol: 'HAVELLS',    name: 'Havells India Ltd',                         damodaranIndustry: 'electrical_equip' },
  { symbol: 'MUTHOOTFIN', name: 'Muthoot Finance Ltd',                       damodaranIndustry: 'financial_svcs' },
  { symbol: 'CHOLAFIN',   name: 'Cholamandalam Investment and Finance Co Ltd', damodaranIndustry: 'financial_svcs' },
  { symbol: 'BANKBARODA', name: 'Bank of Baroda',                            damodaranIndustry: 'banking' },
  { symbol: 'PNB',        name: 'Punjab National Bank',                      damodaranIndustry: 'banking' },
  { symbol: 'CANBK',      name: 'Canara Bank',                               damodaranIndustry: 'banking' },
  { symbol: 'FEDERALBNK', name: 'The Federal Bank Ltd',                      damodaranIndustry: 'banking' },
  { symbol: 'IDFCFIRSTB', name: 'IDFC First Bank Ltd',                       damodaranIndustry: 'banking' },
  { symbol: 'ZOMATO',     name: 'Zomato Ltd',                                damodaranIndustry: 'ecommerce' },
  { symbol: 'NYKAA',      name: 'FSN E-Commerce Ventures Ltd (Nykaa)',       damodaranIndustry: 'ecommerce' },
  { symbol: 'DMART',      name: 'Avenue Supermarts Ltd',                     damodaranIndustry: 'retail' },
  { symbol: 'TRENT',      name: 'Trent Ltd',                                 damodaranIndustry: 'retail' },
  { symbol: 'VEDL',       name: 'Vedanta Ltd',                               damodaranIndustry: 'metals_mining' },
  { symbol: 'SAIL',       name: 'Steel Authority of India Ltd',              damodaranIndustry: 'steel' },
  { symbol: 'NMDC',       name: 'NMDC Ltd',                                  damodaranIndustry: 'metals_mining' },
  { symbol: 'RECLTD',     name: 'REC Ltd',                                   damodaranIndustry: 'financial_svcs' },
  { symbol: 'PFC',        name: 'Power Finance Corporation Ltd',             damodaranIndustry: 'financial_svcs' },
  { symbol: 'IRFC',       name: 'Indian Railway Finance Corporation Ltd',    damodaranIndustry: 'financial_svcs' },
  { symbol: 'HAL',        name: 'Hindustan Aeronautics Ltd',                 damodaranIndustry: 'engineering' },
  { symbol: 'BEL',        name: 'Bharat Electronics Ltd',                    damodaranIndustry: 'electrical_equip' },
  { symbol: 'SIEMENS',    name: 'Siemens Ltd',                               damodaranIndustry: 'electrical_equip' },
  { symbol: 'ABB',        name: 'ABB India Ltd',                             damodaranIndustry: 'electrical_equip' },
  { symbol: 'BOSCHLTD',   name: 'Bosch Ltd',                                 damodaranIndustry: 'auto_parts' },
  { symbol: 'CUMMINSIND', name: 'Cummins India Ltd',                         damodaranIndustry: 'indus_services' },
  { symbol: 'TORNTPHARM', name: 'Torrent Pharmaceuticals Ltd',               damodaranIndustry: 'pharma' },
  { symbol: 'LUPIN',      name: 'Lupin Ltd',                                 damodaranIndustry: 'pharma' },
  { symbol: 'BIOCON',     name: 'Biocon Ltd',                                damodaranIndustry: 'biotech' },
  { symbol: 'AUROPHARMA', name: 'Aurobindo Pharma Ltd',                      damodaranIndustry: 'pharma' },
  { symbol: 'AMBUJACEM',  name: 'Ambuja Cements Ltd',                        damodaranIndustry: 'building_mat' },
  { symbol: 'ACC',        name: 'ACC Ltd',                                   damodaranIndustry: 'building_mat' },
  { symbol: 'INDIGO',     name: 'InterGlobe Aviation Ltd (IndiGo)',          damodaranIndustry: 'transport_air' },
  { symbol: 'IRCTC',      name: 'Indian Railway Catering and Tourism Corp Ltd', damodaranIndustry: 'transport' },
  { symbol: 'TATAPOWER',  name: 'Tata Power Company Ltd',                    damodaranIndustry: 'utilities_elec' },
  { symbol: 'ADANIGREEN', name: 'Adani Green Energy Ltd',                    damodaranIndustry: 'utilities_elec' },
  { symbol: 'ATGL',       name: 'Adani Total Gas Ltd',                       damodaranIndustry: 'utilities_gas' },
  { symbol: 'ZYDUSLIFE',  name: 'Zydus Lifesciences Ltd',                    damodaranIndustry: 'pharma' },
  { symbol: 'BERGEPAINT', name: 'Berger Paints India Ltd',                   damodaranIndustry: 'paint' },
  { symbol: 'LTF',        name: 'L&T Finance Ltd',                           damodaranIndustry: 'financial_svcs' },
]

export function searchStocks(query: string): Stock[] {
  if (!query.trim()) return []
  const q = query.toLowerCase()
  return NIFTY100_STOCKS.filter(
    s => s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
  ).slice(0, 10)
}

export function findStock(symbol: string): Stock | undefined {
  return NIFTY100_STOCKS.find(s => s.symbol === symbol.toUpperCase())
}
