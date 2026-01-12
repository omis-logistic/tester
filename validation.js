// validation.js - Shared validation rules for both frontend and backend
const VALIDATION_RULES = {
  // Field definitions
  FIELDS: {
    TRACKING_NUMBER: 'trackingNumber',
    NAME_ON_PARCEL: 'nameOnParcel',
    PHONE_NUMBER: 'phoneNumber',
    ITEM_DESCRIPTION: 'itemDescription',
    QUANTITY: 'quantity',
    PRICE: 'price',
    COLLECTION_POINT: 'collectionPoint',
    ITEM_CATEGORY: 'itemCategory'
  },
  
  // Validation patterns
  PATTERNS: {
    TRACKING_NUMBER: /^[A-Za-z0-9-]{5,}$/,
    PHONE_NUMBER: /^(673\d{7,}|60\d{9,})$/,
    EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },
  
  // Limits
  LIMITS: {
    TRACKING_NUMBER_MIN: 5,
    TRACKING_NUMBER_MAX: 50,
    NAME_MIN: 2,
    NAME_MAX: 100,
    DESCRIPTION_MIN: 3,
    DESCRIPTION_MAX: 500,
    QUANTITY_MIN: 1,
    QUANTITY_MAX: 999,
    PRICE_MIN: 0,
    PRICE_MAX: 99999,
    FILE_SIZE_MAX: 5 * 1024 * 1024, // 5MB
    FILES_MAX_COUNT: 3
  },
  
  // Categories that require invoices
  MANDATORY_INVOICE_CATEGORIES: [
    '*Books',
    '*Cosmetics/Skincare/Bodycare',
    '*Food Beverage/Drinks',
    '*Gadgets',
    '*Oil Ointment',
    '*Supplement',
    '*Others'
  ],
  
  // Allowed file types
  ALLOWED_FILE_TYPES: [
    'image/jpeg',
    'image/png',
    'application/pdf'
  ]
};

// Validation functions
class ParcelValidator {
  static validateTrackingNumber(value) {
    const cleaned = String(value).trim().toUpperCase();
    
    if (!cleaned) {
      return { isValid: false, message: 'Tracking number is required' };
    }
    
    if (cleaned.length < VALIDATION_RULES.LIMITS.TRACKING_NUMBER_MIN) {
      return { 
        isValid: false, 
        message: `Tracking number must be at least ${VALIDATION_RULES.LIMITS.TRACKING_NUMBER_MIN} characters` 
      };
    }
    
    if (!VALIDATION_RULES.PATTERNS.TRACKING_NUMBER.test(cleaned)) {
      return { 
        isValid: false, 
        message: 'Only letters, numbers, and hyphens are allowed' 
      };
    }
    
    return { isValid: true, value: cleaned };
  }
  
  static validateName(value) {
    const cleaned = String(value).trim();
    
    if (!cleaned) {
      return { isValid: false, message: 'Name is required' };
    }
    
    if (cleaned.length < VALIDATION_RULES.LIMITS.NAME_MIN) {
      return { 
        isValid: false, 
        message: `Name must be at least ${VALIDATION_RULES.LIMITS.NAME_MIN} characters` 
      };
    }
    
    if (cleaned.length > VALIDATION_RULES.LIMITS.NAME_MAX) {
      return { 
        isValid: false, 
        message: `Name must be less than ${VALIDATION_RULES.LIMITS.NAME_MAX} characters` 
      };
    }
    
    return { isValid: true, value: cleaned };
  }
  
  static validatePhone(value) {
    const cleaned = String(value).trim().replace(/[^\d]/g, '');
    
    if (!cleaned) {
      return { isValid: false, message: 'Phone number is required' };
    }
    
    if (!VALIDATION_RULES.PATTERNS.PHONE_NUMBER.test(cleaned)) {
      return { 
        isValid: false, 
        message: 'Invalid phone number format (Brunei: 673XXXXXXX or Malaysia: 60XXXXXXXXX)' 
      };
    }
    
    return { isValid: true, value: cleaned };
  }
  
  static validateDescription(value) {
    const cleaned = String(value).trim();
    
    if (!cleaned) {
      return { isValid: false, message: 'Item description is required' };
    }
    
    if (cleaned.length < VALIDATION_RULES.LIMITS.DESCRIPTION_MIN) {
      return { 
        isValid: false, 
        message: `Description must be at least ${VALIDATION_RULES.LIMITS.DESCRIPTION_MIN} characters` 
      };
    }
    
    if (cleaned.length > VALIDATION_RULES.LIMITS.DESCRIPTION_MAX) {
      return { 
        isValid: false, 
        message: `Description must be less than ${VALIDATION_RULES.LIMITS.DESCRIPTION_MAX} characters` 
      };
    }
    
    return { isValid: true, value: cleaned };
  }
  
