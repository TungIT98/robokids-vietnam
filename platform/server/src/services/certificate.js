import PDFDocument from 'pdfkit';
import { v4 as uuidv4 } from 'uuid';
import { supabase, supabaseAdmin } from '../lib/supabase.js';

/**
 * Certificate types
 */
export const CERTIFICATE_TYPES = {
  LESSON: 'lesson',
  BEGINNER_COURSE: 'beginner_course',
  INTERMEDIATE_COURSE: 'intermediate_course',
  ADVANCED_COURSE: 'advanced_course'
};

/**
 * Age group to certificate type mapping
 */
export const AGE_GROUP_CERTIFICATES = {
  beginner: CERTIFICATE_TYPES.BEGINNER_COURSE,
  intermediate: CERTIFICATE_TYPES.INTERMEDIATE_COURSE,
  advanced: CERTIFICATE_TYPES.ADVANCED_COURSE
};

/**
 * Certificate type display names
 */
const CERTIFICATE_NAMES = {
  [CERTIFICATE_TYPES.LESSON]: 'Lesson Completion Certificate',
  [CERTIFICATE_TYPES.BEGINNER_COURSE]: 'Beginner Robotics Certificate',
  [CERTIFICATE_TYPES.INTERMEDIATE_COURSE]: 'Intermediate Robotics Certificate',
  [CERTIFICATE_TYPES.ADVANCED_COURSE]: 'Advanced Robotics Certificate'
};

const CERTIFICATE_NAMES_VI = {
  [CERTIFICATE_TYPES.LESSON]: 'Chứng chỉ hoàn thành bài học',
  [CERTIFICATE_TYPES.BEGINNER_COURSE]: 'Chứng chỉ Robot cơ bản',
  [CERTIFICATE_TYPES.INTERMEDIATE_COURSE]: 'Chứng chỉ Robot trung cấp',
  [CERTIFICATE_TYPES.ADVANCED_COURSE]: 'Chứng chỉ Robot nâng cao'
};

/**
 * Generate a unique certificate ID
 */
function generateCertificateId() {
  return `RK-${uuidv4().substring(0, 8).toUpperCase()}`;
}

/**
 * Generate PDF certificate buffer
 */
