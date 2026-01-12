// ================= CONFIGURATION =================
const CONFIG = {
  GAS_URL: 'https://script.google.com/macros/s/AKfycbyVRBYtvDiV8jZ_ex3rbnPFcYsUkyKQO3bKuEmdBSzJrbIH7P4dluvnfKkegaK_qKnR/exec',
  PROXY_URL: 'https://script.google.com/macros/s/AKfycbwopaQUGaroleG-7L53J0x56lHyitPR5MCjGA-2s61wwTgL3x570Pw2FSxtsR6KUTHW/exec',
  SESSION_TIMEOUT: 1800, // 30 minutes in seconds
  MAX_FILE_SIZE: 5 * 1024 * 1024,
  ALLOWED_FILE_TYPES: ['image/jpeg', 'image/png', 'application/pdf'],
  MAX_FILES: 3
};

// ================= SHARED VALIDATION RULES =================
const VALIDATION_RULES = {
  PATTERNS: {
    TRACKING_NUMBER: /^[A-Za-z0-9-]{5,}$/,
    PHONE_NUMBER: /^(673\d{7,}|60\d{9,})$/,
    EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },
  
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
    FILE_SIZE_MAX: 5 * 1024 * 1024,
    FILES_MAX_COUNT: 3
  },
  
  MANDATORY_INVOICE_CATEGORIES: [
    '*Books',
    '*Cosmetics/Skincare/Bodycare',
    '*Food Beverage/Drinks',
    '*Gadgets',
    '*Oil Ointment',
    '*Supplement',
    '*Others'
  ],
  
  ALLOWED_FILE_TYPES: [
    'image/jpeg',
    'image/png',
    'application/pdf'
  ]
};

