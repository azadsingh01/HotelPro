import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { body } from 'express-validator';
import { getProfile, login, register } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validateRequest } from '../utils/validateRequest.js';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Too many authentication attempts. Try again later.' },
});

const registrationValidation = [
  body('name')
    .isString().withMessage('Name must be text.')
    .bail()
    .trim()
    .isLength({ min: 2, max: 80 }).withMessage('Name must be between 2 and 80 characters.'),
  body('email')
    .isString().withMessage('Email must be text.')
    .bail()
    .trim()
    .isEmail().withMessage('Enter a valid email address.')
    .normalizeEmail(),
  body('password')
    .isString().withMessage('Password must be text.')
    .bail()
    .isLength({ min: 8, max: 72 }).withMessage('Password must be between 8 and 72 characters.')
    .bail()
    .custom((value) => Buffer.byteLength(value, 'utf8') <= 72)
    .withMessage('Password must be at most 72 bytes when encoded as UTF-8.'),
  body('phone')
    .optional({ values: 'falsy' })
    .isString().withMessage('Phone must be text.')
    .bail()
    .trim()
    .isLength({ max: 32 }).withMessage('Phone must be 32 characters or fewer.'),
  body('role')
    .not().exists().withMessage('Role is assigned by an administrator.'),
];

const loginValidation = [
  body('email')
    .isString().withMessage('Email must be text.')
    .bail()
    .trim()
    .isEmail().withMessage('Enter a valid email address.')
    .normalizeEmail(),
  body('password')
    .isString().withMessage('Password must be text.')
    .bail()
    .isLength({ min: 1, max: 72 }).withMessage('Password is required and must be 72 characters or fewer.')
    .bail()
    .custom((value) => Buffer.byteLength(value, 'utf8') <= 72)
    .withMessage('Password must be at most 72 bytes when encoded as UTF-8.'),
];

router.post('/register', authLimiter, registrationValidation, validateRequest, register);
router.post('/login', authLimiter, loginValidation, validateRequest, login);
router.get('/profile', authenticate, getProfile);

export default router;