async function generatePDFBuffer(certificateData) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margin: 50
      });

      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const {
        studentName,
        courseName,
        courseNameVi,
        certificateType,
        completionDate,
        certificateId,
        ageGroup
      } = certificateData;

      // Certificate dimensions (landscape A4)
      const pageWidth = 841.89;
      const pageHeight = 595.28;

      // Colors
      const primaryColor = '#1E3A5F';  // Deep blue
      const accentColor = '#FF6B35';    // RoboKids orange
      const goldColor = '#D4AF37';      // Gold for certificate

      // Border decoration
      doc.rect(30, 30, pageWidth - 60, pageHeight - 60)
         .lineWidth(3)
         .stroke('#1E3A5F');

      doc.rect(35, 35, pageWidth - 70, pageHeight - 70)
         .lineWidth(1)
         .stroke('#FF6B35');

      // Header - RoboKids logo text
      doc.font('Helvetica-Bold')
         .fontSize(36)
         .fillColor(primaryColor)
         .text('RoboKids Vietnam', 0, 80, { align: 'center' });

      // Subtitle
      doc.font('Helvetica')
         .fontSize(14)
         .fillColor('#666666')
         .text('Robotics Education Platform', 0, 125, { align: 'center' });

      // Certificate type
      const certName = ageGroup === 'vi' ? CERTIFICATE_NAMES_VI[certificateType] : CERTIFICATE_NAMES[certificateType];
      doc.font('Helvetica-Bold')
         .fontSize(24)
         .fillColor(accentColor)
         .text(certName, 0, 170, { align: 'center' });

      // Decorative line
      const lineY = 210;
      doc.moveTo(200, lineY)
         .lineTo(pageWidth - 200, lineY)
         .lineWidth(1)
         .stroke('#D4AF37');

      // "This certifies that"
      doc.font('Helvetica')
         .fontSize(14)
         .fillColor('#666666')
         .text('This certifies that', 0, 240, { align: 'center' });

      // Student name
      doc.font('Helvetica-Bold')
         .fontSize(32)
         .fillColor(primaryColor)
         .text(studentName, 0, 270, { align: 'center' });

      // "has successfully completed"
      doc.font('Helvetica')
         .fontSize(14)
         .fillColor('#666666')
         .text('has successfully completed', 0, 320, { align: 'center' });

      // Course name
      doc.font('Helvetica-Bold')
         .fontSize(22)
         .fillColor(accentColor)
         .text(courseName, 0, 350, { align: 'center' });

      if (courseNameVi && courseNameVi !== courseName) {
        doc.font('Helvetica')
           .fontSize(16)
           .fillColor('#888888')
           .text(courseNameVi, 0, 380, { align: 'center' });
      }

      // Date
      const formattedDate = new Date(completionDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      doc.font('Helvetica')
         .fontSize(12)
         .fillColor('#666666')
         .text(`Completed on ${formattedDate}`, 0, 420, { align: 'center' });

      // Certificate ID and verification
      doc.font('Helvetica')
         .fontSize(10)
         .fillColor('#999999')
         .text(`Certificate ID: ${certificateId}`, 0, 500, { align: 'center' });

      doc.fontSize(8)
         .text('Verify at: https://robokids.vn/verify', 0, 515, { align: 'center' });

      // Seal/badge decoration
      doc.circle(pageWidth - 150, pageHeight - 150, 40)
         .fillAndStroke('#FF6B35', '#1E3A5F');

      doc.font('Helvetica-Bold')
         .fontSize(10)
         .fillColor('#FFFFFF')
         .text('VERIFIED', pageWidth - 185, pageHeight - 155, { width: 70, align: 'center' });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Upload PDF to Supabase Storage
 */
async function uploadToStorage(pdfBuffer, certificateId, bucketName = 'certificates') {
  const filePath = `certificates/${certificateId}.pdf`;

  // Check if bucket exists, if not create it
  const { data: buckets } = await supabaseAdmin.storage.listBuckets();
  const bucketExists = buckets?.some(b => b.name === bucketName);

  if (!bucketExists) {
    await supabaseAdmin.storage.createBucket(bucketName, {
      public: true,
      allowedMimeTypes: ['application/pdf']
    });
  }

  const { data, error } = await supabaseAdmin.storage
    .from(bucketName)
    .upload(filePath, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: true
    });

  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  // Get public URL
  const { data: { publicUrl } } = supabaseAdmin.storage
    .from(bucketName)
    .getPublicUrl(filePath);

  return publicUrl;
}

/**
 * Create certificate record in database
 */