// ================= VIEWPORT MANAGEMENT =================
function detectViewMode() {
  const isMobile = (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
  
  document.body.classList.add(isMobile ? 'mobile-view' : 'desktop-view');
  
  const viewport = document.querySelector('meta[name="viewport"]') || document.createElement('meta');
  viewport.name = 'viewport';
  viewport.content = isMobile 
    ? 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no'
    : 'width=1200';
  
  if (!document.querySelector('meta[name="viewport"]')) {
    document.head.prepend(viewport);
  }
}

// ================= ERROR HANDLING =================
function showError(message, targetId = 'error-message') {
  const errorElement = document.getElementById(targetId) || createErrorElement();
  
  // Special handling for success-like messages
  if (typeof message === 'string' && message.includes('success')) {
    errorElement.style.background = '#00C851dd';
    errorElement.textContent = message.replace('success', '').trim();
  } else {
    errorElement.style.background = '#ff4444dd';
    errorElement.textContent = message;
  }
  
  errorElement.style.display = 'block';
  
  setTimeout(() => {
    errorElement.style.display = 'none';
  }, 5000);
}

function createErrorElement() {
  const errorDiv = document.createElement('div');
  errorDiv.id = 'error-message';
  errorDiv.className = 'error-message';
  errorDiv.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    padding: 15px;
    background: #ff4444dd;
    color: white;
    border-radius: 5px;
    z-index: 1000;
    display: none;
  `;
  document.body.prepend(errorDiv);
  return errorDiv;
}

// ================= ENHANCED SESSION MANAGEMENT =================
const checkSession = () => {
  const sessionData = sessionStorage.getItem('userData');
  const sessionToken = sessionStorage.getItem('sessionToken');
  const lastActivity = sessionStorage.getItem('lastActivity');

  if (!sessionData || !sessionToken) {
    console.log('No session data or token found');
    return null;
  }

  // Check session timeout (30 minutes)
  if (lastActivity && Date.now() - lastActivity > CONFIG.SESSION_TIMEOUT * 1000) {
    console.log('Session expired');
    sessionStorage.clear();
    localStorage.removeItem('lastActivity');
    return null;
  }

  try {
    const userData = JSON.parse(sessionData);
    
    // Update last activity
    sessionStorage.setItem('lastActivity', Date.now());
    localStorage.setItem('lastActivity', Date.now());
    
    // Check if temp password requires reset
    if (userData?.tempPassword && !window.location.pathname.includes('password-reset.html')) {
      console.log('Temp password detected but not on reset page');
      return null;
    }

    return {
      ...userData,
      sessionToken: sessionToken
    };
  } catch (error) {
    console.error('Error parsing session data:', error);
    sessionStorage.clear();
    localStorage.removeItem('lastActivity');
    return null;
  }
};

function handleLogout() {
  console.log('Logging out...');
  
  // Clear all session data
  sessionStorage.clear();
  localStorage.removeItem('lastActivity');
  
  // Only redirect if not already on login page
  if (!window.location.pathname.includes('login.html')) {
    window.location.href = 'login.html?logout=' + Date.now();
  }
}

// ================= IDEMPOTENCY KEY GENERATION =================
function generateIdempotencyKey() {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  const userData = checkSession();
  const userId = userData?.phone || 'anonymous';
  
  // Create a hash-like key
  const key = `${userId}_${timestamp}_${random}`;
  return btoa(key).replace(/[^a-zA-Z0-9]/g, '');
}

// ================= API HANDLER =================
async function callAPI(action, payload) {
  try {
    const formData = new FormData();
    
    if (payload.files) {
      payload.files.forEach((file, index) => {
        const blob = new Blob(
          [Uint8Array.from(atob(file.base64), c => c.charCodeAt(0))],
          { type: file.type }
        );
        formData.append(`file${index}`, blob, file.name);
      });
    }

    formData.append('data', JSON.stringify(payload.data));

    const response = await fetch(CONFIG.GAS_URL, {
      method: 'POST',
      body: formData
    });

    return await response.json();
  } catch (error) {
    console.error('API Call Failed:', error);
    return { success: false, message: error.message };
  }
}

function showLoading(show = true, message = 'Processing...') {
  const loader = document.getElementById('loadingOverlay');
  if (!loader) return;

  const textElement = loader.querySelector('.loading-text');
  if (textElement) {
    textElement.textContent = message;
  }

  loader.style.display = show ? 'flex' : 'none';
  
  // Add a timeout to show "this may take a while" for long operations
  if (show) {
    setTimeout(() => {
      if (loader.style.display === 'flex' && textElement) {
        textElement.textContent = message + ' This may take a while...';
      }
    }, 3000);
  }
}

function createLoaderElement() {
  const overlay = document.createElement('div');
  overlay.id = 'loadingOverlay';
  overlay.innerHTML = `
    <div class="loading-spinner"></div>
    <div class="loading-text">Processing Submission...</div>
  `;
  
  // Add styles directly for reliability
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.85);
    display: none;
    justify-content: center;
    align-items: center;
    z-index: 9999;
    flex-direction: column;
    gap: 1rem;
  `;
  
  const text = overlay.querySelector('.loading-text');
  if (text) {
    text.style.color = 'var(--gold)';
    text.style.fontSize = '1.2rem';
  }
  
  document.body.appendChild(overlay);
  return overlay;
}

function showSuccessMessage() {
  const messageElement = document.getElementById('message');
  if (!messageElement) return;

  messageElement.textContent = 'Data is processed!';
  messageElement.className = 'success';
  messageElement.style.display = 'block';

  // Add animation effects
  messageElement.style.animation = 'slideIn 0.5s ease-out';
  setTimeout(() => {
    messageElement.style.animation = 'fadeOut 1s ease 2s forwards';
  }, 2000);

  // Add celebratory animation
  const confetti = document.createElement('div');
  confetti.className = 'confetti-effect';
  document.body.appendChild(confetti);
  setTimeout(() => confetti.remove(), 3000);
}

function resetForm() {
  const form = document.getElementById('declarationForm');
  if (!form) return;

  // Clear all fields except phone
  form.querySelectorAll('input:not(#phone), select, textarea').forEach(field => {
    if (field.type === 'file') {
      field.value = null;
    } else if (field.tagName === 'SELECT') {
      field.selectedIndex = 0;
    } else {
      field.value = '';
    }
  });

  // Preserve phone number styling
  const phoneField = document.getElementById('phone');
  if (phoneField) {
    phoneField.style.backgroundColor = '#2a2a2a';
    phoneField.style.color = '#ffffff';
  }

  // Trigger validation after reset
  setTimeout(() => {
    if (typeof runInitialValidation === 'function') {
      runInitialValidation();
    }
    // Also check category requirements
    if (typeof checkCategoryRequirements === 'function') {
      checkCategoryRequirements();
    }
  }, 100);
}

// ================= ENHANCED VALIDATION SYSTEM =================
// Shared validation functions
function validateTrackingNumberOnLoad(value) {
  return value && VALIDATION_RULES.PATTERNS.TRACKING_NUMBER.test(value.trim());
}

function validateNameOnLoad(value) {
  return value && value.trim().length >= VALIDATION_RULES.LIMITS.NAME_MIN;
}

function validateDescriptionOnLoad(value) {
  return value && value.trim().length >= VALIDATION_RULES.LIMITS.DESCRIPTION_MIN;
}

function validateQuantityOnLoad(value) {
  const num = parseInt(value);
  return !isNaN(num) && num >= VALIDATION_RULES.LIMITS.QUANTITY_MIN && num <= VALIDATION_RULES.LIMITS.QUANTITY_MAX;
}

function validatePriceOnLoad(value) {
  if (value === '' || value === null || value === undefined) return false;
  const num = parseFloat(value);
  return !isNaN(num) && num >= VALIDATION_RULES.LIMITS.PRICE_MIN && num <= VALIDATION_RULES.LIMITS.PRICE_MAX;
}

function validateSelectOnLoad(value) {
  return value && value !== '';
}

function validatePhone(value) {
  return VALIDATION_RULES.PATTERNS.PHONE_NUMBER.test(value.replace(/[^\d]/g, ''));
}

function validateEmail(value) {
  return VALIDATION_RULES.PATTERNS.EMAIL.test(value);
}

// ================= REAL-TIME VALIDATION SYSTEM =================
function initRealTimeValidation() {
  console.log('Initializing real-time validation...');
  
  // Run initial validation on page load
  setTimeout(() => {
    console.log('Running initial page load validation...');
    runInitialValidation();
    
    // Update validation on every input
    setupRealTimeValidationListeners();
  }, 100);
}

function runInitialValidation() {
  console.log('Running initial validation for all fields...');
  
  const fieldsToValidate = [
    { id: 'trackingNumber', name: 'Tracking Number', type: 'tracking' },
    { id: 'nameOnParcel', name: 'Name on Parcel', type: 'name' },
    { id: 'itemDescription', name: 'Item Description', type: 'description' },
    { id: 'quantity', name: 'Quantity', type: 'quantity' },
    { id: 'price', name: 'Price', type: 'price' },
    { id: 'collectionPoint', name: 'Collection Point', type: 'select' },
    { id: 'itemCategory', name: 'Item Category', type: 'select' }
  ];
  
  // Validate each field
  fieldsToValidate.forEach(field => {
    const fieldElement = document.getElementById(field.id);
    const errorElement = document.getElementById(field.id + 'Error') || 
                        createErrorMessageElement(field.id);
    
    if (!fieldElement) return;
    
    let isValid = false;
    let message = '';
    
    switch(field.type) {
      case 'tracking':
        isValid = validateTrackingNumberOnLoad(fieldElement.value);
        message = isValid ? '' : 'Minimum 5 alphanumeric characters or hyphens';
        break;
      case 'name':
        isValid = validateNameOnLoad(fieldElement.value);
        message = isValid ? '' : `Minimum ${VALIDATION_RULES.LIMITS.NAME_MIN} characters required`;
        break;
      case 'description':
        isValid = validateDescriptionOnLoad(fieldElement.value);
        message = isValid ? '' : `Minimum ${VALIDATION_RULES.LIMITS.DESCRIPTION_MIN} characters required`;
        break;
      case 'quantity':
        isValid = validateQuantityOnLoad(fieldElement.value);
        message = isValid ? '' : `Must be between ${VALIDATION_RULES.LIMITS.QUANTITY_MIN} and ${VALIDATION_RULES.LIMITS.QUANTITY_MAX}`;
        break;
      case 'price':
        isValid = validatePriceOnLoad(fieldElement.value);
        message = isValid ? '' : `Price must be between ${VALIDATION_RULES.LIMITS.PRICE_MIN} and ${VALIDATION_RULES.LIMITS.PRICE_MAX}`;
        break;
      case 'select':
        isValid = validateSelectOnLoad(fieldElement.value);
        message = isValid ? '' : 'Please select an option';
        break;
    }
    
    // Update UI
    updateFieldValidationState(fieldElement, isValid, message);
  });
  
  // Validate files if required
  const category = document.getElementById('itemCategory')?.value?.trim() || '';
  
  if (VALIDATION_RULES.MANDATORY_INVOICE_CATEGORIES.includes(category)) {
    const files = document.getElementById('fileUpload')?.files || [];
    if (files.length === 0) {
      const fileInput = document.getElementById('fileUpload');
      const fileError = document.getElementById('invoiceFilesError') || 
                       createErrorMessageElement('invoiceFiles');
      
      if (fileInput && fileError) {
        fileError.textContent = 'Required: At least 1 invoice/document required';
        fileError.style.color = '#ff4444';
        fileError.style.display = 'block';
        fileInput.style.borderColor = '#ff4444';
        fileInput.parentElement.classList.add('invalid');
      }
    }
  }
  
  // Update submit button
  updateSubmitButton();
  
  return true;
}

function createErrorMessageElement(fieldId) {
  const errorSpan = document.createElement('span');
  errorSpan.id = fieldId + 'Error';
  errorSpan.className = 'validation-message';
  
  const fieldElement = document.getElementById(fieldId);
  const parent = fieldElement?.parentElement;
  if (fieldElement && parent) {
    parent.appendChild(errorSpan);
  }
  
  return errorSpan;
}

function updateFieldValidationState(fieldElement, isValid, message) {
  const errorElement = document.getElementById(fieldElement.id + 'Error');
  const parent = fieldElement.parentElement;
  
  // Remove existing validation classes
  parent.classList.remove('valid', 'invalid');
  
  if (isValid) {
    parent.classList.add('valid');
    if (errorElement) {
      errorElement.textContent = '';
      errorElement.style.display = 'none';
      fieldElement.style.borderColor = '#444';
    }
  } else {
    parent.classList.add('invalid');
    if (errorElement) {
      errorElement.textContent = message;
      errorElement.style.color = '#ff4444';
      errorElement.style.display = 'block';
      fieldElement.style.borderColor = '#ff4444';
    }
  }
  
  // Clean styling - remove all special backgrounds and borders
  if (errorElement) {
    errorElement.style.backgroundColor = 'transparent';
    errorElement.style.border = 'none';
    errorElement.style.boxShadow = 'none';
    errorElement.style.padding = '2px 0';
  }
}

function setupRealTimeValidationListeners() {
  console.log('Setting up real-time validation listeners...');
  
  const fields = [
    'trackingNumber',
    'nameOnParcel', 
    'itemDescription',
    'quantity',
    'price',
    'collectionPoint',
    'itemCategory'
  ];
  
  fields.forEach(fieldId => {
    const field = document.getElementById(fieldId);
    if (field) {
      field.addEventListener('input', () => validateFieldInRealTime(field));
      field.addEventListener('change', () => validateFieldInRealTime(field));
      
      // For select fields, validate on change
      if (field.tagName === 'SELECT') {
        field.addEventListener('change', () => {
          validateFieldInRealTime(field);
          checkCategoryRequirements();
        });
      }
    }
  });
  
  // File upload validation
  const fileUpload = document.getElementById('fileUpload');
  if (fileUpload) {
    fileUpload.addEventListener('change', validateFilesInRealTime);
  }
}

function validateFieldInRealTime(field) {
  const value = field.value;
  let isValid = false;
  let message = '';
  
  switch(field.id) {
    case 'trackingNumber':
      isValid = validateTrackingNumberOnLoad(value);
      message = isValid ? '' : 'Minimum 5 alphanumeric characters or hyphens';
      break;
    case 'nameOnParcel':
      isValid = validateNameOnLoad(value);
      message = isValid ? '' : `Minimum ${VALIDATION_RULES.LIMITS.NAME_MIN} characters required`;
      break;
    case 'itemDescription':
      isValid = validateDescriptionOnLoad(value);
      message = isValid ? '' : `Minimum ${VALIDATION_RULES.LIMITS.DESCRIPTION_MIN} characters required`;
      break;
    case 'quantity':
      isValid = validateQuantityOnLoad(value);
      message = isValid ? '' : `Must be between ${VALIDATION_RULES.LIMITS.QUANTITY_MIN} and ${VALIDATION_RULES.LIMITS.QUANTITY_MAX}`;
      break;
    case 'price':
      isValid = validatePriceOnLoad(value);
      message = isValid ? '' : `Price must be between ${VALIDATION_RULES.LIMITS.PRICE_MIN} and ${VALIDATION_RULES.LIMITS.PRICE_MAX}`;
      break;
    case 'collectionPoint':
    case 'itemCategory':
      isValid = validateSelectOnLoad(value);
      message = isValid ? '' : 'Please select an option';
      break;
  }
  
  updateFieldValidationState(field, isValid, message);
  updateSubmitButton();
  
  // If this is the category field, also check file requirements
  if (field.id === 'itemCategory') {
    setTimeout(() => {
      checkCategoryRequirements();
    }, 100);
  }
}

function validateFilesInRealTime() {
  const fileInput = document.getElementById('fileUpload');
  const category = document.getElementById('itemCategory')?.value?.trim() || '';
  
  if (!fileInput) return;
  
  const errorElement = document.getElementById('invoiceFilesError');
  const parent = fileInput.parentElement;
  
  parent.classList.remove('valid', 'invalid');
  
  // Check if files are required for this category
  if (VALIDATION_RULES.MANDATORY_INVOICE_CATEGORIES.includes(category)) {
    const files = fileInput.files;
    
    if (files.length === 0) {
      errorElement.textContent = 'Required: At least 1 invoice/document required';
      errorElement.style.color = '#ff4444';
      errorElement.style.display = 'block';
      parent.classList.add('invalid');
      fileInput.style.borderColor = '#ff4444';
    } else {
      // Validate each file
      let allValid = true;
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        if (!VALIDATION_RULES.ALLOWED_FILE_TYPES.includes(file.type)) {
          errorElement.textContent = `File "${file.name}" must be JPG, PNG, or PDF`;
          allValid = false;
          break;
        }
        
        if (file.size > VALIDATION_RULES.LIMITS.FILE_SIZE_MAX) {
          errorElement.textContent = `File "${file.name}" exceeds 5MB limit`;
          allValid = false;
          break;
        }
        
        if (files.length > VALIDATION_RULES.LIMITS.FILES_MAX_COUNT) {
          errorElement.textContent = `Maximum ${VALIDATION_RULES.LIMITS.FILES_MAX_COUNT} files allowed`;
          allValid = false;
          break;
        }
      }
      
      if (allValid) {
        errorElement.textContent = `${files.length} file(s) selected`;
        errorElement.style.color = '#00C851';
        parent.classList.add('valid');
        fileInput.style.borderColor = '#00C851';
      } else {
        errorElement.style.color = '#ff4444';
        parent.classList.add('invalid');
        fileInput.style.borderColor = '#ff4444';
      }
    }
  } else {
    // Not required, but validate if files are uploaded
    const files = fileInput.files;
    if (files.length > 0) {
      // Validate each file
      let allValid = true;
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        if (!VALIDATION_RULES.ALLOWED_FILE_TYPES.includes(file.type)) {
          errorElement.textContent = `File "${file.name}" must be JPG, PNG, or PDF`;
          allValid = false;
          break;
        }
        
        if (file.size > VALIDATION_RULES.LIMITS.FILE_SIZE_MAX) {
          errorElement.textContent = `File "${file.name}" exceeds 5MB limit`;
          allValid = false;
          break;
        }
        
        if (files.length > VALIDATION_RULES.LIMITS.FILES_MAX_COUNT) {
          errorElement.textContent = `Maximum ${VALIDATION_RULES.LIMITS.FILES_MAX_COUNT} files allowed`;
          allValid = false;
          break;
        }
      }
      
      if (allValid) {
        errorElement.textContent = `${files.length} file(s) selected (optional)`;
        errorElement.style.color = '#888';
        parent.classList.add('valid');
        fileInput.style.borderColor = '#00C851';
      } else {
        errorElement.style.color = '#ff4444';
        parent.classList.add('invalid');
        fileInput.style.borderColor = '#ff4444';
      }
    } else {
      errorElement.textContent = 'Optional: Upload invoice/documents if available';
      errorElement.style.color = '#888';
      errorElement.style.display = 'block';
      fileInput.style.borderColor = '#444';
    }
  }
  
  updateSubmitButton();
}