  static validateQuantity(value) {
    const num = Number(value);
    
    if (isNaN(num)) {
      return { isValid: false, message: 'Quantity must be a number' };
    }
    
    if (num < VALIDATION_RULES.LIMITS.QUANTITY_MIN) {
      return { 
        isValid: false, 
        message: `Quantity must be at least ${VALIDATION_RULES.LIMITS.QUANTITY_MIN}` 
      };
    }
    
    if (num > VALIDATION_RULES.LIMITS.QUANTITY_MAX) {
      return { 
        isValid: false, 
        message: `Quantity must be less than ${VALIDATION_RULES.LIMITS.QUANTITY_MAX}` 
      };
    }
    
    return { isValid: true, value: Math.floor(num) };
  }
  
  static validatePrice(value) {
    const num = Number(value);
    
    if (isNaN(num)) {
      return { isValid: false, message: 'Price must be a number' };
    }
    
    if (num < VALIDATION_RULES.LIMITS.PRICE_MIN) {
      return { 
        isValid: false, 
        message: `Price must be ${VALIDATION_RULES.LIMITS.PRICE_MIN} or greater` 
      };
    }
    
    if (num > VALIDATION_RULES.LIMITS.PRICE_MAX) {
      return { 
        isValid: false, 
        message: `Price must be less than ${VALIDATION_RULES.LIMITS.PRICE_MAX}` 
      };
    }
    
    return { isValid: true, value: parseFloat(num.toFixed(2)) };
  }
  
  static validateCategory(value) {
    const cleaned = String(value).trim();
    
    if (!cleaned) {
      return { isValid: false, message: 'Item category is required' };
    }
    
    return { isValid: true, value: cleaned };
  }
  
  static validateFiles(files, category) {
    if (!files || !files.length) {
      // Check if files are required for this category
      if (VALIDATION_RULES.MANDATORY_INVOICE_CATEGORIES.includes(category)) {
        return { 
          isValid: false, 
          message: 'Invoice/document upload is required for this category' 
        };
      }
      return { isValid: true, files: [] };
    }
    
    // Check file count
    if (files.length > VALIDATION_RULES.LIMITS.FILES_MAX_COUNT) {
      return { 
        isValid: false, 
        message: `Maximum ${VALIDATION_RULES.LIMITS.FILES_MAX_COUNT} files allowed` 
      };
    }
    
    // Validate each file
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Check file type
      if (!VALIDATION_RULES.ALLOWED_FILE_TYPES.includes(file.type)) {
        return { 
          isValid: false, 
          message: `File "${file.name}" must be JPG, PNG, or PDF` 
        };
      }
      
      // Check file size
      if (file.size > VALIDATION_RULES.LIMITS.FILE_SIZE_MAX) {
        return { 
          isValid: false, 
          message: `File "${file.name}" exceeds ${VALIDATION_RULES.LIMITS.FILE_SIZE_MAX / (1024 * 1024)}MB limit` 
        };
      }
    }
    
    return { isValid: true, files: files };
  }
  
  // Validate entire parcel data object
  static validateParcelData(data, files = []) {
    const errors = [];
    const validatedData = {};
    
    // Validate each field
    const validations = {
      trackingNumber: this.validateTrackingNumber(data.trackingNumber),
      nameOnParcel: this.validateName(data.nameOnParcel),
      phoneNumber: this.validatePhone(data.phoneNumber),
      itemDescription: this.validateDescription(data.itemDescription),
      quantity: this.validateQuantity(data.quantity),
      price: this.validatePrice(data.price),
      itemCategory: this.validateCategory(data.itemCategory),
      files: this.validateFiles(files, data.itemCategory)
    };
    
    // Check collection point separately
    if (!data.collectionPoint) {
      errors.push('Collection point is required');
    } else {
      validatedData.collectionPoint = data.collectionPoint;
    }
    
    // Collect errors and validated values
    Object.keys(validations).forEach(key => {
      const validation = validations[key];
      if (!validation.isValid) {
        errors.push(validation.message);
      } else if (key !== 'files') {
        validatedData[key] = validation.value;
      }
    });
    
    if (errors.length > 0) {
      return {
        isValid: false,
        errors: errors,
        message: errors.join(', ')
      };
    }
    
    return {
      isValid: true,
      data: validatedData,
      files: validations.files.files
    };
  }
}

// Export for use in different environments
if (typeof module !== 'undefined' && module.exports) {
  // Node.js/CommonJS
  module.exports = { VALIDATION_RULES, ParcelValidator };
} else if (typeof window !== 'undefined') {
  // Browser
  window.ParcelValidator = ParcelValidator;
  window.VALIDATION_RULES = VALIDATION_RULES;
}
