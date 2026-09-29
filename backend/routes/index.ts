import { Router } from 'express'
import { SERVICE_NAME } from '../constant/index.js'
import * as authController from '../controllers/auth.controller.js'
import * as googleOAuthController from '../controllers/google-auth.controller.js'
import * as userController from '../controllers/user.controller.js'
import * as serviceController from '../controllers/service.controller.js'
import * as productController from '../controllers/product.controller.js'
import * as messageController from '../controllers/message.controller.js'
import * as orderController from '../controllers/order.controller.js'
import * as reviewController from '../controllers/review.controller.js'
import * as disputeController from '../controllers/dispute.controller.js'
import * as adminController from '../controllers/admin.controller.js'
import * as walletController from '../controllers/wallet.controller.js'
import * as notificationController from '../controllers/notification.controller.js'
import * as coinController from '../controllers/coin.controller.js'
import * as jobController from '../controllers/job.controller.js'
import * as hireInvitationController from '../controllers/hire-invitation.controller.js'
import * as contractController from '../controllers/contract.controller.js'
import * as chatbotController from '../controllers/chatbot.controller.js'
import * as contactController from '../controllers/contact.controller.js'
import { optionalAuth, requireAuth } from '../middlewares/auth.middleware.js'
import {
  requireAdmin,
  requireSuperAdmin,
  requireClient,
  requireFreelancer,
  requireSeller,
} from '../middlewares/roles.middleware.js'
import { digitalProductFullCourseMulter } from '../middlewares/digital-product-upload.middleware.js'
import { messageAttachmentMulter } from '../middlewares/message-upload.middleware.js'

const router = Router()

router.get('/health', (_req, res) => {
  res.json({ ok: true, service: SERVICE_NAME, time: new Date().toISOString() })
})

router.post('/auth/login', authController.login)
router.post('/auth/signup', authController.signup)
router.post('/auth/forgot-password', authController.forgotPassword)
router.post('/auth/reset-password', authController.resetPassword)
router.post('/auth/verify-email', authController.verifyEmail)
router.post('/auth/resend-verification', authController.resendVerification)
router.post('/auth/google/complete-signup', (req, res, next) =>
  void googleOAuthController.completeSignup(req, res, next)
)

router.get('/users/me', requireAuth, userController.me)
router.put('/users/profile', requireAuth, userController.updateProfile)
router.post('/users/change-password', requireAuth, userController.changePassword)
router.get('/users/public/:id', requireAuth, userController.publicProfile)
router.post('/users/verification/submit', requireAuth, userController.submitVerification)
router.post('/users/verification/pay-badge', requireAuth, userController.payVerificationBadge)

router.get('/jobs', jobController.listOpen)
router.get('/jobs/publish-preflight', requireAuth, requireClient, jobController.preflightPublish)
router.get('/jobs/mine', requireAuth, requireClient, jobController.mine)
router.get('/jobs/proposals/mine', requireAuth, requireFreelancer, jobController.proposalsMineFreelancer)
router.get('/jobs/proposals/incoming', requireAuth, requireClient, jobController.proposalsForClient)
router.patch('/jobs/proposals/:proposalId', requireAuth, requireClient, jobController.patchProposal)
router.post('/jobs/proposals/:proposalId/withdraw', requireAuth, requireFreelancer, jobController.withdrawMyProposal)
router.post('/jobs', requireAuth, requireClient, jobController.create)
router.post('/jobs/:id/proposals', requireAuth, requireFreelancer, jobController.submitProposal)
router.post('/jobs/:id/report', requireAuth, jobController.reportJob)
router.get('/jobs/:id', optionalAuth, jobController.getOne)
router.patch('/jobs/:id', requireAuth, requireClient, jobController.update)
router.delete('/jobs/:id', requireAuth, requireClient, jobController.remove)

router.post('/hire/invitations', requireAuth, requireClient, hireInvitationController.create)
router.get('/hire/invitations/sent', requireAuth, requireClient, hireInvitationController.sent)
router.get('/hire/invitations/received', requireAuth, requireFreelancer, hireInvitationController.received)
router.post('/hire/invitations/:invitationId/accept', requireAuth, requireFreelancer, hireInvitationController.accept)
router.post('/hire/invitations/:invitationId/decline', requireAuth, requireFreelancer, hireInvitationController.decline)
router.delete('/hire/invitations/:invitationId', requireAuth, requireClient, hireInvitationController.cancel)

router.get('/contracts', requireAuth, contractController.list)
router.get('/contracts/:id', requireAuth, contractController.getOne)
router.patch('/contracts/:id/deadline', requireAuth, requireClient, contractController.updateDeadline)
router.post('/contracts/:id/deliveries', requireAuth, requireFreelancer, contractController.submitDelivery)
router.post(
  '/contracts/:id/deliveries/:deliveryId/approve',
  requireAuth,
  requireClient,
  contractController.approveDelivery
)
router.post(
  '/contracts/:id/deliveries/:deliveryId/request-changes',
  requireAuth,
  requireClient,
  contractController.requestDeliveryChanges
)
router.post('/contracts/:id/complete', requireAuth, requireClient, contractController.complete)
router.post('/contracts/:id/close', requireAuth, requireClient, contractController.close)
router.get('/contracts/:id/feedback', requireAuth, contractController.feedback)
router.post('/contracts/:id/feedback', requireAuth, contractController.submitFeedback)

router.get('/services', serviceController.list)
router.get('/services/mine', requireAuth, requireFreelancer, serviceController.mine)
router.get('/services/:id', serviceController.getOne)
router.post('/services', requireAuth, requireFreelancer, serviceController.create)
router.put('/services/:id', requireAuth, requireFreelancer, serviceController.update)
router.delete('/services/:id', requireAuth, requireFreelancer, serviceController.remove)

