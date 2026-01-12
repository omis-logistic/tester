// column-mappings.js - Standardized column indices for all sheets
const SHEET_CONFIGS = {
  // PARCEL DECLARATION SHEET (V2)
  PARCEL_DECLARATION: {
    sheetName: 'V2',
    columns: {
      TIMESTAMP: 0,        // A: Submission timestamp
      EMPTY: 1,           // B: (Reserved/Empty)
      TRACKING_NUMBER: 2, // C: Tracking Number
      NAME_ON_PARCEL: 3,  // D: Name on Parcel
      PHONE_NUMBER: 4,    // E: Phone Number
      ITEM_DESCRIPTION: 5, // F: Item Description
      QUANTITY: 6,        // G: Quantity
      PRICE: 7,           // H: Price
      COLLECTION_POINT: 8, // I: Collection Point
      ITEM_CATEGORY: 9,   // J: Item Category
      DOCUMENTS: 10       // K: Document URLs
    },
    headers: [
      'Timestamp',
      '',
      'Tracking Number',
      'Name on Parcel',
      'Phone Number',
      'Item Description',
      'Quantity',
      'Price',
      'Collection Point',
      'Item Category',
      'Documents'
    ]
  },
  
  // USERS SHEET
  USERS: {
    sheetName: 'Users',
    columns: {
      PHONE: 0,           // A: Phone
      PASSWORD: 1,        // B: Password Hash
      EMAIL: 2,           // C: Email
      REG_DATE: 3,        // D: Registration Date
      SALT: 4,           // E: Salt
      TEMP_PASSWORD_FLAG: 5 // F: TempPasswordFlag
    }
  },
  
  // BILLING SHEET (READY TO COLLECT)
  BILLING: {
    sheetName: 'READY TO COLLECT',
    columnNames: {
      NAME: 'Name',
      LOCATION: 'Location',
      CODE: 'Code',
      TRACKING: 'Tracking details',
      QUANTITY: 'Qty',
      PRICE: 'Price',
      DECLARE: 'Declare',
      TAX: 'Tax',
      OTHER_FEES: 'Other Fees',
      TOTAL: 'Total',
      PHONE: 'Phone Number',
      DATE: 'Date',
      RECEIPT: 'order Number',
      STATUS: 'Status',
      COLLECTION_DATE: 'Collection Date'
    }
  },
  
  // TRACKER SHEET
  TRACKER: {
    sheetName: 'ParcelTracker',
    columns: {
      PHONE: 0,           // A: Phone
      TRACKING_NUMBER: 1, // B: Tracking Number
      STATUS: 2,          // C: Status
      LOCATION: 3,        // D: Location
      ESTIMATED_DELIVERY: 4, // E: Estimated Delivery
      SUBMITTED_TIMESTAMP: 5, // F: Submitted Timestamp
      ITEM_DESCRIPTION: 6, // G: Item Description
      COLLECTION_POINT: 7  // H: Collection Point
    }
  }
};

// Helper function to get column index by name
function getColumnIndex(headers, columnName) {
  const index = headers.findIndex(header => 
    header && header.toString().trim().toLowerCase() === columnName.toLowerCase()
  );
  return index !== -1 ? index : null;
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SHEET_CONFIGS, getColumnIndex };
} else if (typeof window !== 'undefined') {
  window.SHEET_CONFIGS = SHEET_CONFIGS;
  window.getColumnIndex = getColumnIndex;
}
