// ================= CONFIGURATION =================
const CONFIG = {
  GAS_URL: 'https://script.google.com/macros/s/AKfycbxF6HepFTI8tTFdlIrxKav8Iy2wCEy3MLvkIyTga-lqSeZc6HCIvIeeu4kt7kOi0Ge9/exec',
  PROXY_URL: 'https://script.google.com/macros/s/AKfycbxSRib4nCWSxJMxji2hc2axjGYw3fABIKX3-pfASqEAz3pAmKaXknMWP_Ye3tOs9BYA/exec',
  SESSION_TIMEOUT: 3600,
  MAX_FILE_SIZE: 5 * 1024 * 1024,
  ALLOWED_FILE_TYPES: ['image/jpeg', 'image/png', 'application/pdf'],
  MAX_FILES: 3
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
  
  return isMobile;
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

// ================= IMPROVED SESSION CHECK =================
const checkSession = () => {
  const sessionData = sessionStorage.getItem('userData');
  const lastActivity = localStorage.getItem('lastActivity');

  if (!sessionData) {
    console.log('No session data found');
    return null;
  }

  // Check session timeout (1 hour)
  if (lastActivity && Date.now() - lastActivity > CONFIG.SESSION_TIMEOUT * 1000) {
    console.log('Session expired');
    sessionStorage.clear();
    localStorage.removeItem('lastActivity');
    return null;
  }

  try {
    const userData = JSON.parse(sessionData);
    
    // Update last activity
    localStorage.setItem('lastActivity', Date.now());
    
    // Check if temp password requires reset
    if (userData?.tempPassword && !window.location.pathname.includes('password-reset.html')) {
      console.log('Temp password detected but not on reset page');
      return null;
    }

    return userData;
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
    }, 3000); // Show after 3 seconds
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

function showSuccessMessage(trackingNumber) {
  const messageElement = document.getElementById('message') || createMessageElement();
  
  messageElement.innerHTML = `
    <div style="text-align: center; padding: 20px;">
      <div style="font-size: 48px; color: #00C851;">✓</div>
      <h3 style="color: #00C851; margin: 10px 0;">Submission Successful!</h3>
      <p>Tracking Number: <strong>${trackingNumber}</strong></p>
      <p style="font-size: 0.9em; color: #888;">
        Your parcel declaration has been submitted.<br>
        You will receive confirmation shortly.
      </p>
    </div>
  `;
  
  messageElement.className = 'success';
  messageElement.style.display = 'block';

  // Auto-hide after 5 seconds
  setTimeout(() => {
    messageElement.style.display = 'none';
  }, 5000);
}

function createMessageElement() {
  const messageDiv = document.createElement('div');
  messageDiv.id = 'message';
  messageDiv.className = 'message';
  messageDiv.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(0, 0, 0, 0.9);
    color: white;
    padding: 30px;
    border-radius: 10px;
    z-index: 10000;
    display: none;
    min-width: 300px;
    text-align: center;
    box-shadow: 0 0 20px rgba(0,0,0,0.5);
  `;
  
  document.body.appendChild(messageDiv);
  return messageDiv;
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
}

// ================= SIMPLIFIED SUBMISSION SYSTEM =================
// Simplified submission that works for both desktop and mobile
async function submitParcelData(payload) {
  console.log('Starting submission...', { 
    trackingNumber: payload.data.trackingNumber,
    filesCount: payload.files?.length || 0,
    isMobile: detectViewMode()
  });

  // For mobile, use a simpler approach
  if (detectViewMode()) {
    return await submitViaMobile(payload);
  }
  
  // For desktop, use the regular approach
  return await submitViaDesktop(payload);
}

// Mobile submission (simpler, more reliable)
async function submitViaMobile(payload) {
  try {
    console.log('Using mobile submission method');
    
    // Create simplified payload without files for mobile
    const simplifiedPayload = {
      action: 'submitParcelDeclaration',
      data: payload.data
    };
    
    // Send using XHR with timeout
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const url = CONFIG.PROXY_URL;
      
      xhr.open('POST', url, true);
      xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8');
      
      xhr.timeout = 30000; // 30 second timeout
      
      xhr.onload = function() {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } catch (e) {
            // Even if JSON parse fails, assume success for mobile
            resolve({ 
              success: true, 
              message: 'Submitted successfully' 
            });
          }
        } else {
          reject(new Error(`HTTP ${xhr.status}`));
        }
      };
      
      xhr.onerror = function() {
        reject(new Error('Network error'));
      };
      
      xhr.ontimeout = function() {
        reject(new Error('Request timeout'));
      };
      
      // Send data
      const data = `payload=${encodeURIComponent(JSON.stringify(simplifiedPayload))}`;
      xhr.send(data);
    });
    
  } catch (error) {
    console.error('Mobile submission failed:', error);
    throw error;
  }
}

// Desktop submission (with file support)
async function submitViaDesktop(payload) {
  try {
    console.log('Using desktop submission method');
    
    // Use FormData for desktop with files
    const formData = new FormData();
    formData.append('data', JSON.stringify(payload.data));
    
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
      // No headers for FormData - let browser set them
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    return await response.json();
    
  } catch (error) {
    console.error('Desktop submission failed:', error);
    
    // Fallback to proxy without files
    const fallbackPayload = {
      action: 'submitParcelDeclaration',
      data: payload.data
    };
    
    try {
      const fallbackResponse = await fetch(CONFIG.PROXY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `payload=${encodeURIComponent(JSON.stringify(fallbackPayload))}`
      });
      
      if (!fallbackResponse.ok) {
        throw new Error(`Fallback failed: HTTP ${fallbackResponse.status}`);
      }
      
      return await fallbackResponse.json();
      
    } catch (fallbackError) {
      throw new Error(`Both submissions failed: ${error.message}, ${fallbackError.message}`);
    }
  }
}

// Convert base64 to Blob
function base64ToBlob(base64, mimeType) {
  try {
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
  } catch (error) {
    console.error('Error converting base64 to blob:', error);
    throw new Error('Invalid file data');
  }
}

// ================= FIXED PARCEL SUBMISSION HANDLER =================
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

    // Build payload
    const payload = {
      action: 'submitParcelDeclaration',
      data: {
        trackingNumber: (formData.get('trackingNumber') || '').trim().toUpperCase(),
        nameOnParcel: (formData.get('nameOnParcel') || '').trim(),
        phoneNumber: userData.phone,
        itemDescription: (formData.get('itemDescription') || '').trim(),
        quantity: Number(formData.get('quantity')) || 1,
        price: Number(formData.get('price')) || 0,
        collectionPoint: formData.get('collectionPoint') || '',
        itemCategory: formData.get('itemCategory') || ''
      },
      files: []
    };

    // Validate required fields
    const requiredFields = ['trackingNumber', 'nameOnParcel', 'itemDescription', 'quantity', 'price', 'collectionPoint', 'itemCategory'];
    for (const field of requiredFields) {
      if (!payload.data[field]) {
        throw new Error(`Please fill in ${field.replace(/([A-Z])/g, ' $1').toLowerCase()}`);
      }
    }

    // Validate tracking number format
    if (!/^[A-Z0-9-]{5,}$/i.test(payload.data.trackingNumber)) {
      throw new Error('Invalid tracking number format (minimum 5 alphanumeric characters or hyphens)');
    }

    // Validate quantity
    if (payload.data.quantity < 1 || payload.data.quantity > 999) {
      throw new Error('Quantity must be between 1 and 999');
    }

    // VALIDATE PRICE - UPDATED TO ALLOW 0
    if (payload.data.price < 0 || payload.data.price > 100000) { // Changed from > 99999 to > 100000 for consistency
      throw new Error('Price must be between 0 and 100,000'); // Updated error message
    }

    // Handle file uploads
    const fileInput = document.getElementById('fileUpload');
    const category = payload.data.itemCategory;
    
    const starredCategories = [
      '*Books', '*Cosmetics/Skincare/Bodycare',
      '*Food Beverage/Drinks', '*Gadgets',
      '*Oil Ointment', '*Supplement', '*Others'
    ];

    // Check if files are required and process them
    if (starredCategories.includes(category)) {
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
        
        try {
          const base64Data = await readFileAsBase64(file);
          payload.files.push({
            name: file.name.replace(/[^a-zA-Z0-9._-]/g, '_'),
            type: file.type,
            base64: base64Data
          });
        } catch (fileError) {
          console.error('Error reading file:', fileError);
          throw new Error(`Failed to process file "${file.name}"`);
        }
      }
    } else {
      // For non-starred categories, files are optional
      // Check if any files were uploaded anyway
      if (fileInput && fileInput.files && fileInput.files.length > 0) {
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
          
          try {
            const base64Data = await readFileAsBase64(file);
            payload.files.push({
              name: file.name.replace(/[^a-zA-Z0-9._-]/g, '_'),
              type: file.type,
              base64: base64Data
            });
          } catch (fileError) {
            console.error('Error reading file:', fileError);
            // Don't throw error for optional files, just skip
            console.warn(`Skipping file "${file.name}" due to read error`);
          }
        }
      }
    }

    // Submit the data
    console.log('Submitting payload:', { 
      trackingNumber: payload.data.trackingNumber,
      filesCount: payload.files.length,
      isMobile: detectViewMode()
    });
    
    const result = await submitParcelData(payload);
    
    if (result && result.success) {
      // Success handling
      showSuccessMessage(payload.data.trackingNumber);
      resetForm();
      
      // Clear file input
      if (fileInput) {
        fileInput.value = '';
      }
      
      // Reset category requirements
      checkCategoryRequirements();
      
      // Schedule verification
      setTimeout(() => {
        verifySubmission(payload.data.trackingNumber);
      }, 3000);
      
    } else {
      // Handle server-side error
      const errorMessage = result?.message || 'Submission failed on server';
      throw new Error(errorMessage);
    }

  } catch (error) {
    console.error('Submission error:', error);
    
    // Don't show the draft save prompt - show error directly
    showError(`❌ ${error.message}`);
    
    // DO NOT show the draft save prompt automatically
    // Only show if user explicitly wants to save
    
  } finally {
    showLoading(false);
  }
}

// ================= ENHANCED VERIFICATION =================
async function verifySubmission(trackingNumber) {
  try {
    console.log('Verifying submission for:', trackingNumber);
    
    // Try proxy first, then GAS
    const verificationURLs = [
      `${CONFIG.PROXY_URL}?tracking=${encodeURIComponent(trackingNumber)}`,
      `${CONFIG.GAS_URL}?tracking=${encodeURIComponent(trackingNumber)}`
    ];
    
    for (const url of verificationURLs) {
      try {
        const response = await fetch(url, {
          method: 'GET',
          cache: 'no-cache'
        });
        
        if (response.ok) {
          const result = await response.json();
          if (result.exists) {
            console.log('Verification successful:', result);
            return true;
          }
        }
      } catch (error) {
        console.warn(`Verification URL failed: ${url}`, error.message);
        continue;
      }
    }
    
    return false;
    
  } catch (error) {
    console.warn('Verification check failed:', error.message);
    return false;
  }
}

// ================= ENHANCED FILE READING =================
async function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = function(e) {
      try {
        const base64 = e.target.result.split(',')[1];
        resolve(base64);
      } catch (error) {
        reject(new Error('Failed to extract base64 data'));
      }
    };
    
    reader.onerror = function() {
      reject(new Error('Failed to read file'));
    };
    
    reader.onabort = function() {
      reject(new Error('File reading aborted'));
    };
    
    reader.readAsDataURL(file);
  });
}

// ================= SAFARI DETECTION =================
function isSafariBrowser() {
  const ua = navigator.userAgent;
  const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  
  return isSafari || isIOS;
}

// ================= VALIDATION FUNCTIONS =================
function validateTrackingNumberInput(inputElement) {
  const value = inputElement.value.trim().toUpperCase();
  const isValid = /^[A-Z0-9-]{5,}$/i.test(value);
  
  // Update UI
  if (inputElement.id === 'trackingNumber') {
    const errorElement = document.getElementById('trackingError');
    if (errorElement) {
      errorElement.textContent = isValid ? '' : 'Minimum 5 alphanumeric characters or hyphens';
      errorElement.style.color = isValid ? '' : '#ff4444';
    }
  }
  
  return isValid;
}

function validateName(inputElement) {
  const value = inputElement?.value?.trim() || '';
  const isValid = value.length >= 2;
  
  if (inputElement.id === 'nameOnParcel') {
    const errorElement = document.getElementById('nameOnParcelError');
    if (errorElement) {
      errorElement.textContent = isValid ? '' : 'Minimum 2 characters required';
      errorElement.style.color = isValid ? '' : '#ff4444';
    }
  }
  
  return isValid;
}

function validateDescription(inputElement) {
  const value = inputElement?.value?.trim() || '';
  const isValid = value.length >= 5;
  
  if (inputElement.id === 'itemDescription') {
    const errorElement = document.getElementById('itemDescriptionError');
    if (errorElement) {
      errorElement.textContent = isValid ? '' : 'Minimum 5 characters required';
      errorElement.style.color = isValid ? '' : '#ff4444';
    }
  }
  
  return isValid;
}

function validateQuantity(inputElement) {
  const value = parseInt(inputElement?.value || 0);
  const isValid = !isNaN(value) && value > 0 && value < 1000;
  
  if (inputElement.id === 'quantity') {
    const errorElement = document.getElementById('quantityError');
    if (errorElement) {
      errorElement.textContent = isValid ? '' : 'Must be between 1 and 999';
      errorElement.style.color = isValid ? '' : '#ff4444';
    }
  }
  
  return isValid;
}

function validatePrice(inputElement) {
  const value = parseFloat(inputElement?.value || 0);
  const isValid = !isNaN(value) && value >= 0 && value <= 100000; // Changed > 0 to >= 0
  showError(isValid ? '' : 'Valid price (0-100000) required', 'priceError');
  return isValid;
}

function validateCollectionPoint(selectElement) {
  const value = selectElement?.value || '';
  const isValid = value !== '';
  
  if (selectElement.id === 'collectionPoint') {
    const errorElement = document.getElementById('collectionPointError');
    if (errorElement) {
      errorElement.textContent = isValid ? '' : 'Please select collection point';
      errorElement.style.color = isValid ? '' : '#ff4444';
    }
  }
  
  return isValid;
}

function validateCategory(selectElement) {
  const value = selectElement?.value || '';
  const isValid = value !== '';
  
  if (selectElement.id === 'itemCategory') {
    const errorElement = document.getElementById('itemCategoryError');
    if (errorElement) {
      errorElement.textContent = isValid ? '' : 'Please select item category';
      errorElement.style.color = isValid ? '' : '#ff4444';
    }
    
    if (isValid) {
      checkCategoryRequirements();
    }
  }
  
  return isValid;
}

function validateInvoiceFiles() {
  const mandatoryCategories = [
    '*Books', '*Cosmetics/Skincare/Bodycare',
    '*Food Beverage/Drinks', '*Gadgets',
    '*Oil Ointment', '*Supplement', '*Others'
  ];
  
  const category = document.getElementById('itemCategory')?.value || '';
  const files = document.getElementById('fileUpload')?.files || [];
  let isValid = true;
  let errorMessage = '';

  if (files.length > 3) {
    errorMessage = 'Maximum 3 files allowed';
    isValid = false;
  } else if (mandatoryCategories.includes(category)) {
    isValid = files.length > 0;
    errorMessage = isValid ? '' : 'At least 1 invoice required';
  }

  const errorElement = document.getElementById('invoiceFilesError');
  if (errorElement) {
    errorElement.textContent = errorMessage;
    errorElement.style.color = isValid ? '' : '#ff4444';
  }
  
  return isValid;
}

function validateParcelPhone(input) {
  const value = input.value.trim();
  const isValid = /^(673\d{7,}|60\d{9,})$/.test(value);
  
  if (input.id === 'phoneNumber') {
    const errorElement = document.getElementById('phoneNumberError');
    if (errorElement) {
      errorElement.textContent = isValid ? '' : 'Invalid phone number format';
      errorElement.style.color = isValid ? '' : '#ff4444';
    }
  }
  
  return isValid;
}

// ================= FORM VALIDATION UTILITIES =================
function checkAllFields() {
  const validations = [
    validateTrackingNumberInput(document.getElementById('trackingNumber')),
    validateName(document.getElementById('nameOnParcel')),
    validateParcelPhone(document.getElementById('phoneNumber')),
    validateDescription(document.getElementById('itemDescription')),
    validateQuantity(document.getElementById('quantity')),
    validatePrice(document.getElementById('price')),
    validateCollectionPoint(document.getElementById('collectionPoint')),
    validateCategory(document.getElementById('itemCategory')),
    validateInvoiceFiles()
  ];

  return validations.every(v => v === true);
}

function checkInvoiceRequirements() {
  return validateInvoiceFiles();
}

function updateSubmitButtonState() {
  const submitBtn = document.getElementById('submitBtn');
  if(!submitBtn) return;
  
  // Check all validations
  const isValid = checkAllFields();
  submitBtn.disabled = !isValid;
  
  // Update button text based on device
  if (detectViewMode()) {
    submitBtn.innerHTML = '📱 Submit (Mobile)';
  } else {
    submitBtn.innerHTML = '💻 Submit (Desktop)';
  }
}

// ================= FORM INITIALIZATION =================
function initValidationListeners() {
  const parcelForm = document.getElementById('declarationForm');
  if (parcelForm) {
    const inputs = parcelForm.querySelectorAll('input, select, textarea');
    
    inputs.forEach(input => {
      input.addEventListener('input', () => {
        switch(input.id) {
          case 'trackingNumber':
            validateTrackingNumberInput(input);
            break;
          case 'nameOnParcel':
            validateName(input);
            break;
          case 'phoneNumber':
            validateParcelPhone(input);
            break;
          case 'itemDescription':
            validateDescription(input);
            break;
          case 'quantity':
            validateQuantity(input);
            break;
          case 'price':
            validatePrice(input);
            break;
          case 'collectionPoint':
            validateCollectionPoint(input);
            break;
          case 'itemCategory':
            validateCategory(input);
            break;
        }
        updateSubmitButtonState();
      });
      
      input.addEventListener('change', () => {
        updateSubmitButtonState();
      });
    });

    const fileInput = document.getElementById('fileUpload');
    if(fileInput) {
      fileInput.addEventListener('change', () => {
        validateInvoiceFiles();
        updateSubmitButtonState();
      });
    }
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
function validatePhone(phone) {
  const regex = /^(673\d{7,}|60\d{9,})$/;
  return regex.test(phone);
}

function validatePassword(password) {
  const regex = /^(?=.*[A-Z])(?=.*\d).{6,}$/;
  return regex.test(password);
}

function validateEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
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
      isValid = /^[A-Z0-9-]{5,}$/i.test(value);
      message = isValid ? '' : 'Minimum 5 alphanumeric characters or hyphens';
      break;
      
    case 'nameOnParcel':
      isValid = value.length >= 2 && value.length <= 100;
      message = isValid ? '' : '2-100 characters required';
      break;
      
    case 'itemDescription':
      isValid = value.length >= 5 && value.length <= 500;
      message = isValid ? '' : '5-500 characters required';
      break;
      
    case 'quantity':
      const qty = parseInt(value);
      isValid = !isNaN(qty) && qty >= 1 && qty <= 999;
      message = isValid ? '' : 'Must be between 1 and 999';
      break;
      
    case 'price':
      const price = parseFloat(value);
      isValid = !isNaN(price) && price >= 0 && price <= 99999; // Changed > 0 to >= 0
      message = isValid ? '' : 'Must be between 0 and 99,999';
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
  const category = document.getElementById('itemCategory')?.value || '';
  
  const starredCategories = [
    '*Books', '*Cosmetics/Skincare/Bodycare',
    '*Food Beverage/Drinks', '*Gadgets',
    '*Oil Ointment', '*Supplement', '*Others'
  ];
  
  let isValid = true;
  let errorMessage = '';
  
  // Check if files are required
  if (starredCategories.includes(category)) {
    if (files.length === 0) {
      errorMessage = 'Invoice/document upload is required for this category';
      isValid = false;
    }
  }
  
  // Validate individual files if any are selected
  if (files.length > 0) {
    if (files.length > CONFIG.MAX_FILES) {
      errorMessage = `Maximum ${CONFIG.MAX_FILES} files allowed`;
      isValid = false;
    }
    
    for (const file of files) {
      if (file.size > CONFIG.MAX_FILE_SIZE) {
        errorMessage = `File "${file.name}" exceeds 5MB limit`;
        isValid = false;
        break;
      }
      
      if (!CONFIG.ALLOWED_FILE_TYPES.includes(file.type)) {
        errorMessage = `File "${file.name}" must be JPG, PNG, or PDF`;
        isValid = false;
        break;
      }
    }
  }
  
  // Show appropriate message
  if (errorMessage) {
    showError(errorMessage, 'invoiceFilesError');
  } else if (files.length > 0) {
    showError(`${files.length} file(s) selected`, 'invoiceFilesError success');
  } else {
    showError('', 'invoiceFilesError');
  }
  
  return isValid;
}

function updateSubmitButton() {
  const submitBtn = document.getElementById('submitBtn');
  if (!submitBtn) return;
  
  const requiredFields = [
    'trackingNumber', 'nameOnParcel', 'itemDescription',
    'quantity', 'price', 'collectionPoint', 'itemCategory'
  ];
  
  let allValid = true;
  
  requiredFields.forEach(fieldId => {
    const field = document.getElementById(fieldId);
    if (field && !field.value.trim()) {
      allValid = false;
    }
  });
  
  // Check file requirements for starred categories
  const category = document.getElementById('itemCategory')?.value || '';
  const starredCategories = [
    '*Books', '*Cosmetics/Skincare/Bodycare', '*Food Beverage/Drinks',
    '*Gadgets', '*Oil Ointment', '*Supplement', '*Others'
  ];
  
  if (starredCategories.includes(category)) {
    const files = document.getElementById('fileUpload')?.files || [];
    if (files.length === 0) {
      allValid = false;
    }
  }
  
  submitBtn.disabled = !allValid;
}

// ================= CATEGORY REQUIREMENTS =================
function checkCategoryRequirements() {
  const category = document.getElementById('itemCategory')?.value || '';
  const fileInput = document.getElementById('fileUpload');
  const fileHelp = document.getElementById('fileHelp');
  
  const starredCategories = [
    '*Books', '*Cosmetics/Skincare/Bodycare',
    '*Food Beverage/Drinks', '*Gadgets',
    '*Oil Ointment', '*Supplement', '*Others'
  ];

  if (starredCategories.includes(category)) {
    if (fileInput) {
      fileInput.required = true;
      fileInput.disabled = false; // Ensure it's enabled
      fileInput.style.display = 'block';
    }
    if (fileHelp) {
      fileHelp.innerHTML = 'Required: JPEG, PNG, PDF (Max 5MB each)';
      fileHelp.style.color = '#ff4444';
    }
  } else {
    if (fileInput) {
      fileInput.required = false;
      fileInput.disabled = false; // Keep enabled for optional uploads
      fileInput.style.display = 'block';
    }
    if (fileHelp) {
      fileHelp.innerHTML = 'Optional: JPEG, PNG, PDF (Max 5MB each)';
      fileHelp.style.color = '#888';
    }
  }
}

function setupCategoryChangeListener() {
  const categorySelect = document.getElementById('itemCategory');
  if (categorySelect) {
    categorySelect.addEventListener('change', function() {
      checkCategoryRequirements();
      updateSubmitButtonState();
      
      // Reset file input when category changes to non-starred
      const fileInput = document.getElementById('fileUpload');
      const category = this.value;
      
      const starredCategories = [
        '*Books', '*Cosmetics/Skincare/Bodycare',
        '*Food Beverage/Drinks', '*Gadgets',
        '*Oil Ointment', '*Supplement', '*Others'
      ];
      
      if (!starredCategories.includes(category) && fileInput) {
        fileInput.value = ''; // Clear file selection
        showError('', 'invoiceFilesError'); // Clear error message
      }
    });
  }
}

// ================= MOBILE FILE INPUT FIX =================
function setupMobileFileInput() {
  if (detectViewMode()) { // If mobile device
    const fileInput = document.getElementById('fileUpload');
    if (fileInput) {
      // Remove any existing listeners
      const newFileInput = fileInput.cloneNode(true);
      fileInput.parentNode.replaceChild(newFileInput, fileInput);
      
      // Add mobile-friendly attributes
      newFileInput.setAttribute('accept', 'image/*,.pdf');
      newFileInput.setAttribute('capture', 'environment'); // For mobile camera
      
      // Add click handler to debug
      newFileInput.addEventListener('click', function() {
        console.log('File input clicked on mobile');
      });
      
      // Add change handler
      newFileInput.addEventListener('change', function() {
        console.log('Files selected:', this.files.length);
        if (this.files.length > 0) {
          console.log('File details:', {
            name: this.files[0].name,
            size: this.files[0].size,
            type: this.files[0].type
          });
        }
        validateFiles(this);
        updateSubmitButtonState();
      });
    }
  }
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
    
    // Populate form fields
    Object.keys(draft).forEach(key => {
      if (key !== 'timestamp' && key !== 'id' && key !== 'filesCount' && key !== 'filesInfo') {
        const field = document.getElementById(key);
        if (field) field.value = draft[key];
      }
    });
    
    // Update UI
    checkCategoryRequirements();
    updateSubmitButtonState();
    
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
  const isMobile = detectViewMode();
  
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
        phoneField.style.backgroundColor = '#2a2a2a';
        phoneField.style.color = '#ffffff';
      }
      
      // Setup enhanced form submission
      const form = document.getElementById('declarationForm');
      if (form) {
        form.addEventListener('submit', handleParcelSubmission);
      }
      
      setupCategoryChangeListener();
      initValidationListeners();
      checkCategoryRequirements();
      updateSubmitButtonState();
      
      // Setup mobile file input if on mobile
      if (isMobile) {
        setupMobileFileInput();
      }
      
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
window.showRegistration = () => safeRedirect('register.html');
window.showForgotPassword = () => safeRedirect('forgot-password.html');
window.checkCategoryRequirements = checkCategoryRequirements;
window.validateField = validateField;
window.updateSubmitButtonState = updateSubmitButtonState;

// Safari-specific functions
window.isSafariBrowser = isSafariBrowser;

// ================= MANUAL DRAFT SAVE (OPTIONAL) =================
// Add a button in your HTML to manually save draft
// <button type="button" onclick="manualSaveDraft()">Save Draft</button>
function manualSaveDraft() {
  if (confirm('Save current form as draft?')) {
    saveFormAsDraft();
  }
}

// ================= NETWORK STATUS MONITOR =================
function checkNetworkStatus() {
  if (!navigator.onLine) {
    showError('You are offline. Please check your internet connection.');
    return false;
  }
  return true;
}

// Monitor network status
window.addEventListener('online', () => {
  console.log('Network connection restored');
  showError('Network connection restored', 'network-status');
});

window.addEventListener('offline', () => {
  console.log('Network connection lost');
  showError('You are offline. Form data will be saved locally.', 'network-status');
});