function checkCategoryRequirements() {
  const category = document.getElementById('itemCategory')?.value?.trim() || '';
  
  const fileInput = document.getElementById('fileUpload');
  const fileHelp = document.getElementById('fileHelp');
  const fileRequirement = document.getElementById('fileRequirement');
  
  if (!fileInput || !fileHelp) return;
  
  if (VALIDATION_RULES.MANDATORY_INVOICE_CATEGORIES.includes(category)) {
    // Show as required
    if (fileRequirement) {
      fileRequirement.textContent = 'Required: ';
      fileRequirement.style.color = '#ff4444';
    }
    fileHelp.style.color = '#ff4444';
    fileHelp.style.fontWeight = 'bold';
    
    // Validate immediately
    setTimeout(() => {
      validateFilesInRealTime();
    }, 100);
  } else {
    // Show as optional
    if (fileRequirement) {
      fileRequirement.textContent = 'Optional: ';
      fileRequirement.style.color = '#888';
    }
    fileHelp.style.color = '#888';
    fileHelp.style.fontWeight = 'normal';
    
    // Clear any error state
    const errorElement = document.getElementById('invoiceFilesError');
    const parent = fileInput.parentElement;
    
    if (errorElement) {
      errorElement.textContent = 'Optional: Upload invoice/documents if available';
      errorElement.style.color = '#888';
    }
    
    parent.classList.remove('invalid');
    fileInput.style.borderColor = '#444';
  }
  
  updateSubmitButton();
}

function updateSubmitButton() {
  const submitBtn = document.getElementById('submitBtn');
  if (!submitBtn) return;
  
  // Check each field's validation state
  const fields = [
    'trackingNumber',
    'nameOnParcel',
    'itemDescription',
    'quantity',
    'price',
    'collectionPoint',
    'itemCategory'
  ];
  
  let allValid = true;
  
  fields.forEach(fieldId => {
    const field = document.getElementById(fieldId);
    const parent = field?.parentElement;
    
    if (!field) {
      allValid = false;
      return;
    }
    
    // Check if field has invalid class or is empty
    if (parent && parent.classList.contains('invalid')) {
      allValid = false;
      return;
    }
    
    // Check field value
    if (field.tagName === 'SELECT') {
      if (!field.value) allValid = false;
    } else if (field.type === 'number') {
      if (field.value === '') allValid = false;
    } else {
      if (!field.value.trim()) allValid = false;
    }
  });
  
  // Check file requirements for starred categories
  const category = document.getElementById('itemCategory')?.value?.trim() || '';
  
  if (VALIDATION_RULES.MANDATORY_INVOICE_CATEGORIES.includes(category)) {
    const files = document.getElementById('fileUpload')?.files || [];
    const fileParent = document.getElementById('fileUpload')?.parentElement;
    
    if (files.length === 0 || (fileParent && fileParent.classList.contains('invalid'))) {
      allValid = false;
    }
  }
  
  // Update button state
  submitBtn.disabled = !allValid;
  
  // Update button text based on state
  const submitText = document.getElementById('submitText');
  if (submitText) {
    submitText.textContent = allValid ? 'Submit Declaration' : 'Please fix errors above';
  }
  
  // Visual feedback
  if (allValid) {
    submitBtn.style.background = 'linear-gradient(135deg, #d4af37, #b8941f)';
    submitBtn.style.cursor = 'pointer';
    submitBtn.style.opacity = '1';
  } else {
    submitBtn.style.background = '#555';
    submitBtn.style.cursor = 'not-allowed';
    submitBtn.style.opacity = '0.7';
  }
}

// ================= ENHANCED SUBMISSION SYSTEM =================
// Universal submission function that works for all browsers
async function submitParcelData(payload) {
  console.log('Starting submission...', { 
    trackingNumber: payload.data.trackingNumber,
    filesCount: payload.files?.length || 0 
  });

  try {
    // Try multiple submission methods in order
    const results = await tryAllSubmissionMethods(payload);
    
    if (results.success) {
      console.log('Data is processed via', results.method);
      return results;
    }
    
    // If all methods fail, try one last attempt with simplified payload
    return await tryFallbackSubmission(payload);
    
  } catch (error) {
    console.error('All submission methods failed:', error);
    throw new Error(`Submission failed: ${error.message}`);
  }
}

// Try multiple submission methods
async function tryAllSubmissionMethods(payload) {
  const methods = [
    tryPostViaProxy,
    tryPostViaDirect,
    tryJSONPSubmission,
    tryFormDataSubmission
  ];

  for (const method of methods) {
    try {
      console.log(`Trying submission method: ${method.name}`);
      const result = await method(payload);
      
      if (result && result.success) {
        return { 
          ...result, 
          method: method.name,
          success: true 
        };
      }
    } catch (error) {
      console.warn(`${method.name} failed:`, error.message);
      continue;
    }
  }
  
  throw new Error('All submission methods failed');
}

