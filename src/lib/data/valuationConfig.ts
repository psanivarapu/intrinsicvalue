import raw from '../../../input_data/valuation_config.json'

export const DEFAULT_ERP: number = typeof raw.erp === 'number' ? raw.erp : 5.5
