import { ForecastService } from '../domain/services/forecast-service.js';
import { AmortizationService } from '../domain/services/amortization-service.js';
import { MemberService } from './services/member-service.js';
import { HouseService } from './services/house-service.js';
import { CarService } from './services/car-service.js';
import { ContractService } from './services/contract-service.js';
import { DashboardService } from './services/dashboard-service.js';
import { SettingsService } from './services/settings-service.js';
import { InvoiceOcrService } from './services/invoice-ocr-service.js';
import { TransactionService } from './services/transaction-service.js';
import { TaxService } from './services/tax-service.js';
import { AssetService } from './services/asset-service.js';
import { LocalOcrEngine } from '../infrastructure/ocr/local-ocr-engine.js';
import { GoogleVisionOcrEngine } from '../infrastructure/ocr/google-vision-ocr-engine.js';

/**
 * Composition root: conecta los repositorios (puertos) con los servicios de aplicación.
 */
export function buildContainer({ repositories, config }) {
  const currency = config.currency;

  const memberService = new MemberService({ memberRepository: repositories.members });
  const houseService = new HouseService({ houseRepository: repositories.houses });
  const carService = new CarService({ carRepository: repositories.cars });
  const contractService = new ContractService({ contractRepository: repositories.contracts });
  const forecastService = new ForecastService({ currency });
  const dashboardService = new DashboardService({
    contractRepository: repositories.contracts,
    currency,
  });

  const settingsService = new SettingsService({ settingsRepository: repositories.settings });

  const invoiceOcrService = new InvoiceOcrService({
    engines: {
      local: new LocalOcrEngine({ config }),
      cloud: new GoogleVisionOcrEngine(),
    },
    settingsService,
  });

  const transactionService = new TransactionService({
    transactionRepository: repositories.transactions,
    contractRepository: repositories.contracts,
    documentStore: repositories.documentStore,
    invoiceOcrService,
    settingsService,
    config,
  });

  const amortizationService = new AmortizationService();

  const assetService = new AssetService({
    assetRepository: repositories.assets,
    transactionService,
    amortizationService,
  });

  const taxService = new TaxService({
    transactionRepository: repositories.transactions,
    assetRepository: repositories.assets,
    amortizationService,
    contractRepository: repositories.contracts,
    settingsService,
  });

  return {
    memberService,
    houseService,
    carService,
    contractService,
    forecastService,
    dashboardService,
    settingsService,
    invoiceOcrService,
    transactionService,
    taxService,
    assetService,
    amortizationService,
    config,
  };
}
