const mongoose = require("mongoose");

const paymentMethodSchema = new mongoose.Schema({
  label: {
    type: String,
    default: "",
    trim: true,
  },
  details: {
    type: String,
    default: "",
    trim: true,
  },
  upiId: {
    type: String,
    default: "",
    trim: true,
  },
  qrImage: {
    type: String,
    default: "",
    trim: true,
  },
}, {
  _id: false,
});

const paymentSettingsSchema = new mongoose.Schema({
  singletonKey: {
    type: String,
    required: true,
    unique: true,
    default: "default",
  },
  merchantName: {
    type: String,
    default: "E-Book Market",
    trim: true,
  },
  supportNote: {
    type: String,
    default: "",
    trim: true,
  },
  manualCheckoutEnabled: {
    type: Boolean,
    default: true,
  },
  methods: {
    UPI: {
      type: paymentMethodSchema,
      default: () => ({}),
    },
    GPay: {
      type: paymentMethodSchema,
      default: () => ({}),
    },
    PayPal: {
      type: paymentMethodSchema,
      default: () => ({}),
    },
  },
}, {
  timestamps: true,
});

module.exports = mongoose.models.PaymentSettings || mongoose.model("PaymentSettings", paymentSettingsSchema);
