import { createAuthRouter } from './modules/auth/http/auth-routes.js';
import { createCatalogRouter } from './modules/catalog/http/catalog-routes.js';
import { createVehicleRouter } from './modules/vehicles/http/vehicle-routes.js';
import { createQuotesRouter } from './modules/quotes/http/quotes-routes.js';
import { createAppointmentsRouter } from './modules/appointments/http/appointments-routes.js';
import { createWorkOrdersRouter } from './modules/work-orders/http/work-orders-routes.js';
import { createPartsRouter } from './modules/parts/http/parts-routes.js';
import { createMessagingRouter } from './modules/messaging/http/messaging-routes.js';
import { createPaymentsRouter } from './modules/payments/http/payments-routes.js';
import { createRatingsRouter } from './modules/ratings/http/ratings-routes.js';
import { createAdminRouter } from './modules/admin/http/admin-routes.js';
import { createNotificationsRouter } from './modules/notifications/http/notifications-routes.js';
import { createChatbotRouter } from './modules/chatbot/http/chatbot-routes.js';
import { createEvidenciasRouter } from './modules/work-orders/http/evidencias-routes.js';
import { createEvidenciasDependencies } from './modules/work-orders/evidencias-composition.js';
import { criarPgClienteRepository } from './modules/auth/adapters/pg-cliente-repository.js';
import { criarPgOsRepository } from './modules/work-orders/adapters/pg-os-repository.js';
import { criarPgVeiculoRepository } from './modules/vehicles/adapters/pg-veiculo-repository.js';
import { criarPgServicoRepository } from './modules/catalog/adapters/pg-servico-repository.js';
import { criarPgPecaRepository } from './modules/parts/adapters/pg-peca-repository.js';
import { createAuthDependencies } from './modules/auth/composition.js';
import { createRequireRole } from './modules/auth/http/session-middleware.js';
import { createQuotesDependencies } from './modules/quotes/composition.js';
import { createWorkOrdersDependencies } from './modules/work-orders/composition.js';
import { createVehicleDependencies } from './modules/vehicles/composition.js';
import { createRatingsDependencies } from './modules/ratings/composition.js';
import { createPaymentsDependencies } from './modules/payments/composition.js';
import { createPartsDependencies } from './modules/parts/composition.js';
import { createAppointmentsDependencies } from './modules/appointments/composition.js';
import { createMessagingDependencies } from './modules/messaging/composition.js';
import { createCatalogDependencies } from './modules/catalog/composition.js';
import { createNotificationsDependencies } from './modules/notifications/composition.js';
import { createAdminDependencies } from './modules/admin/composition.js';
import { createChatbotDependencies } from './modules/chatbot/composition.js';

export function createAppDependencies() {
  const clienteRepo = criarPgClienteRepository();
  const osRepo = criarPgOsRepository();
  const veiculoRepo = criarPgVeiculoRepository();
  const servicoRepo = criarPgServicoRepository();
  const pecaRepo = criarPgPecaRepository();
  const authDependencies = createAuthDependencies({ clienteRepo });
  const { utilizadorRepo, requireAuth, passwordHasher } = authDependencies;
  const quotesDependencies = createQuotesDependencies({
    requireAuth,
    requireRole: createRequireRole,
    veiculoRepo,
  });
  const paymentsDependencies = createPaymentsDependencies({ requireAuth, osRepo });
  const partsDependencies = createPartsDependencies({
    requireAuth,
    requireRole: createRequireRole,
    pecaRepo,
  });
  const appointmentsDependencies = createAppointmentsDependencies({
    requireAuth,
    requireRole: createRequireRole,
    veiculoRepo,
  });
  const messagingDependencies = createMessagingDependencies({ requireAuth, osRepo });
  const catalogDependencies = createCatalogDependencies({
    requireAuth,
    requireRole: createRequireRole,
    servicoRepo,
  });
  const notificationsDependencies = createNotificationsDependencies({ requireAuth });
  const ratingsDependencies = createRatingsDependencies({
    requireAuth,
    requireRole: createRequireRole,
    osRepo,
    clienteRepo,
  });
  const adminDependencies = createAdminDependencies({
    requireAuth,
    requireRole: createRequireRole,
    utilizadorRepo,
    passwordHasher,
    moderarAvaliacoes: ratingsDependencies.moderar,
  });
  const workOrdersDependencies = createWorkOrdersDependencies({
    requireAuth,
    requireRole: createRequireRole,
    utilizadorRepo,
    osRepo,
    clienteRepo,
    veiculoRepo,
    servicoRepo,
    pecaRepo,
  });
  const chatbotDependencies = createChatbotDependencies({
    requireAuth,
    requireRole: createRequireRole,
    utilizadorRepo,
    clienteRepo,
    veiculoRepo,
    osRepo,
    criarOS: workOrdersDependencies.criarOS,
  });
  const evidenciasDependencies = createEvidenciasDependencies({
    requireAuth,
    requireRole: createRequireRole,
  });
  const vehicleDependencies = createVehicleDependencies({
    requireAuth,
    requireRole: createRequireRole,
    utilizadorRepo,
    veiculoRepo,
  });
  return {
    authRouter: createAuthRouter(authDependencies),
    catalogRouter: createCatalogRouter(catalogDependencies),
    vehicleRouter: createVehicleRouter(vehicleDependencies),
    quotesRouter: createQuotesRouter(quotesDependencies),
    appointmentsRouter: createAppointmentsRouter(appointmentsDependencies),
    workOrdersRouter: createWorkOrdersRouter(workOrdersDependencies),
    partsRouter: createPartsRouter(partsDependencies),
    messagingRouter: createMessagingRouter(messagingDependencies),
    paymentsRouter: createPaymentsRouter(paymentsDependencies),
    ratingsRouter: createRatingsRouter(ratingsDependencies),
    adminRouter: createAdminRouter(adminDependencies),
    notificationsRouter: createNotificationsRouter(notificationsDependencies),
    chatbotRouter: createChatbotRouter(chatbotDependencies),
    evidenciasRouter: createEvidenciasRouter(evidenciasDependencies),
  };
}