router.get('/products', productController.list)
router.get('/products/mine', requireAuth, requireSeller, productController.mine)
router.get('/downloads/digital-products/:productId', requireAuth, productController.downloadFullCourseFile)
router.post(
  '/products/:id/full-course-upload',
  requireAuth,
  requireSeller,
  digitalProductFullCourseMulter,
  productController.uploadFullCourseFile
)
router.get('/products/:id', productController.getOne)
router.post('/products', requireAuth, requireSeller, productController.create)
router.put('/products/:id', requireAuth, requireSeller, productController.update)
router.delete('/products/:id', requireAuth, requireSeller, productController.remove)

router.get('/messages/peers', requireAuth, messageController.peers)
router.get('/messages/unread-count', requireAuth, messageController.unreadCount)
router.get('/messages/thread/:peerId', requireAuth, messageController.thread)
router.get('/messages/:messageId/attachment', requireAuth, messageController.downloadAttachment)
router.post(
  '/messages',
  requireAuth,
  (req, res, next) => {
    const ct = req.headers['content-type'] || ''
    if (ct.includes('multipart/form-data')) {
      messageAttachmentMulter(req, res, next)
    } else {
      next()
    }
  },
  messageController.send
)

router.post('/orders/services', requireAuth, requireClient, orderController.placeServiceOrder)
router.get('/orders/services', requireAuth, orderController.listServiceOrders)
router.patch('/orders/services/:id/status', requireAuth, requireFreelancer, orderController.updateServiceOrderStatus)

router.post('/orders/products', requireAuth, orderController.purchaseProduct)
router.post('/orders/checkout', requireAuth, orderController.checkoutCart)
router.get('/orders/products', requireAuth, orderController.listProductPurchases)

router.post('/reviews', requireAuth, reviewController.create)
router.get('/reviews/user/:userId', reviewController.listForUser)

router.post('/disputes', requireAuth, disputeController.create)
router.get('/disputes/mine', requireAuth, disputeController.mine)

router.get('/wallet/me', requireAuth, walletController.getMyWallet)
router.post('/wallet/topup', requireAuth, walletController.topup)
router.post('/wallet/withdraw', requireAuth, walletController.withdraw)
router.post('/wallet/transfer', requireAuth, walletController.transfer)
router.get('/wallet/transactions', requireAuth, walletController.transactions)

router.get('/telebirr/me', requireAuth, walletController.getMyTelebirr)
router.get('/telebirr/transactions', requireAuth, walletController.telebirrTransactions)

router.get('/notifications', requireAuth, notificationController.mine)
router.get('/notifications/unread-count', requireAuth, notificationController.unreadCount)
router.post('/notifications/read-all', requireAuth, notificationController.markAllRead)
router.post('/notifications/:id/read', requireAuth, notificationController.markRead)

router.get('/coins/me', requireAuth, coinController.summary)
router.post('/coins/apply-order', requireAuth, coinController.applyToOrder)
router.get('/coins/exchange-rate', requireAuth, coinController.getExchangeRate)
router.get('/platform/commission', adminController.getCommissionSetting)
router.get('/platform/job-gate-settings', adminController.getJobGateSettings)

router.get('/chatbot/status', chatbotController.status)
router.post('/chatbot/message', chatbotController.message)

router.post('/contact', contactController.submit)

router.get('/admin/users', requireAuth, requireAdmin, adminController.users)
router.delete('/admin/users/:id', requireAuth, requireSuperAdmin, adminController.deleteUser)
router.patch('/admin/users/:id', requireAuth, requireSuperAdmin, adminController.patchUser)
router.post('/admin/users/:id/verification', requireAuth, requireAdmin, adminController.approveVerification)
router.post('/admin/users/:id/coins', requireAuth, requireSuperAdmin, adminController.adjustUserCoins)
router.get('/admin/settings/exchange-rate', requireAuth, requireAdmin, coinController.getExchangeRate)
router.put('/admin/settings/exchange-rate', requireAuth, requireSuperAdmin, coinController.setExchangeRate)
router.get('/admin/settings/commission', requireAuth, requireAdmin, adminController.getCommissionSetting)
router.put('/admin/settings/commission', requireAuth, requireSuperAdmin, adminController.setCommissionSetting)
router.get('/admin/settings/job-gates', requireAuth, requireAdmin, adminController.getJobGateSettings)
router.put('/admin/settings/job-gates', requireAuth, requireSuperAdmin, adminController.setJobGateSettings)
router.post('/admin/jobs/:id/close', requireAuth, requireAdmin, adminController.closeJob)
router.post('/admin/users/:id/suspend', requireAuth, requireAdmin, adminController.suspendUser)
router.get('/admin/telebirr/accounts', requireAuth, requireAdmin, adminController.telebirrAccounts)
router.post('/admin/telebirr/accounts/:phone/topup', requireAuth, requireSuperAdmin, adminController.topUpTelebirrAccount)
router.get('/admin/disputes', requireAuth, requireAdmin, adminController.disputes)
router.patch('/admin/disputes/:id', requireAuth, requireAdmin, adminController.patchDispute)
router.get('/admin/stats', requireAuth, requireAdmin, adminController.stats)
router.get('/admin/listings', requireAuth, requireAdmin, adminController.listings)
router.get('/admin/transactions', requireAuth, requireAdmin, adminController.transactions)
router.get('/admin/recent-activity', requireAuth, requireAdmin, adminController.recentActivity)
router.get('/admin/report', requireAuth, requireAdmin, adminController.report)
router.get('/admin/contact-messages', requireAuth, requireAdmin, contactController.listForAdmin)
router.patch('/admin/contact-messages/:id/read', requireAuth, requireAdmin, contactController.markRead)

export default router
