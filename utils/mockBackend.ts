// This file mocks backend API calls for the "No External API" requirement on the backend logic
// In a real production app, these would be Express/Node.js endpoints

import { KYCData } from "../types";

export const mockBackendAPI = {
  verifyKYC: async (data: KYCData): Promise<{ success: boolean; message: string }> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        // Simulate backend validation logic
        const isValidFormat = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(data.pan) && /^[0-9]{12}$/.test(data.aadhaar);
        
        // Mock Failure trigger for specific PAN (Demo purposes)
        if (data.pan === 'ABCDE0000F') {
           resolve({ success: false, message: "Backend Verification Failed: Suspicious PAN" });
           return;
        }

        if (isValidFormat && data.documentUploaded) {
          resolve({ success: true, message: "Verification Successful" });
        } else {
          resolve({ success: false, message: "Invalid Document Format or Missing Data" });
        }
      }, 2000); // Network delay simulation
    });
  },

  sendOTP: async (mobile: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log(`[BACKEND] OTP sent to ${mobile}: 1234`);
        resolve(true);
      }, 1000);
    });
  },

  verifyOTP: async (inputOtp: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(inputOtp === '1234');
      }, 500);
    });
  }
};