// Method 1: POST via Proxy (UPDATED WITH AUTHENTICATION)
async function tryPostViaProxy(payload) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const url = CONFIG.PROXY_URL;
    
    xhr.open('POST', url, true);
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8');
    
    xhr.timeout = 30000; // 30 second timeout
    xhr.withCredentials = false;
    
    xhr.onload = function() {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          
          // Check if backend returned success:false
          if (response.success === false) {
            reject(new Error(response.message || 'Submission failed at server'));
          } else {
            resolve(response);
          }
        } catch (e) {
          console.log('Raw response:', xhr.responseText);
          reject(new Error('Invalid response format from server'));
        }
      } else {
        reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`));
      }
    };
    
    xhr.onerror = function() {
      reject(new Error('Network error - proxy request failed'));
    };
    
    xhr.ontimeout = function() {
      reject(new Error('Request timeout (30s)'));
    };
    
    // Send data with idempotency key
    const dataToSend = {
      ...payload,
      idempotencyKey: generateIdempotencyKey()
    };
    
    const data = `payload=${encodeURIComponent(JSON.stringify(dataToSend))}`;
    console.log('Sending to proxy:', url);
    xhr.send(data);
  });
}

// Method 2: POST via Direct GAS
async function tryPostViaDirect(payload) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const url = CONFIG.GAS_URL;
    
    xhr.open('POST', url, true);
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8');
    
    xhr.timeout = 30000;
    
    xhr.onload = function() {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          // Google Apps Script redirects, so check the final response
          if (xhr.responseText.includes('script.google.com')) {
            // This might be a redirect, extract the final URL
            const match = xhr.responseText.match(/src="([^"]+)"/);
            if (match && match[1]) {
              // Try to follow the redirect
              fetch(match[1]).then(res => res.text()).then(text => {
                try {
                  const json = JSON.parse(text);
                  resolve(json);
                } catch {
                  resolve({ success: true, message: 'Submitted via redirect' });
                }
              }).catch(() => {
                resolve({ success: true, message: 'Submitted (redirect followed)' });
              });
            } else {
              resolve({ success: true, message: 'Submitted successfully' });
            }
          } else {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          }
        } catch (e) {
          console.log('Direct GAS raw response:', xhr.responseText.substring(0, 200));
          resolve({ 
            success: true, 
            message: 'Submitted to GAS directly' 
          });
        }
      } else {
        reject(new Error(`Direct GAS failed: HTTP ${xhr.status}`));
      }
    };
    
    xhr.onerror = function() {
      reject(new Error('Direct GAS network error'));
    };
    
    xhr.send(`action=submitParcelDeclaration&data=${encodeURIComponent(JSON.stringify(payload.data))}`);
  });
}

// Method 3: JSONP Submission
async function tryJSONPSubmission(payload) {
  return new Promise((resolve, reject) => {
    const callbackName = 'jsonpCallback_' + Date.now();
    const script = document.createElement('script');
    
    // Build URL - use GET with parameters
    const url = new URL(CONFIG.GAS_URL);
    url.searchParams.append('callback', callbackName);
    url.searchParams.append('action', 'submitParcelDeclaration');
    url.searchParams.append('data', JSON.stringify(payload.data));
    
    // Handle files separately if they exist
    if (payload.files && payload.files.length > 0) {
      url.searchParams.append('hasFiles', 'true');
      // Note: JSONP cannot send files, so files will be skipped
    }
    
    script.src = url.toString();
    script.async = true;
    script.crossOrigin = 'anonymous';
    
    let timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error('JSONP timeout'));
    }, 20000);
    
    function cleanup() {
      clearTimeout(timeoutId);
      delete window[callbackName];
      if (script.parentNode) {
        document.head.removeChild(script);
      }
    }
    
    window[callbackName] = function(response) {
      cleanup();
      if (response && response.success) {
        resolve(response);
      } else {
        reject(new Error(response?.message || 'JSONP submission failed'));
      }
    };
    
    script.onerror = function() {
      cleanup();
      reject(new Error('JSONP script failed to load'));
    };
    
    document.head.appendChild(script);
  });
}

// Method 4: FormData Submission (for modern browsers)
async function tryFormDataSubmission(payload) {
  const formData = new FormData();
  
  // Add JSON data with idempotency key
  const dataToSend = {
    ...payload.data,
    sessionToken: payload.data.sessionToken,
    idempotencyKey: generateIdempotencyKey()
  };
  
  formData.append('data', JSON.stringify(dataToSend));
  
  // Add files if they exist
  if (payload.files && payload.files.length > 0) {
    for (let i = 0; i < payload.files.length; i++) {
      const file = payload.files[i];
      const blob = base64ToBlob(file.base64, file.type);
      formData.append(`file${i}`, blob, file.name);
    }
  }
  
  const response = await fetch(CONFIG.GAS_URL, {
    method: 'POST',
    body: formData,
    // Don't set Content-Type header for FormData
  });
  
  if (!response.ok) {
    throw new Error(`FormData submission failed: ${response.status}`);
  }
  
  return await response.json();
}

// Fallback submission with reduced payload
async function tryFallbackSubmission(payload) {
  console.log('Trying fallback submission...');
  
  // Create minimal payload without files
  const minimalPayload = {
    action: 'submitParcelDeclaration',
    data: {
      trackingNumber: payload.data.trackingNumber,
      nameOnParcel: payload.data.nameOnParcel,
      phoneNumber: payload.data.phoneNumber,
      itemDescription: payload.data.itemDescription,
      quantity: payload.data.quantity,
      price: payload.data.price,
      collectionPoint: payload.data.collectionPoint,
      itemCategory: payload.data.itemCategory,
      sessionToken: payload.data.sessionToken,
      idempotencyKey: generateIdempotencyKey()
    }
  };
  
  // Use simple fetch with short timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);
  
  try {
    const response = await fetch(CONFIG.PROXY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `payload=${encodeURIComponent(JSON.stringify(minimalPayload))}`,
      signal: controller.signal,
      mode: 'no-cors' // Try no-cors as last resort
    });
    
    clearTimeout(timeoutId);
    
    // With no-cors, we can't read the response, but the request went through
    if (response.type === 'opaque') {
      return {
        success: true,
        message: 'Submitted (no response verification)',
        warning: 'Cannot verify submission due to CORS restrictions'
      };
    }
    
    throw new Error('Fallback submission failed');
    
  } catch (error) {
    clearTimeout(timeoutId);
    
    // Even if fetch fails, the request might have succeeded
    // Save to localStorage for manual recovery
    saveFailedSubmission(payload);
    
    return {
      success: false,
      message: 'Submission failed. Data saved locally for recovery.',
      error: error.message,
      savedLocally: true
    };
  }
}

// Save failed submission to localStorage
function saveFailedSubmission(payload) {
  try {
    const failedSubmissions = JSON.parse(localStorage.getItem('failedSubmissions') || '[]');
    
    const submission = {
      ...payload,
      timestamp: new Date().toISOString(),
      id: 'failed_' + Date.now()
    };
    
    failedSubmissions.push(submission);
    
    // Keep only last 10 failed submissions
    if (failedSubmissions.length > 10) {
      failedSubmissions.shift();
    }
    
    localStorage.setItem('failedSubmissions', JSON.stringify(failedSubmissions));
    
    console.log('Saved failed submission locally:', submission.id);
    
  } catch (error) {
    console.error('Failed to save submission locally:', error);
  }
}

// Convert base64 to Blob
function base64ToBlob(base64, mimeType) {
  const byteCharacters = atob(base64);
  const byteArrays = [];
  
  for (let offset = 0; offset < byteCharacters.length; offset += 512) {
    const slice = byteCharacters.slice(offset, offset + 512);
    const byteNumbers = new Array(slice.length);
    
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }
    
    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }
  
  return new Blob(byteArrays, { type: mimeType });
}

// ================= UPDATED PARCEL SUBMISSION HANDLER =================
async function handleParcelSubmission(e) {
  e.preventDefault();
  const form = e.target;
  showLoading(true, "Submitting parcel declaration...");

  try {
    // Get form data
    const formData = new FormData(form);
    const userData = checkSession();
    
    if (!userData?.phone) {
      throw new Error('Session expired. Please login again.');
    }

    // Build payload with session token and idempotency key
    const rawData = {
      trackingNumber: formData.get('trackingNumber')?.trim().toUpperCase() || '',
      nameOnParcel: formData.get('nameOnParcel')?.trim() || '',
      phoneNumber: userData.phone,
      itemDescription: formData.get('itemDescription')?.trim() || '',
      quantity: Number(formData.get('quantity')) || 1,
      price: Number(formData.get('price')) || 0,
      collectionPoint: formData.get('collectionPoint') || '',
      itemCategory: formData.get('itemCategory') || '',
      sessionToken: userData.sessionToken
    };

    // Validate required fields
    const requiredFields = ['trackingNumber', 'nameOnParcel', 'itemDescription', 'quantity', 'price', 'collectionPoint', 'itemCategory'];
    for (const field of requiredFields) {
      const value = rawData[field];
      
      if (field === 'price') {
        if (value === undefined || value === null || isNaN(value)) {
          throw new Error(`Please fill in ${field.replace(/([A-Z])/g, ' $1').toLowerCase()}`);
        }
      } else if (field === 'quantity') {
        if (isNaN(value) || value < 1) {
          throw new Error(`Please fill in ${field.replace(/([A-Z])/g, ' $1').toLowerCase()}`);
        }
      } else if (field === 'itemDescription') {
        if (!value || value.trim().length < 3) {
          throw new Error('Item description must be at least 3 characters');
        }
      } else if (!value) {
        throw new Error(`Please fill in ${field.replace(/([A-Z])/g, ' $1').toLowerCase()}`);
      }
    }

    // Handle file uploads
    const fileInput = document.getElementById('fileUpload');
    const category = rawData.itemCategory;
    const payload = {
      action: 'submitParcelDeclaration',
      data: rawData,
      files: []
    };

    if (VALIDATION_RULES.MANDATORY_INVOICE_CATEGORIES.includes(category)) {
      if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
        throw new Error('Invoice/document upload is required for this category');
      }
      
      // Process files
      const files = Array.from(fileInput.files);
      
      if (files.length > CONFIG.MAX_FILES) {
        throw new Error(`Maximum ${CONFIG.MAX_FILES} files allowed`);
      }

      for (const file of files) {
        if (file.size > CONFIG.MAX_FILE_SIZE) {
          throw new Error(`File "${file.name}" exceeds 5MB limit`);
        }
        
        if (!CONFIG.ALLOWED_FILE_TYPES.includes(file.type)) {
          throw new Error(`File "${file.name}" must be JPG, PNG, or PDF`);
        }
        
        const base64Data = await readFileAsBase64(file);
        payload.files.push({
          name: file.name.replace(/[^a-zA-Z0-9._-]/g, '_'),
          type: file.type,
          base64: base64Data
        });
      }
    } else if (fileInput && fileInput.files && fileInput.files.length > 0) {
      // Process optional files
      const files = Array.from(fileInput.files);
      
      if (files.length > CONFIG.MAX_FILES) {
        throw new Error(`Maximum ${CONFIG.MAX_FILES} files allowed`);
      }

      for (const file of files) {
        if (file.size > CONFIG.MAX_FILE_SIZE) {
          throw new Error(`File "${file.name}" exceeds 5MB limit`);
        }
        
        if (!CONFIG.ALLOWED_FILE_TYPES.includes(file.type)) {
          throw new Error(`File "${file.name}" must be JPG, PNG, or PDF`);
        }
        
        const base64Data = await readFileAsBase64(file);
        payload.files.push({
          name: file.name.replace(/[^a-zA-Z0-9._-]/g, '_'),
          type: file.type,
          base64: base64Data
        });
      }
    }

    // Submit the data
    console.log('Submitting payload:', { 
      trackingNumber: payload.data.trackingNumber,
      filesCount: payload.files.length,
      price: payload.data.price
    });
    
    const result = await submitParcelData(payload);
    
    if (result.success) {
      // Success handling
      showSubmissionSuccess(payload.data.trackingNumber);
      resetForm();
      
      // Schedule verification
      setTimeout(() => {
        verifySubmission(payload.data.trackingNumber);
      }, 3000);
      
    } else if (result.savedLocally) {
      // Failed but saved locally
      showError('⚠️ Submission failed but data was saved locally. Please try again later or contact support.', 'submission-warning');
      showLocalRecoveryNotice(payload);
      
    } else {
      // Complete failure - show actual error from backend
      throw new Error(result.message || 'Submission failed at server');
    }

  } catch (error) {
    console.error('Submission error:', error);
    
    // Show user-friendly error message
    let errorMessage = error.message;
    
    // Categorize errors for better messaging
    if (error.message.includes('Price must be')) {
      errorMessage = '❌ Price must be 0 or greater. 0 is allowed for items with no declared value.';
    } else if (error.message.includes('Item description must be')) {
      errorMessage = '❌ Item description must be at least 3 characters.';
    } else if (error.message.includes('Invoice/document upload')) {
      errorMessage = '❌ Invoice/document upload is required for starred categories.';
    } else if (error.message.includes('Network') || error.message.includes('Failed to fetch')) {
      errorMessage = '⚠️ Network connection issue. Please check your internet and try again.';
    } else if (error.message.includes('timeout')) {
      errorMessage = '⚠️ Submission timeout. The request took too long. Please try again.';
    } else if (error.message.includes('Session expired')) {
      errorMessage = '❌ Session expired. Please login again.';
      setTimeout(() => {
        handleLogout();
      }, 2000);
    } else if (error.message.includes('Submission failed at server')) {
      errorMessage = '❌ Server error: Could not save your submission. Please try again.';
    } else if (error.message.includes('No payload received')) {
      errorMessage = '❌ Submission data was corrupted. Please try again.';
    } else if (error.message.includes('Authentication failed')) {
      errorMessage = '❌ Authentication failed. Please login again.';
      setTimeout(() => {
        handleLogout();
      }, 2000);
    } else {
      errorMessage = `❌ ${error.message}`;
    }
    
    showError(errorMessage);
    
    // Offer to save as draft for network/timeout errors
    if ((error.message.includes('Network') || error.message.includes('timeout') || error.message.includes('Failed to fetch')) && 
        !error.message.includes('Price must be') && 
        !error.message.includes('Item description must be') &&
        !error.message.includes('Invoice/document upload') &&
        !error.message.includes('Authentication failed')) {
      setTimeout(() => {
        if (confirm('Would you like to save this form as a draft?')) {
          saveFormAsDraft();
        }
      }, 1000);
    }
    
  } finally {
    showLoading(false);
  }
}

// ================= ENHANCED SUCCESS HANDLER =================
function showSubmissionSuccess(trackingNumber) {
  // Update message element
  const messageElement = document.getElementById('message') || createMessageElement();
  
  messageElement.innerHTML = `
    <div style="text-align: center; padding: 20px; position: relative;">
      <button 
        id="closeMessageBtn" 
        style="
          position: absolute;
          top: 10px;
          right: 10px;
          background: #333;
          color: white;
          border: none;
          border-radius: 50%;
          width: 30px;
          height: 30px;
          cursor: pointer;
          font-size: 18px;
          line-height: 1;
          padding: 0;
          transition: all 0.3s ease;
        "
        title="Close this message"
      >×</button>
      <div style="font-size: 48px; color: #00C851;">✓</div>
      <h3 style="color: #00C851; margin: 10px 0;">Submission Successful!</h3>
      <p style="margin: 10px 0;">Tracking Number: <strong style="color: #d4af37;">${trackingNumber}</strong></p>
      <p style="font-size: 0.9em; color: #aaa; margin-top: 15px; line-height: 1.5;">
        Click <a href="track-parcel.html" style="color: #00C851; text-decoration: underline; font-weight: bold;">HERE</a> to check your submission,<br>if not available please resubmit again.
      </p>
    </div>
  `;
  
  messageElement.className = 'success';
  messageElement.style.display = 'block';
  
  // Add hover effect to close button
  const closeBtn = document.getElementById('closeMessageBtn');
  closeBtn.addEventListener('mouseenter', function() {
    this.style.background = '#ff4444';
    this.style.transform = 'scale(1.1)';
  });
  closeBtn.addEventListener('mouseleave', function() {
    this.style.background = '#333';
    this.style.transform = 'scale(1)';
  });
  
  // Add click handler for close button
  closeBtn.addEventListener('click', function() {
    messageElement.style.display = 'none';
  });
}

// Show local recovery notice
function showLocalRecoveryNotice(payload) {
  const recoveryDiv = document.createElement('div');
  recoveryDiv.id = 'recoveryNotice';
  recoveryDiv.innerHTML = `
    <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; margin: 20px 0; border-radius: 5px;">
      <h4 style="color: #856404; margin: 0 0 10px 0;">⚠️ Data Saved Locally</h4>
      <p style="color: #856404; margin: 0 0 10px 0;">
        Your submission failed to reach the server but was saved locally.<br>
        Tracking Number: <strong>${payload.data.trackingNumber}</strong>
      </p>
      <button onclick="retryFailedSubmissions()" style="background: #856404; color: white; border: none; padding: 8px 15px; border-radius: 3px; cursor: pointer;">
        Retry Submission
      </button>
    </div>
  `;
  
  const container = document.querySelector('.container') || document.body;
  container.insertBefore(recoveryDiv, container.firstChild);
}

// Retry failed submissions
async function retryFailedSubmissions() {
  showLoading(true, 'Retrying failed submissions...');
  
  try {
    const failedSubmissions = JSON.parse(localStorage.getItem('failedSubmissions') || '[]');
    let successCount = 0;
    
    for (const submission of failedSubmissions) {
      try {
        // Add new idempotency key for retry
        const retryPayload = {
          ...submission,
          data: {
            ...submission.data,
            idempotencyKey: generateIdempotencyKey()
          }
        };
        
        const result = await submitParcelData(retryPayload);
        if (result.success) {
          successCount++;
        }
      } catch (error) {
        console.warn('Failed to retry submission:', error);
      }
    }
    
    // Remove successful submissions
    const remainingSubmissions = failedSubmissions.filter(sub => {
      // Remove submissions older than 1 hour or successful
      const submissionTime = new Date(sub.timestamp).getTime();
      const oneHourAgo = Date.now() - (60 * 60 * 1000);
      return submissionTime > oneHourAgo;
    });
    
    localStorage.setItem('failedSubmissions', JSON.stringify(remainingSubmissions));
    
    showLoading(false);
    
    if (successCount > 0) {
      alert(`Successfully resubmitted ${successCount} item(s)!`);
    } else {
      alert('Could not resubmit any items. Please try again later.');
    }
    
    // Remove recovery notice
    const recoveryNotice = document.getElementById('recoveryNotice');
    if (recoveryNotice) recoveryNotice.remove();
    
  } catch (error) {
    showLoading(false);
    showError('Failed to retry submissions: ' + error.message);
  }
}

// Create message element if not exists
function createMessageElement() {
  const messageDiv = document.createElement('div');
  messageDiv.id = 'message';
  messageDiv.className = 'message';
  messageDiv.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(0, 0, 0, 0.95);
    color: white;
    padding: 30px;
    border-radius: 10px;
    z-index: 10000;
    display: none;
    min-width: 350px;
    text-align: center;
    box-shadow: 0 0 20px rgba(0,0,0,0.5);
    border: 2px solid #00C851;
  `;
  
  document.body.appendChild(messageDiv);
  return messageDiv;
}