async function createCertificateRecord(certificateData) {
  const {
    userId,
    certificateId,
    certificateType,
    lessonId,
    courseId,
    courseName,
    pdfUrl,
    issuedAt
  } = certificateData;

  const { data, error } = await supabaseAdmin
    .from('certificates')
    .insert({
      certificate_id: certificateId,
      user_id: userId,
      certificate_type: certificateType,
      lesson_id: lessonId || null,
      course_id: courseId || null,
      course_name: courseName,
      pdf_url: pdfUrl,
      issued_at: issuedAt
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Database insert failed: ${error.message}`);
  }

  return data;
}

/**
 * Generate a lesson completion certificate
 */
export async function generateLessonCertificate(userId, lessonId, studentName) {
  // Get lesson details
  const { data: lesson, error: lessonError } = await supabase
    .from('lessons')
    .select('id, title_en, title_vi, age_group, category')
    .eq('id', lessonId)
    .single();

  if (lessonError || !lesson) {
    throw new Error('Lesson not found');
  }

  const certificateId = generateCertificateId();
  const completionDate = new Date().toISOString();

  const pdfBuffer = await generatePDFBuffer({
    studentName,
    courseName: lesson.title_en,
    courseNameVi: lesson.title_vi,
    certificateType: CERTIFICATE_TYPES.LESSON,
    completionDate,
    certificateId,
    ageGroup: 'en'
  });

  const pdfUrl = await uploadToStorage(pdfBuffer, certificateId);

  const certificate = await createCertificateRecord({
    userId,
    certificateId,
    certificateType: CERTIFICATE_TYPES.LESSON,
    lessonId: lesson.id,
    courseName: lesson.title_en,
    pdfUrl,
    issuedAt: completionDate
  });

  return {
    certificateId,
    pdfUrl,
    type: CERTIFICATE_TYPES.LESSON,
    lessonId: lesson.id,
    lessonName: lesson.title_en,
    issuedAt: completionDate
  };
}

/**
 * Generate a course completion certificate
 */
export async function generateCourseCertificate(userId, courseLevel, studentName) {
  const certificateType = AGE_GROUP_CERTIFICATES[courseLevel];

  if (!certificateType) {
    throw new Error('Invalid course level');
  }

  const courseNames = {
    beginner: { en: 'Beginner Robotics Course', vi: 'Khóa Robot cơ bản' },
    intermediate: { en: 'Intermediate Robotics Course', vi: 'Khóa Robot trung cấp' },
    advanced: { en: 'Advanced Robotics Course', vi: 'Khóa Robot nâng cao' }
  };

  const certificateId = generateCertificateId();
  const completionDate = new Date().toISOString();

  const pdfBuffer = await generatePDFBuffer({
    studentName,
    courseName: courseNames[courseLevel].en,
    courseNameVi: courseNames[courseLevel].vi,
    certificateType,
    completionDate,
    certificateId,
    ageGroup: 'en'
  });

  const pdfUrl = await uploadToStorage(pdfBuffer, certificateId);

  const certificate = await createCertificateRecord({
    userId,
    certificateId,
    certificateType,
    courseId: courseLevel,
    courseName: courseNames[courseLevel].en,
    pdfUrl,
    issuedAt: completionDate
  });

  return {
    certificateId,
    pdfUrl,
    type: certificateType,
    courseLevel,
    courseName: courseNames[courseLevel].en,
    issuedAt: completionDate
  };
}

/**
 * Verify a certificate by ID
 */
export async function verifyCertificate(certificateId) {
  const { data: certificate, error } = await supabase
    .from('certificates')
    .select(`
      *,
      profiles (
        full_name
      )
    `)
    .eq('certificate_id', certificateId)
    .single();

  if (error || !certificate) {
    return { valid: false, error: 'Certificate not found' };
  }

  return {
    valid: true,
    certificate: {
      certificateId: certificate.certificate_id,
      studentName: certificate.profiles?.full_name,
      certificateType: certificate.certificate_type,
      courseName: certificate.course_name,
      issuedAt: certificate.issued_at,
      pdfUrl: certificate.pdf_url
    }
  };
}

/**
 * Get user's certificates
 */
export async function getUserCertificates(userId) {
  const { data: certificates, error } = await supabase
    .from('certificates')
    .select('*')
    .eq('user_id', userId)
    .order('issued_at', { ascending: false });

  if (error) {
    throw error;
  }

  return certificates.map(cert => ({
    certificateId: cert.certificate_id,
    type: cert.certificate_type,
    courseName: cert.course_name,
    lessonId: cert.lesson_id,
    pdfUrl: cert.pdf_url,
    issuedAt: cert.issued_at
  }));
}

export default {
  CERTIFICATE_TYPES,
  AGE_GROUP_CERTIFICATES,
  generateLessonCertificate,
  generateCourseCertificate,
  verifyCertificate,
  getUserCertificates
};