/**
 * Certificate API - handles all certificate-related API calls
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3100';

export interface Certificate {
  id: string;
  type: 'lesson' | 'beginner_course' | 'intermediate_course' | 'advanced_course';
  studentId: string;
  studentName: string;
  issuedAt: string;
  lessonSlug?: string;
  lessonName?: string;
  courseName?: string;
  verificationCode: string;
  badgeEmoji?: string;
}

export interface CertificateGenerationRequest {
  type: 'lesson' | 'beginner_course' | 'intermediate_course' | 'advanced_course';
  lessonSlug?: string;
}

async function handleResponse<T>(response: Response): Promise<T> {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'An error occurred');
  }
  return data;
}

export const certificateApi = {
  // Get all certificates for current user
  getMyCertificates: async (token: string): Promise<Certificate[]> => {
    const response = await fetch(`${API_BASE}/api/certificates`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    return handleResponse<Certificate[]>(response);
  },

  // Get a specific certificate
  getCertificate: async (certificateId: string, token: string): Promise<Certificate> => {
    const response = await fetch(`${API_BASE}/api/certificates/${certificateId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    return handleResponse<Certificate>(response);
  },

  // Generate a new certificate (after completing lesson/course)
  generateCertificate: async (token: string, data: CertificateGenerationRequest): Promise<Certificate> => {
    const response = await fetch(`${API_BASE}/api/certificates/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    return handleResponse<Certificate>(response);
  },

  // Verify a certificate by code
  verifyCertificate: async (verificationCode: string): Promise<Certificate> => {
    const response = await fetch(`${API_BASE}/api/certificates/verify/${verificationCode}`);
    return handleResponse<Certificate>(response);
  },

  // Get PDF download URL
  getDownloadUrl: async (certificateId: string, token: string): Promise<{ url: string }> => {
    const response = await fetch(`${API_BASE}/api/certificates/${certificateId}/download`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    return handleResponse<{ url: string }>(response);
  },

  // Share to social media (returns share URLs)
  getShareUrls: (certificate: Certificate, type: 'facebook' | 'zalo' | 'twitter'): string => {
    const baseUrl = window.location.origin;
    const verifyUrl = `${baseUrl}/verify/${certificate.verificationCode}`;
    const text = encodeURIComponent(`Tôi vừa hoàn thành khóa học robotics với RoboKids Vietnam! 🤖✨`);

    if (type === 'facebook') {
      return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(verifyUrl)}&quote=${text}`;
    }
    if (type === 'zalo') {
      return `https://zalo.me/share?url=${encodeURIComponent(verifyUrl)}&title=${text}`;
    }
    if (type === 'twitter') {
      return `https://twitter.com/intent/tweet?url=${encodeURIComponent(verifyUrl)}&text=${text}`;
    }
    return verifyUrl;
  },
};

export default certificateApi;