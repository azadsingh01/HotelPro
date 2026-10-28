import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { body } from 'express-validator';
import { adminLogin, getProfile, login, signup } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.js';
import { hasAdminSignupCode, verifyAdminSignupCode } from '../utils/adminSignupCode.js';
import { validateRequest } from '../utils/validateRequest.js';

const router = Router();
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Too many authentication attempts. Try again later.' },
});

const credentialsValidation = [
  body('email').isString().withMessage('Email must be text.').bail().trim().isEmail().withMessage('Enter a valid email address.').normalizeEmail(),
  body('password').isString().withMessage('Password must be text.').bail().isLength({ min: 1, max: 72 }).withMessage('Password is required and must be 72 characters or fewer.').bail().custom((value) => Buffer.byteLength(value, 'utf8') <= 72).withMessage('Password must be at most 72 bytes when encoded as UTF-8.'),
];

const signupValidation = [
  body('name').isString().withMessage('Name must be text.').bail().trim().isLength({ min: 2, max: 80 }).withMessage('Name must be between 2 and 80 characters.'),
  ...credentialsValidation,
  body('password').isString().withMessage('Password must be text.').bail().isLength({ min: 8, max: 72 }).withMessage('Password must be between 8 and 72 characters.').bail().custom((value) => Buffer.byteLength(value, 'utf8') <= 72).withMessage('Password must be at most 72 bytes when encoded as UTF-8.'),
  body('c_password').isString().withMessage('Confirm password is required.').bail().custom((value, { req }) => value === req.body.password).withMessage('Passwords do not match.'),
  body('phone').isString().withMessage('Phone is required and must be text.').bail().trim().matches(/^\d{10,15}$/).withMessage('Phone must contain 10 to 15 digits.'),
  body('userType').isIn(['Ordinary', 'Admin']).withMessage('Choose Ordinary or Admin as the user type.'),
  body('adminCode').custom((value, { req }) => {
    if (req.body.userType !== 'Admin') {
      if (value !== undefined) throw new Error('Admin Secret Code is only used when Admin is selected.');
      return true;
    }
    if (!hasAdminSignupCode()) throw new Error('Admin signup is not configured. Contact an administrator.');
    if (!verifyAdminSignupCode(value)) throw new Error('The Admin Secret Code is missing or incorrect.');
    return true;
  }),
  body('type').not().exists().withMessage('Use userType to select an account type.'),
  body('role').not().exists().withMessage('Account type is assigned by the signup flow.'),
];

router.post('/signup', authLimiter, signupValidation, validateRequest, signup);
router.post('/login', authLimiter, credentialsValidation, validateRequest, login);
router.post('/admin-login', authLimiter, credentialsValidation, validateRequest, adminLogin);
router.get('/profile', authenticate, getProfile);

export default router;
