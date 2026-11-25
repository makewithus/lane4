const { body, param } = require('express-validator');
const { ALLOWED_ORDER_STATUSES } = require('../constants');

const quoteValidator = [
  body('items').isArray({ min: 1 }).withMessage('At least one item is required to generate a checkout quote'),
  body('items.*.productId').notEmpty().withMessage('Valid productId required for each item'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be an integer >= 1')
];

const createOrderValidator = [
  body('items').isArray({ min: 1 }).withMessage('Cart cannot be empty'),
  body('customerEmail')
    .optional({ nullable: true })
    .trim()
    .matches(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)
    .withMessage('Please provide a valid standard email address.'),
  body('shippingAddress').isObject().withMessage('Shipping address object is required'),
  body('shippingAddress.addressLine1')
    .trim()
    .isLength({ min: 5 })
    .withMessage('Street Address is required and must be at least 5 characters.'),
  body('shippingAddress.city').trim().notEmpty().withMessage('City is required'),
  body('shippingAddress.state').trim().notEmpty().withMessage('State is required'),
  body('shippingAddress.postalCode')
    .trim()
    .matches(/^[1-9][0-9]{5}$/)
    .withMessage('Please provide a correct postal code.')
    .custom((val) => {
      if (/^(.)\1{5}$/.test(val) || val === '123456') {
        throw new Error('Please provide a correct postal code.');
      }
      return true;
    })
];

const updateOrderStatusValidator = [
  param('id').notEmpty().withMessage('Order ID is required'),
  body('status').isIn(ALLOWED_ORDER_STATUSES).withMessage('Invalid order status')
];

const addTrackingValidator = [
  param('id').notEmpty().withMessage('Order ID is required'),
  body('courierName').trim().notEmpty().withMessage('Courier partner name is required'),
  body('trackingNumber')
    .trim()
    .isLength({ min: 6, max: 35 })
    .withMessage('Tracking / AWB number must be between 6 and 35 characters.')
    .matches(/^[A-Za-z0-9\-_]+$/)
    .withMessage('Tracking / AWB number must contain only letters, numbers, and hyphens.')
    .custom((val) => {
      if (/^(.)\1+$/.test(val)) {
        throw new Error('Please provide a valid courier tracking / AWB number (cannot be a single repeated character).');
      }
      return true;
    })
];

module.exports = {
  quoteValidator,
  createOrderValidator,
  updateOrderStatusValidator,
  addTrackingValidator
};