// ================= ENHANCED VERIFICATION =================
async function verifySubmission(trackingNumber) {
  try {
    console.log('Verifying submission for:', trackingNumber);
    
    // Use multiple verification methods
    const verificationURLs = [
      `${CONFIG.PROXY_URL}?tracking=${encodeURIComponent(trackingNumber)}`,
      `${CONFIG.GAS_URL}?action=verifyTracking&tracking=${encodeURIComponent(trackingNumber)}`
    ];
    
    let verificationResult = null;
    
    for (const url of verificationURLs) {
      try {
        const response = await fetch(url, {
          method: 'GET',
          cache: 'no-cache',
          headers: { 'Accept': 'application/json' }
        });
        
        if (response.ok) {
          verificationResult = await response.json();
          break;
        }
      } catch (error) {
        console.warn(`Verification URL failed: ${url}`, error.message);
        continue;
      }
    }
    
    if (verificationResult?.exists) {
      console.log('Verification successful:', verificationResult);
      
      // Show verification success
      const messageElement = document.getElementById('message');
      if (messageElement) {
        messageElement.innerHTML += `
          <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #00C851;">
            <p style="color: #00C851; font-size: 0.9em;">
              ✓ Verified in system: ${trackingNumber}
            </p>
          </div>
        `;
      }
      
    } else {
      console.log('Verification pending or failed:', verificationResult);
    }
    
  } catch (error) {
    console.warn('Verification check failed:', error.message);
    // Don't show error to user - verification is secondary
  }
}

// ================= ENHANCED FILE READING =================
async function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = function(e) {
      const base64 = e.target.result.split(',')[1];
      resolve(base64);
    };
    
    reader.onerror = function() {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsDataURL(file);
  });
}

// ================= FORM SETUP =================
function setupFormSubmission() {
  const form = document.getElementById('declarationForm');
  if (!form) return;
  
  // Remove existing event listeners by cloning
  const newForm = form.cloneNode(true);
  form.parentNode.replaceChild(newForm, form);
  
  // Add enhanced submission handler
  newForm.addEventListener('submit', handleParcelSubmission);
  
  // Add input validation
  newForm.addEventListener('input', function(e) {
    validateField(e.target);
    updateSubmitButton();
  });
  
  // Add file validation
  const fileInput = newForm.querySelector('#fileUpload');
  if (fileInput) {
    fileInput.addEventListener('change', function() {
      validateFiles(this);
      updateSubmitButton();
    });
  }
}

