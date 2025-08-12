import { Router } from 'express';
import { RecommenderController } from '../controllers/recommenderController';
import { authenticate, authorize } from '../middleware/auth';
import {
  validateRecommenderLogin,
  validateRecommenderProfileUpdate,
  validateRecommenderInvitationConfirmation,
  validateDiscrepancyReport
} from '../middleware/validation';
import { pool } from '../config/database';

const router = Router();
const recommenderController = new RecommenderController(pool);

/**
 * @route   POST /api/recommender/login
 * @desc    Login recommender using email and password
 * @access  Public
 */
router.post('/login', validateRecommenderLogin, recommenderController.login);

/**
 * @route   GET /api/recommender/invitation/:token
 * @desc    Get invitation details by token (public endpoint)
 * @access  Public
 */
router.get('/invitation/:token', recommenderController.getInvitationDetails);

/**
 * @route   POST /api/recommender/invitation/:token/confirm
 * @desc    Confirm invitation and create recommender profile (public endpoint)
 * @access  Public
 */
router.post('/invitation/:token/confirm', validateRecommenderInvitationConfirmation, recommenderController.confirmInvitation);

/**
 * @route   POST /api/recommender/invitation/:token/report-discrepancy
 * @desc    Report discrepancy in applicant details
 * @access  Public
 */
router.post('/invitation/:token/report-discrepancy', validateDiscrepancyReport, recommenderController.reportDiscrepancy);

/**
 * @route   GET /api/recommender/profile
 * @desc    Get current recommender profile
 * @access  Private (Recommender)
 */
router.get('/profile', authenticate, authorize('recommender'), recommenderController.getProfile);

/**
 * @route   PUT /api/recommender/profile
 * @desc    Update recommender profile
 * @access  Private (Recommender)
 */
router.put('/profile', authenticate, authorize('recommender'), validateRecommenderProfileUpdate, recommenderController.updateProfile);

/**
 * @route   GET /api/recommender/applications
 * @desc    Get applications assigned to recommender
 * @access  Private (Recommender)
 */
router.get('/applications', authenticate, authorize('recommender'), recommenderController.getApplications);

/**
 * @route   GET /api/recommender/applications/:applicationId
 * @desc    Get specific application details for recommender
 * @access  Private (Recommender)
 */
router.get('/applications/:applicationId', authenticate, authorize('recommender'), recommenderController.getApplicationDetails);

/**
 * @route   POST /api/recommender/applications/:applicationId/confirm
 * @desc    Confirm application details are correct
 * @access  Private (Recommender)
 */
router.post('/applications/:applicationId/confirm', authenticate, authorize('recommender'), recommenderController.confirmApplicationDetails);

export default router;