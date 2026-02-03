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

  phone: Joi.string()
    .pattern(/^[6-9]\d{9}$/)
    .required()
    .messages({
      "string.pattern.base": "Invalid phone number",
    }),

  password: Joi.string()
    .min(6)
    .max(8)
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
    .max(8)
    .required()
    .pattern(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d).+$/)
    .messages({
      "string.pattern.base":
        "Password must contain uppercase, lowercase and number",
    }),
});

module.exports = { signUpSchema, loginSchema };
