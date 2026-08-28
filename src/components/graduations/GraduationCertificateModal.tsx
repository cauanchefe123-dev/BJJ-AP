import React from 'react';
import { Graduation, Student, AcademyConfig } from '../../types';
import { OfficialGraduationCertificate } from '../reports/OfficialGraduationCertificate';

interface GraduationCertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  graduation: Graduation | null;
  student?: Student | null;
  academyConfig: AcademyConfig;
}

export const GraduationCertificateModal: React.FC<GraduationCertificateModalProps> = ({
  isOpen,
  onClose,
  graduation,
  student,
  academyConfig,
}) => {
  if (!isOpen || !graduation) return null;

  // Build temporary or resolved student record for the certificate
  const targetStudent: Student = student || {
    id: graduation.studentId || 'temp',
    registrationNumber: 'BJJ-ATLETA',
    name: graduation.studentName || 'Atleta',
    email: '',
    phone: '',
    birthDate: '',
    photoUrl: '',
    belt: graduation.belt,
    stripes: graduation.stripes,
    startDate: graduation.promotedAt,
    totalClassesAttended: graduation.classesCountAtPromotion || 0,
    classesSinceLastGraduation: graduation.classesCountAtPromotion || 0,
    weightCategory: 'MÉDIO',
    ageCategory: 'ADULTO',
    active: true,
    planName: 'Padrão',
    planPrice: 0,
    paymentDueDateDay: 10,
    paymentStatus: 'PAGO',
    lastGraduationDate: graduation.promotedAt,
    qrCodeToken: 'BJJ-CERT',
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-6xl w-full p-4 sm:p-6 text-white shadow-2xl relative my-auto print:border-none print:shadow-none print:p-0 print:bg-white print:max-w-none">
        <OfficialGraduationCertificate
          student={targetStudent}
          academyConfig={academyConfig}
          belt={graduation.belt}
          stripes={graduation.stripes}
          promotedBy={graduation.promotedBy}
          promotedAt={graduation.promotedAt}
          notes={graduation.notes}
          onClose={onClose}
          isModal={true}
        />
      </div>
    </div>
  );
};
