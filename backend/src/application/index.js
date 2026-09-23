import { ForecastService } from '../domain/services/forecast-service.js';
import { MemberService } from './services/member-service.js';
import { HouseService } from './services/house-service.js';
import { ContractService } from './services/contract-service.js';
import { DashboardService } from './services/dashboard-service.js';

/**
 * Composition root: conecta los repositorios (puertos) con los servicios de aplicación.
 */
export function buildContainer({ repositories, config }) {
  const currency = config.currency;

  const memberService = new MemberService({ memberRepository: repositories.members });
  const houseService = new HouseService({ houseRepository: repositories.houses });
  const contractService = new ContractService({ contractRepository: repositories.contracts });
  const forecastService = new ForecastService({ currency });
  const dashboardService = new DashboardService({
    contractRepository: repositories.contracts,
    currency,
  });

  return {
    memberService,
    houseService,
    contractService,
    forecastService,
    dashboardService,
    config,
  };
}