function validateField(field) {
  const value = field.value.trim();
  const errorId = field.id + 'Error';
  const errorElement = document.getElementById(errorId);
  
  if (!errorElement) return true;
  
  let isValid = true;
  let message = '';
  
  switch(field.id) {
    case 'trackingNumber':
      isValid = VALIDATION_RULES.PATTERNS.TRACKING_NUMBER.test(value);
      message = isValid ? '' : 'Minimum 5 alphanumeric characters or hyphens';
      break;
      
    case 'nameOnParcel':
      isValid = value.length >= VALIDATION_RULES.LIMITS.NAME_MIN && value.length <= VALIDATION_RULES.LIMITS.NAME_MAX;
      message = isValid ? '' : `${VALIDATION_RULES.LIMITS.NAME_MIN}-${VALIDATION_RULES.LIMITS.NAME_MAX} characters required`;
      break;
      
    case 'itemDescription':
      isValid = value.length >= VALIDATION_RULES.LIMITS.DESCRIPTION_MIN && value.length <= VALIDATION_RULES.LIMITS.DESCRIPTION_MAX;
      message = isValid ? '' : `${VALIDATION_RULES.LIMITS.DESCRIPTION_MIN}-${VALIDATION_RULES.LIMITS.DESCRIPTION_MAX} characters required`;
      break;
      
    case 'quantity':
      const qty = parseInt(value);
      isValid = !isNaN(qty) && qty >= VALIDATION_RULES.LIMITS.QUANTITY_MIN && qty <= VALIDATION_RULES.LIMITS.QUANTITY_MAX;
      message = isValid ? '' : `Must be between ${VALIDATION_RULES.LIMITS.QUANTITY_MIN} and ${VALIDATION_RULES.LIMITS.QUANTITY_MAX}`;
      break;
      
    case 'price':
      const price = parseFloat(value);
      isValid = !isNaN(price) && price >= VALIDATION_RULES.LIMITS.PRICE_MIN && price <= VALIDATION_RULES.LIMITS.PRICE_MAX;
      message = isValid ? '' : `Must be between ${VALIDATION_RULES.LIMITS.PRICE_MIN} and ${VALIDATION_RULES.LIMITS.PRICE_MAX}`;
      break;
      
    case 'collectionPoint':
    case 'itemCategory':
      isValid = value !== '';
      message = isValid ? '' : 'This field is required';
      break;
  }
  
  // Update UI
  if (isValid) {
    field.style.borderColor = '#00C851';
    errorElement.textContent = '';
  } else {
    field.style.borderColor = '#ff4444';
    errorElement.textContent = message;
  }
  
  return isValid;
}

function validateFiles(fileInput) {
  const files = Array.from(fileInput.files);
  const category = document.getElementById('itemCategory')?.value?.trim() || '';
  
  if (VALIDATION_RULES.MANDATORY_INVOICE_CATEGORIES.includes(category)) {
    if (files.length === 0) {
      showError('Invoice/document upload is required for this category', 'fileUploadError');
      return false;
    }
  }
  
  // Validate each file
  for (const file of files) {
    if (file.size > VALIDATION_RULES.LIMITS.FILE_SIZE_MAX) {
      showError(`File "${file.name}" exceeds 5MB limit`, 'fileUploadError');
      fileInput.value = '';
      return false;
    }
    
    if (!VALIDATION_RULES.ALLOWED_FILE_TYPES.includes(file.type)) {
      showError(`File "${file.name}" must be JPG, PNG, or PDF`, 'fileUploadError');
      fileInput.value = '';
      return false;
    }
  }
  
  // Show file count
  if (files.length > 0) {
    showError(`${files.length} file(s) selected`, 'fileUploadError');
  } else {
    showError('', 'fileUploadError');
  }
  
  return true;
}

// ================= DRAFT SYSTEM =================
function saveFormAsDraft() {
  try {
    const form = document.getElementById('declarationForm');
    if (!form) return;
    
    const formData = new FormData(form);
    const draft = {};
    
    // Convert FormData to object
    for (let [key, value] of formData.entries()) {
      if (key !== 'files') {
        draft[key] = value;
      }
    }
    
    // Get files info
    const files = document.getElementById('fileUpload')?.files || [];
    if (files.length > 0) {
      draft.filesCount = files.length;
      draft.filesInfo = Array.from(files).map(file => ({
        name: file.name,
        size: file.size,
        type: file.type
      }));
    }
    
    // Add timestamp and ID
    draft.timestamp = new Date().toISOString();
    draft.id = 'draft_' + Date.now();
    
    // Save to localStorage
    const drafts = JSON.parse(localStorage.getItem('parcelDrafts') || '[]');
    drafts.push(draft);
    localStorage.setItem('parcelDrafts', JSON.stringify(drafts));
    
    // Show success message
    showError('Draft saved successfully!', 'draft-message');
    
  } catch (error) {
    console.error('Failed to save draft:', error);
    showError('Failed to save draft');
  }
}

function loadDrafts() {
  try {
    const drafts = JSON.parse(localStorage.getItem('parcelDrafts') || '[]');
    const draftCount = document.getElementById('draftCount');
    const draftsList = document.getElementById('draftsList');
    
    if (draftCount) draftCount.textContent = drafts.length;
    
    if (draftsList && drafts.length > 0) {
      let html = '<div class="drafts-container">';
      drafts.forEach((draft, index) => {
        html += `
          <div class="draft-item">
            <div class="draft-info">
              <strong>${draft.trackingNumber || 'Untitled'}</strong>
              <small>${new Date(draft.timestamp).toLocaleDateString()}</small>
            </div>
            <div class="draft-actions">
              <button onclick="loadDraft(${index})" class="small-btn">Load</button>
              <button onclick="deleteDraft(${index})" class="small-btn delete">Delete</button>
            </div>
          </div>
        `;
      });
      html += '</div>';
      draftsList.innerHTML = html;
    }
  } catch (error) {
    console.error('Failed to load drafts:', error);
  }
}

function loadDraft(index) {
  try {
    const drafts = JSON.parse(localStorage.getItem('parcelDrafts') || '[]');
    const draft = drafts[index];
    
    if (!draft) return;
    
    // Clear all validation errors first
    clearAllValidationErrors();
    
    // Populate form fields
    Object.keys(draft).forEach(key => {
      if (key !== 'timestamp' && key !== 'id' && key !== 'filesCount' && key !== 'filesInfo') {
        const field = document.getElementById(key);
        if (field) {
          field.value = draft[key];
          
          // Trigger validation for each field after setting value
          if (typeof validateFieldInRealTime === 'function') {
            validateFieldInRealTime(field);
          }
        }
      }
    });
    
    // Update UI
    if (typeof checkCategoryRequirements === 'function') {
      checkCategoryRequirements();
    }
    
    if (typeof updateSubmitButton === 'function') {
      updateSubmitButton();
    }
    
    showError('Draft loaded!', 'draft-message');
    
  } catch (error) {
    console.error('Failed to load draft:', error);
    showError('Failed to load draft');
  }
}

function deleteDraft(index) {
  try {
    const drafts = JSON.parse(localStorage.getItem('parcelDrafts') || '[]');
    drafts.splice(index, 1);
    localStorage.setItem('parcelDrafts', JSON.stringify(drafts));
    loadDrafts();
    showError('Draft deleted', 'draft-message');
  } catch (error) {
    console.error('Failed to delete draft:', error);
    showError('Failed to delete draft');
  }
}

// Clear all validation errors
function clearAllValidationErrors() {
  const errorElements = document.querySelectorAll('.validation-message');
  errorElements.forEach(element => {
    element.textContent = '';
    element.style.display = 'none';
    element.style.color = '';
  });
  
  // Clear field borders
  const fields = document.querySelectorAll('input, select, textarea');
  fields.forEach(field => {
    field.style.borderColor = '';
    field.parentElement.classList.remove('invalid', 'valid');
  });
  
  // Clear file upload error
  const fileError = document.getElementById('invoiceFilesError');
  if (fileError) {
    fileError.textContent = 'Optional: Upload invoice/documents if available';
    fileError.style.color = '#888';
    fileError.style.display = 'block';
  }
}

// ================= AUTHENTICATION HANDLERS =================
async function handleRegistration() {
  if (!validateRegistrationForm()) return;

  const formData = {
    phone: document.getElementById('regPhone').value.trim(),
    password: document.getElementById('regPassword').value,
    email: document.getElementById('regEmail').value.trim()
  };

  try {
    const result = await callAPI('createAccount', formData);
    
    if (result.success) {
      alert('Registration successful! Please login.');
      safeRedirect('login.html');
    } else {
      showError(result.message || 'Registration failed');
    }
  } catch (error) {
    showError('Registration failed - please try again');
  }
}

// ================= PASSWORD MANAGEMENT =================
async function handlePasswordRecovery() {
  const phone = document.getElementById('recoveryPhone').value.trim();
  const email = document.getElementById('recoveryEmail').value.trim();

  if (!validatePhone(phone) || !validateEmail(email)) {
    showError('Please check your inputs');
    return;
  }

  try {
    const result = await callAPI('initiatePasswordReset', { phone, email });
    
    if (result.success) {
      alert('Temporary password sent to your email!');
      safeRedirect('login.html');
    } else {
      showError(result.message || 'Password recovery failed');
    }
  } catch (error) {
    showError('Password recovery failed - please try again');
  }
}

async function handlePasswordReset() {
  const newPass = document.getElementById('newPassword').value;
  const confirmPass = document.getElementById('confirmNewPassword').value;
  const userData = JSON.parse(sessionStorage.getItem('userData'));

  if (!validatePassword(newPass)) {
    showError('Password must contain 6+ characters with at least 1 uppercase letter and 1 number');
    return;
  }

  if (newPass !== confirmPass) {
    showError('Passwords do not match');
    return;
  }

  try {
    const result = await callAPI('forcePasswordReset', {
      phone: userData.phone,
      newPassword: newPass
    });

    if (result.success) {
      alert('Password updated successfully! Please login with your new password.');
      handleLogout();
    } else {
      showError(result.message || 'Password reset failed');
    }
  } catch (error) {
    showError('Password reset failed - please try again');
  }
}

// ================= FORM VALIDATION =================
function validatePassword(password) {
  const regex = /^(?=.*[A-Z])(?=.*\d).{6,}$/;
  return regex.test(password);
}

