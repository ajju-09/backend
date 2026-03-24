const Joi = require("joi");

const signUpSchema = Joi.object({
  name: Joi.string().min(3).max(20).required().trim().messages({
    "string.empty": "Name is required",
    "string.min": "Name must be atleast 3 character",
  }),

  email: Joi.string().email().required().lowercase().messages({
    "string.email": "Enter valid email",
    "any.required": "Email is required",
  }),

  phone: Joi.number().integer().required().messages({
    "string.pattern.base": "Invalid phone number",
  }),

  password: Joi.string()
    .min(6)
    .required()
    .pattern(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d).+$/)
    .messages({
      "string.pattern.base":
        "Password must contain uppercase, lowercase and number",
    }),

  photo: Joi.string().uri().optional().allow(null, "").messages({
    "string.url": "Photo must be a valid url",
  }),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required().lowercase().messages({
    "string.email": "Enter valid email",
    "any.required": "Email is required",
  }),

  password: Joi.string()
    .min(6)
    .required()
    .pattern(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d).+$/)
    .messages({
      "string.pattern.base":
        "Password must contain uppercase, lowercase and number",
    }),
});

const updateSchema = Joi.object({
  action: Joi.string().valid("profile", "resetpassword").required(),

  // for name, email, phone
  name: Joi.when("action", {
    is: "profile",
    then: Joi.string().min(3).max(20).optional().trim().messages({
      "string.empty": "Name is required",
      "string.min": "Name must be atleast 3 character",
    }),
    otherwise: Joi.forbidden(),
  }),

  email: Joi.when("action", {
    is: "profile",
    then: Joi.string().email().optional().lowercase().messages({
      "string.email": "Enter valid email",
      "any.required": "Email is required",
    }),
    otherwise: Joi.forbidden(),
  }),

  phone: Joi.when("action", {
    is: "profile",
    then: Joi.number().integer().optional().messages({
      "string.pattern.base": "Invalid phone number",
    }),
    otherwise: Joi.forbidden(),
  }),

  oldPassword: Joi.when("action", {
    is: "resetpassword",
    then: Joi.string()
      .min(6)
      .required()
      .pattern(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d).+$/)
      .messages({
        "string.pattern.base":
          "Password must contain uppercase, lowercase and number",
      }),
    otherwise: Joi.forbidden(),
  }),

  // for password reset
  newPassword: Joi.when("action", {
    is: "resetpassword",
    then: Joi.string()
      .min(6)
      .required()
      .pattern(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d).+$/)
      .messages({
        "string.pattern.base":
          "Password must contain uppercase, lowercase and number",
      }),
    otherwise: Joi.forbidden(),
  }),

  confirmPassword: Joi.when("action", {
    is: "resetpassword",
    then: Joi.string()
      .min(6)
      .required()
      .pattern(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d).+$/)
      .messages({
        "string.pattern.base":
          "Password must contain uppercase, lowercase and number",
      }),
    otherwise: Joi.forbidden(),
  }),
});

const sendOtpSchema = Joi.object({
  email: Joi.string().email().lowercase().required().messages({
    "string.email": "Enter valid email",
    "any.required": "Email is required",
  }),
  action: Joi.string().required().messages({
    "string.required": "action required",
  }),
});

const verifyOtpSchema = Joi.object({
  email: Joi.string().email().lowercase().required().messages({
    "string.email": "Enter valid email",
    "any.required": "Email is required",
  }),
  otp: Joi.string().length(6).required().trim().messages({
    "otp.empty": "otp required",
    "otp.length": "6 digit required",
  }),
});

const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required().lowercase().messages({
    "string.email": "Enter valid email",
    "any.required": "Email is required",
  }),
  newPass: Joi.string()
    .min(6)
    .required()
    .pattern(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d).+$/)
    .messages({
      "string.pattern.base":
        "Password must contain uppercase, lowercase and number",
    }),
});

module.exports = {
  signUpSchema,
  loginSchema,
  updateSchema,
  forgotPasswordSchema,
  verifyOtpSchema,
  sendOtpSchema,
};