function validateRegistrationForm() {
  const phone = document.getElementById('regPhone').value;
  const password = document.getElementById('regPassword').value;
  const confirmPassword = document.getElementById('regConfirmPass').value;
  const email = document.getElementById('regEmail').value;
  const confirmEmail = document.getElementById('regConfirmEmail').value;

  let isValid = true;
  document.querySelectorAll('.error-message').forEach(el => el.textContent = '');

  if (!validatePhone(phone)) {
    document.getElementById('phoneError').textContent = 'Invalid phone format';
    isValid = false;
  }

  if (!validatePassword(password)) {
    document.getElementById('passError').textContent = '6+ chars, 1 uppercase, 1 number';
    isValid = false;
  }

  if (password !== confirmPassword) {
    document.getElementById('confirmPassError').textContent = 'Passwords mismatch';
    isValid = false;
  }

  if (!validateEmail(email)) {
    document.getElementById('emailError').textContent = 'Invalid email format';
    isValid = false;
  }

  if (email !== confirmEmail) {
    document.getElementById('confirmEmailError').textContent = 'Emails mismatch';
    isValid = false;
  }

  return isValid;
}

// ================= UTILITIES =================
function safeRedirect(path) {
  try {
    // Extract base path without query parameters
    const basePath = path.split('?')[0].split('#')[0];
    
    const allowedPaths = [
      'login.html', 'register.html', 'dashboard.html',
      'forgot-password.html', 'password-reset.html',
      'my-info.html', 'parcel-declaration.html', 'track-parcel.html',
      'billing-info.html', 'invoice.html'
    ];
    
    if (!allowedPaths.includes(basePath)) {
      throw new Error('Unauthorized path');
    }
    
    window.location.href = path;
  } catch (error) {
    console.error('Redirect error:', error);
    showError('Navigation failed. Please try again.');
  }
}

function formatTrackingNumber(trackingNumber) {
  return trackingNumber.replace(/[^A-Z0-9-]/g, '').toUpperCase();
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('ms-MY', {
    style: 'currency',
    currency: 'MYR',
    minimumFractionDigits: 2
  }).format(amount || 0);
}

function formatDate(dateString) {
  const options = { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Singapore'
  };
  return new Date(dateString).toLocaleDateString('en-MY', options);
}

// ================= FORM INITIALIZATION =================
function initValidationListeners() {
  const parcelForm = document.getElementById('parcel-declaration-form');
  if (parcelForm) {
    const inputs = parcelForm.querySelectorAll('input, select');
    
    inputs.forEach(input => {
      input.addEventListener('input', () => {
        switch(input.id) {
          case 'trackingNumber':
            validateFieldInRealTime(input);
            break;
          case 'nameOnParcel':
            validateFieldInRealTime(input);
            break;
          case 'itemDescription':
            validateFieldInRealTime(input);
            break;
          case 'quantity':
            validateFieldInRealTime(input);
            break;
          case 'price':
            validateFieldInRealTime(input);
            break;
          case 'collectionPoint':
            validateFieldInRealTime(input);
            break;
          case 'itemCategory':
            validateFieldInRealTime(input);
            break;
        }
        updateSubmitButton();
      });
    });

    const fileInput = document.getElementById('fileUpload');
    if(fileInput) {
      fileInput.addEventListener('change', () => {
        validateFilesInRealTime();
        updateSubmitButton();
      });
    }
  }
}

// ================= CATEGORY REQUIREMENTS =================
function setupCategoryChangeListener() {
  const categorySelect = document.getElementById('itemCategory');
  if (categorySelect) {
    categorySelect.addEventListener('change', checkCategoryRequirements);
  }
}

// ================= BILLING SYSTEM HELPERS =================
async function loadBillingDataWithRetry(phone, maxRetries = 3) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Loading billing data (attempt ${attempt}/${maxRetries})`);
      
      // Add exponential backoff
      if (attempt > 1) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      const result = await loadBillingDataFromServer(phone);
      
      if (result && result.success) {
        return result;
      }
      
      lastError = new Error(result?.message || 'Billing data load failed');
      
    } catch (error) {
      console.error(`Billing load attempt ${attempt} failed:`, error);
      lastError = error;
      
      // If it's a network error, try again
      if (attempt < maxRetries) {
        continue;
      }
    }
  }
  
  throw lastError || new Error('Failed to load billing data after all retries');
}

async function checkPaymentStatusWithRetry(phone, maxRetries = 2) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Checking payment status (attempt ${attempt}/${maxRetries})`);
      
      if (attempt > 1) {
        const delay = Math.min(500 * Math.pow(2, attempt - 1), 5000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      const result = await checkPaymentStatusForUser(phone);
      
      if (result && (result.success || result.paidOrders)) {
        return result;
      }
      
      lastError = new Error('Payment status check failed');
      
    } catch (error) {
      console.error(`Payment status attempt ${attempt} failed:`, error);
      lastError = error;
      
      if (attempt < maxRetries) {
        continue;
      }
    }
  }
  
  // Return empty if all retries fail
  return { success: false, paidOrders: [] };
}

// ================= IMPROVED LOADING FUNCTION =================
async function loadBillingData() {
  try {
    showLoading(true, "Please wait, loading billing information...");
    const userData = checkSession();
    if (!userData?.phone) {
      handleLogout();
      return;
    }

    console.log('Starting to load billing data...');
    
    // Load billing data with retry
    const billingResponse = await loadBillingDataWithRetry(userData.phone);
    
    if (!billingResponse.success) {
      showError(billingResponse.message || 'Failed to load billing information', 'connectionError');
      return;
    }

    // Load payment status with retry (non-critical)
    const paymentStatus = await checkPaymentStatusWithRetry(userData.phone);
    
    const allBillingData = billingResponse.data || [];
    const paidOrders = paymentStatus.paidOrders || [];
    
    console.log(`Loaded ${allBillingData.length} billing records and ${paidOrders.length} paid orders`);
    
    // Store in session for offline access
    try {
      sessionStorage.setItem('billingCache', JSON.stringify({
        data: allBillingData,
        paidOrders: paidOrders,
        timestamp: Date.now()
      }));
    } catch (e) {
      console.warn('Could not cache billing data:', e);
    }
    
    // renderBillingSections(allBillingData); // Uncomment if you have this function

  } catch (error) {
    console.error('Billing load error:', error);
    
    // Try to use cached data
    try {
      const cached = sessionStorage.getItem('billingCache');
      if (cached) {
        const cacheData = JSON.parse(cached);
        const cacheAge = Date.now() - cacheData.timestamp;
        
        // Use cache if less than 10 minutes old
        if (cacheAge < 10 * 60 * 1000) {
          console.log('Using cached billing data');
          const allBillingData = cacheData.data || [];
          const paidOrders = cacheData.paidOrders || [];
          // renderBillingSections(allBillingData); // Uncomment if you have this function
          showError('Using cached data. Some information may be outdated.', 'connectionError');
          return;
        }
      }
    } catch (cacheError) {
      console.warn('Cache error:', cacheError);
    }
    
    showError('Connection failed. Please try again.', 'connectionError');
  } finally {
    showLoading(false);
  }
}

// ================= CONNECTION HEALTH CHECK =================
async function checkBackendHealth() {
  try {
    const healthCheck = await new Promise((resolve, reject) => {
      const callbackName = `health_${Date.now()}`;
      const script = document.createElement('script');
      script.crossOrigin = 'anonymous';
      script.src = `${CONFIG.GAS_URL}?callback=${callbackName}&action=processLogin&phone=test&password=test`;
      
      const timeoutId = setTimeout(() => {
        cleanup();
        reject(new Error('Backend timeout'));
      }, 5000);
      
      function cleanup() {
        clearTimeout(timeoutId);
        delete window[callbackName];
        if (script.parentNode) {
          document.body.removeChild(script);
        }
      }
      
      window[callbackName] = (response) => {
        cleanup();
        // Even if login fails, backend is responding
        resolve(true);
      };
      
      script.onerror = () => {
        cleanup();
        reject(new Error('Backend unavailable'));
      };
      
      document.body.appendChild(script);
    });
    
    return true;
  } catch (error) {
    console.error('Backend health check failed:', error);
    return false;
  }
}

// ================= SAFARI FILE API POLYFILL =================
function safariFileReaderPolyfill() {
  if (typeof FileReader === 'undefined') {
    console.warn('FileReader not supported - using fallback');
    return false;
  }
  
  // Ensure FileReader events work in Safari
  const originalAddEventListener = FileReader.prototype.addEventListener;
  FileReader.prototype.addEventListener = function(type, listener, options) {
    // Safari sometimes loses event listeners
    if (type === 'load' || type === 'error') {
      this['on' + type] = listener;
    }
    return originalAddEventListener.call(this, type, listener, options);
  };
  
  return true;
}

// ================= SAFARI FETCH ENHANCEMENT =================
function safariFetchEnhancement() {
  const originalFetch = window.fetch;
  
  window.fetch = function(resource, init) {
    // Safari-specific fetch enhancements
    const enhancedInit = init || {};
    
    // Add Safari-specific headers
    enhancedInit.headers = {
      ...enhancedInit.headers,
      'Accept': 'application/json, text/javascript, */*',
      'X-Requested-With': 'XMLHttpRequest'
    };
    
    // Disable cache for Safari
    enhancedInit.cache = 'no-store';
    
    // Add timeout for Safari
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    
    enhancedInit.signal = controller.signal;
    
    return originalFetch(resource, enhancedInit).then(response => {
      clearTimeout(timeoutId);
      return response;
    }).catch(error => {
      clearTimeout(timeoutId);
      throw error;
    });
  };
}

// ================= LOGIN PAGE INITIALIZATION =================
function initLoginPage() {
  // Check if we're on the login page
  if (!window.location.pathname.includes('login.html')) {
    return;
  }
  
  // Clear any existing session data when loading login page
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('logout')) {
    sessionStorage.clear();
    localStorage.removeItem('lastActivity');
  }
  
  // Focus on phone input
  const phoneInput = document.getElementById('phone');
  if (phoneInput) {
    phoneInput.focus();
  }
}

// ================= MAIN INITIALIZATION =================
document.addEventListener('DOMContentLoaded', () => {
  detectViewMode();
  
  // Get current page
  const currentPage = window.location.pathname.split('/').pop() || 'login.html';
  
  // Define public pages
  const publicPages = ['login.html', 'register.html', 'forgot-password.html'];
  const isPublicPage = publicPages.includes(currentPage);
  
  // Only run session checks on protected pages
  if (!isPublicPage) {
    const userData = checkSession();
    if (!userData) {
      handleLogout();
      return;
    }
    
    // Set phone field only on parcel declaration page
    if (currentPage === 'parcel-declaration.html') {
      const phoneField = document.getElementById('phone');
      if (phoneField) {
        phoneField.value = userData.phone || '';
        phoneField.readOnly = true;
      }
      
      // Setup enhanced form submission
      setupFormSubmission();
      setupCategoryChangeListener();
      initValidationListeners();
      checkCategoryRequirements();
      
      // Initialize real-time validation
      initRealTimeValidation();
      
      // Load saved drafts
      loadDrafts();
    }
  }
  
  // Initialize common components
  createLoaderElement();
  
  // Initialize login page if needed
  if (currentPage === 'login.html') {
    initLoginPage();
  }
  
  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    const errorElement = document.getElementById('error-message');
    if (errorElement) errorElement.style.display = 'none';
  });
  
  // Focus management
  const firstInput = document.querySelector('input:not([type="hidden"])');
  if (firstInput) firstInput.focus();
});

// ================= HELPER FUNCTIONS FOR MISSING IMPLEMENTATIONS =================
// These are placeholder functions for methods that might be called elsewhere

function loadBillingDataFromServer(phone) {
  // This should be implemented to load billing data from server
  console.log('Loading billing data for:', phone);
  return Promise.resolve({ success: false, message: 'Not implemented' });
}

function checkPaymentStatusForUser(phone) {
  // This should be implemented to check payment status
  console.log('Checking payment status for:', phone);
  return Promise.resolve({ success: false, paidOrders: [] });
}

function renderBillingSections(data) {
  // This should be implemented to render billing data
  console.log('Rendering billing sections:', data);
}

// ================= EXPORT FUNCTIONS FOR HTML USE =================
// Make these functions available globally for HTML onclick handlers
window.handleLogout = handleLogout;
window.safeRedirect = safeRedirect;
window.handleRegistration = handleRegistration;
window.handlePasswordRecovery = handlePasswordRecovery;
window.handlePasswordReset = handlePasswordReset;
window.loadDrafts = loadDrafts;
window.loadDraft = loadDraft;
window.deleteDraft = deleteDraft;
window.retryFailedSubmissions = retryFailedSubmissions;
window.showRegistration = () => safeRedirect('register.html');
window.showForgotPassword = () => safeRedirect('forgot-password.html');
window.clearAllValidationErrors = clearAllValidationErrors;

// Safari-specific functions
window.isSafariBrowser = () => {
  const ua = navigator.userAgent;
  const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
  return isSafari || isIOS;
};

// ================= DEBUG FUNCTIONS =================
function debugValidation() {
  const priceField = document.getElementById('price');
  const itemDescriptionField = document.getElementById('itemDescription');
  
  console.log('Price field value:', priceField?.value);
  console.log('Price field type:', typeof priceField?.value);
  console.log('Price parsed:', parseFloat(priceField?.value || 0));
  console.log('Is price 0 valid?', parseFloat(priceField?.value || 0) >= 0);
  
  console.log('Item description value:', itemDescriptionField?.value);
  console.log('Item description length:', itemDescriptionField?.value?.length || 0);
  console.log('Is description >= 3?', (itemDescriptionField?.value?.length || 0) >= 3);
  
  // Call updateSubmitButton and see what it returns
  const submitBtn = document.getElementById('submitBtn');
  console.log('Submit button disabled?', submitBtn?.disabled);
}

// ================= NETWORK DETECTION =================
function updateNetworkStatus() {
  const statusEl = document.getElementById('networkStatus');
  if (!statusEl) return;
  
  if (navigator.onLine) {
    statusEl.style.display = 'none';
  } else {
    statusEl.style.display = 'block';
    statusEl.querySelector('.status-icon').textContent = '🔴';
    statusEl.querySelector('.status-text').textContent = 'Offline - Form will be saved locally';
  }
}

// Initialize network status
window.addEventListener('online', updateNetworkStatus);
window.addEventListener('offline', updateNetworkStatus);

// ================= SESSION TOKEN MANAGEMENT =================
function validateSessionToken(token) {
  // This would typically validate with the backend
  // For now, we'll just check if it exists
  return token && token.length > 10;
}

function refreshSessionToken() {
  const userData = checkSession();
  if (!userData) return null;
  
  // In a real implementation, this would call the backend to refresh the token
  // For now, we'll just extend the session in localStorage
  sessionStorage.setItem('lastActivity', Date.now());
  localStorage.setItem('lastActivity', Date.now());
  
  return userData.sessionToken;
}

// ================= FORM DATA VALIDATION =================
function validateFormData(formData) {
  const errors = [];
  
  // Check all required fields
  if (!formData.trackingNumber || !VALIDATION_RULES.PATTERNS.TRACKING_NUMBER.test(formData.trackingNumber)) {
    errors.push('Invalid tracking number');
  }
  
  if (!formData.nameOnParcel || formData.nameOnParcel.trim().length < VALIDATION_RULES.LIMITS.NAME_MIN) {
    errors.push(`Name must be at least ${VALIDATION_RULES.LIMITS.NAME_MIN} characters`);
  }
  
  if (!formData.itemDescription || formData.itemDescription.trim().length < VALIDATION_RULES.LIMITS.DESCRIPTION_MIN) {
    errors.push(`Description must be at least ${VALIDATION_RULES.LIMITS.DESCRIPTION_MIN} characters`);
  }
  
  const quantity = Number(formData.quantity);
  if (isNaN(quantity) || quantity < VALIDATION_RULES.LIMITS.QUANTITY_MIN || quantity > VALIDATION_RULES.LIMITS.QUANTITY_MAX) {
    errors.push(`Quantity must be between ${VALIDATION_RULES.LIMITS.QUANTITY_MIN} and ${VALIDATION_RULES.LIMITS.QUANTITY_MAX}`);
  }
  
  const price = Number(formData.price);
  if (isNaN(price) || price < VALIDATION_RULES.LIMITS.PRICE_MIN || price > VALIDATION_RULES.LIMITS.PRICE_MAX) {
    errors.push(`Price must be between ${VALIDATION_RULES.LIMITS.PRICE_MIN} and ${VALIDATION_RULES.LIMITS.PRICE_MAX}`);
  }
  
  if (!formData.collectionPoint) {
    errors.push('Collection point is required');
  }
  
  if (!formData.itemCategory) {
    errors.push('Item category is required');
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors
  };
}

// ================= FILE VALIDATION =================
function validateFileUpload(file) {
  const errors = [];
  
  if (!VALIDATION_RULES.ALLOWED_FILE_TYPES.includes(file.type)) {
    errors.push('File must be JPG, PNG, or PDF');
  }
  
  if (file.size > VALIDATION_RULES.LIMITS.FILE_SIZE_MAX) {
    errors.push('File size must be less than 5MB');
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors
  };
}

// ================= FORM STATE MANAGEMENT =================
function saveFormState() {
  const form = document.getElementById('declarationForm');
  if (!form) return;
  
  const formData = new FormData(form);
  const state = {};
  
  for (let [key, value] of formData.entries()) {
    state[key] = value;
  }
  
  // Save files info
  const files = document.getElementById('fileUpload')?.files || [];
  if (files.length > 0) {
    state.filesInfo = Array.from(files).map(file => ({
      name: file.name,
      size: file.size,
      type: file.type
    }));
  }
  
  localStorage.setItem('formState', JSON.stringify(state));
  console.log('Form state saved');
}

function restoreFormState() {
  const state = localStorage.getItem('formState');
  if (!state) return;
  
  try {
    const formState = JSON.parse(state);
    const form = document.getElementById('declarationForm');
    
    if (!form) return;
    
    // Restore form fields
    Object.keys(formState).forEach(key => {
      if (key !== 'filesInfo') {
        const field = document.getElementById(key);
        if (field) {
          field.value = formState[key];
          
          // Trigger validation
          if (typeof validateFieldInRealTime === 'function') {
            validateFieldInRealTime(field);
          }
        }
      }
    });
    
    // Note: Cannot restore file inputs due to security restrictions
    console.log('Form state restored');
    
    // Clear saved state
    localStorage.removeItem('formState');
    
  } catch (error) {
    console.error('Failed to restore form state:', error);
  }
}

// Auto-save form state on input
function setupFormAutoSave() {
  const form = document.getElementById('declarationForm');
  if (!form) return;
  
  let saveTimeout;
  
  form.addEventListener('input', () => {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      saveFormState();
    }, 1000);
  });
  
  // Restore on page load
  restoreFormState();
}

// ================= SESSION MONITORING =================
function startSessionMonitor() {
  // Check session every minute
  setInterval(() => {
    const userData = checkSession();
    if (!userData && !window.location.pathname.includes('login.html')) {
      console.log('Session expired, redirecting to login');
      handleLogout();
    }
  }, 60000); // Check every minute
  
  // Refresh session token every 15 minutes
  setInterval(() => {
    refreshSessionToken();
  }, 900000); // Refresh every 15 minutes
}

// Start session monitoring
document.addEventListener('DOMContentLoaded', () => {
  startSessionMonitor();
});
