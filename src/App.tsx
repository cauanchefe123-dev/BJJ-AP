/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider, useData } from './context/DataContext';

import { RoleSwitcher } from './components/layout/RoleSwitcher';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { BottomTabBar } from './components/layout/BottomTabBar';

import { AdminDashboard } from './components/dashboard/AdminDashboard';
import { TeacherDashboard } from './components/dashboard/TeacherDashboard';
import { StudentDashboard } from './components/dashboard/StudentDashboard';

import { StudentList } from './components/students/StudentList';
import { AddStudentModal } from './components/students/AddStudentModal';
import { EditStudentModal } from './components/students/EditStudentModal';
import { GraduationModal } from './components/students/GraduationModal';

import { AttendanceManager } from './components/attendance/AttendanceManager';
import { QRCodeCheckinModal } from './components/attendance/QRCodeCheckinModal';
import { DailyAttendanceModal } from './components/attendance/DailyAttendanceModal';

import { ClassManager } from './components/classes/ClassManager';
import { TeacherManager } from './components/teachers/TeacherManager';
import { PaymentManager } from './components/financial/PaymentManager';
import { PixPaymentModal } from './components/financial/PixPaymentModal';

import { DigitalMembershipCard } from './components/card/DigitalMembershipCard';
import { RankingBoard } from './components/ranking/RankingBoard';
import { MatTimer } from './components/timer/MatTimer';
import { StudentTrainingJournal } from './components/student/StudentTrainingJournal';
import { TeacherObservationsView } from './components/observations/TeacherObservationsView';
import { ReportsView } from './components/reports/ReportsView';
import { AcademySettings } from './components/settings/AcademySettings';
import { AcademyLinkView } from './components/academies/AcademyLinkView';
import { AdminStudentDashboardView } from './components/dashboard/AdminStudentDashboardView';
import { WeeklyFocusPositionsView } from './components/positions/WeeklyFocusPositionsView';
import { RollChallengeBoard } from './components/challenges/RollChallengeBoard';
import { TrainingGalleryView } from './components/gallery/TrainingGalleryView';
import { GraduationHistoryView } from './components/graduations/GraduationHistoryView';
import { ErrorBoundary } from './components/layout/ErrorBoundary';

import { PendingApprovalScreen } from './components/auth/PendingApprovalScreen';
import { PaymentRecord, Student } from './types';
import { AuthModal } from './components/auth/AuthModal';
import { resolveStudentForUser, DEFAULT_BLACK_GI_AVATAR } from './constants/avatar';
import { InAppToastNotification } from './components/notifications/InAppToastNotification';
import { PWAUpdateManager } from './components/pwa/PWAUpdateManager';

function MainApp() {
  const { currentUser } = useAuth();
  const { students, payments } = useData();

  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [isNotifOpen, setIsNotifOpen] = useState<boolean>(false);

  // Modals
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isQuickCheckinOpen, setIsQuickCheckinOpen] = useState<boolean>(false);
  const [isDailyAttendanceOpen, setIsDailyAttendanceOpen] = useState<boolean>(false);
  const [isAddStudentOpen, setIsAddStudentOpen] = useState<boolean>(false);
  const [isEditStudentOpen, setIsEditStudentOpen] = useState<boolean>(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [isGraduationOpen, setIsGraduationOpen] = useState<boolean>(false);
  const [studentForGraduation, setStudentForGraduation] = useState<Student | null>(null);
  const [selectedStudentCard, setSelectedStudentCard] = useState<Student | null>(null);
  const [pixModalPayment, setPixModalPayment] = useState<PaymentRecord | null>(null);

  const handleOpenEditStudent = (student: Student) => {
    setEditingStudent(student);
    setIsEditStudentOpen(true);
  };

  if (!currentUser) {
    return <AuthModal isOpen={true} onClose={() => {}} />;
  }

  const currentStudent = resolveStudentForUser(currentUser, students);

  const handleOpenGraduation = (student?: Student) => {
    setStudentForGraduation(student || null);
    setIsGraduationOpen(true);
  };

  const handleOpenPixForId = (paymentId: string) => {
    const p = payments.find(pay => pay.id === paymentId);
    if (p) {
      setPixModalPayment(p);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isOpen={isSidebarOpen}
          setIsOpen={setIsSidebarOpen}
          onOpenEditProfile={() => {
            const st = currentStudent || (currentUser ? {
              id: currentUser.studentId || currentUser.id,
              registrationNumber: 'STAFF',
              name: currentUser.name,
              email: currentUser.email,
              phone: currentUser.phone || '',
              birthDate: '1990-01-01',
              photoUrl: currentUser.avatarUrl || DEFAULT_BLACK_GI_AVATAR,
              belt: (currentUser.role === 'ADMIN' || currentUser.role === 'PROFESSOR') ? 'PRETA' : 'BRANCA',
              stripes: 0,
              startDate: new Date().toISOString().split('T')[0],
              totalClassesAttended: 0,
              classesSinceLastGraduation: 0,
              weightCategory: 'MÉDIO',
              ageCategory: 'ADULTO',
              active: true,
              planName: 'Staff',
              planPrice: 0,
              paymentDueDateDay: 10,
              paymentStatus: 'PAGO',
              qrCodeToken: `BJJCRON-${currentUser.id}`,
              approvalStatus: 'APPROVED',
            } as Student : null);
            if (st) handleOpenEditStudent(st);
          }}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
          {/* Top Header */}
          <Navbar
            activeTab={activeTab}
            onOpenSidebar={() => setIsSidebarOpen(true)}
            onOpenQuickScan={() => setIsQuickCheckinOpen(true)}
            onOpenDailyAttendance={() => setIsDailyAttendanceOpen(true)}
            onOpenAuthModal={() => setIsAuthModalOpen(true)}
            isNotifOpen={isNotifOpen}
            setIsNotifOpen={setIsNotifOpen}
            onNavigateTab={setActiveTab}
          />

          {/* Page Content */}
          <main className="flex-1 p-3 sm:p-6 md:p-8 pb-24 sm:pb-8 overflow-y-auto max-w-7xl w-full mx-auto space-y-5 sm:space-y-6">
            {currentUser.role === 'ALUNO' && (currentUser.approvalStatus === 'PENDING' || currentStudent?.approvalStatus === 'PENDING') ? (
              <PendingApprovalScreen onOpenAuthModal={() => setIsAuthModalOpen(true)} />
            ) : (
              <ErrorBoundary onNavigateHome={() => setActiveTab('dashboard')}>
                <div key={activeTab} className="w-full">
                {activeTab === 'dashboard' && (
                  currentUser.role === 'ADMIN' ? (
                    <AdminDashboard
                      onNavigate={setActiveTab}
                      onOpenCheckin={() => setIsQuickCheckinOpen(true)}
                      onOpenDailyAttendance={() => setIsDailyAttendanceOpen(true)}
                    />
                  ) : currentUser.role === 'PROFESSOR' ? (
                    <TeacherDashboard
                      onNavigate={setActiveTab}
                      onOpenCheckin={() => setIsQuickCheckinOpen(true)}
                    />
                  ) : (
                    <StudentDashboard
                      onNavigate={setActiveTab}
                      onOpenPixModal={handleOpenPixForId}
                      onOpenEditModal={handleOpenEditStudent}
                      onOpenCheckin={() => setIsQuickCheckinOpen(true)}
                    />
                  )
                )}

                {activeTab === 'students' && (
                  <StudentList
                    onOpenAddModal={() => setIsAddStudentOpen(true)}
                    onOpenEditModal={handleOpenEditStudent}
                    onOpenGraduationModal={handleOpenGraduation}
                    onOpenCardModal={(st) => {
                      setSelectedStudentCard(st);
                      setActiveTab('card');
                    }}
                  />
                )}

                {activeTab === 'attendance' && (
                  currentUser.role === 'ALUNO' ? (
                    <StudentDashboard
                      onNavigate={setActiveTab}
                      onOpenPixModal={handleOpenPixForId}
                      onOpenEditModal={handleOpenEditStudent}
                      onOpenCheckin={() => setIsQuickCheckinOpen(true)}
                    />
                  ) : (
                    <AttendanceManager
                      onOpenCheckin={() => setIsQuickCheckinOpen(true)}
                    />
                  )
                )}

                {activeTab === 'academies' && (
                  <AcademyLinkView onNavigateHome={() => setActiveTab('dashboard')} />
                )}

                {activeTab === 'students-dashboard' && (
                  <AdminStudentDashboardView
                    onNavigate={setActiveTab}
                    onOpenPixModal={(p) => {
                      if (typeof p === 'string') {
                        handleOpenPixForId(p);
                      } else {
                        setPixModalPayment(p);
                      }
                    }}
                  />
                )}

                {activeTab === 'teachers' && <TeacherManager />}

                {activeTab === 'classes' && <ClassManager />}

                {activeTab === 'gallery' && <TrainingGalleryView />}

                {activeTab === 'challenges' && (
                  <RollChallengeBoard
                    onNavigateToTimer={() => setActiveTab('timer')}
                  />
                )}

                {activeTab === 'card' && (
                  <div className="py-4">
                    <DigitalMembershipCard
                      student={selectedStudentCard || currentStudent}
                      onOpenEditModal={() => currentStudent && handleOpenEditStudent(currentStudent)}
                      onOpenCheckin={() => setIsQuickCheckinOpen(true)}
                    />
                  </div>
                )}

                {activeTab === 'journal' && <StudentTrainingJournal />}

                {activeTab === 'graduations' && <GraduationHistoryView />}

                {activeTab === 'weekly-focus' && <WeeklyFocusPositionsView />}

                {activeTab === 'observations' && <TeacherObservationsView />}

                {activeTab === 'ranking' && <RankingBoard />}

                {activeTab === 'timer' && (currentUser.role === 'ADMIN' || currentUser.role === 'PROFESSOR') && (
                  <MatTimer />
                )}

                {activeTab === 'reports' && <ReportsView />}

                {activeTab === 'settings' && <AcademySettings />}
              </div>
            </ErrorBoundary>
            )}
          </main>
        </div>
      </div>

      {/* Global Interactive Modals */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      <QRCodeCheckinModal
        isOpen={isQuickCheckinOpen}
        onClose={() => setIsQuickCheckinOpen(false)}
      />

      <DailyAttendanceModal
        isOpen={isDailyAttendanceOpen}
        onClose={() => setIsDailyAttendanceOpen(false)}
      />

      <AddStudentModal
        isOpen={isAddStudentOpen}
        onClose={() => setIsAddStudentOpen(false)}
      />

      <EditStudentModal
        isOpen={isEditStudentOpen}
        student={editingStudent}
        onClose={() => {
          setIsEditStudentOpen(false);
          setEditingStudent(null);
        }}
      />

      <GraduationModal
        isOpen={isGraduationOpen}
        onClose={() => setIsGraduationOpen(false)}
        studentToGraduate={studentForGraduation}
      />

      <PixPaymentModal
        isOpen={Boolean(pixModalPayment)}
        payment={pixModalPayment}
        onClose={() => setPixModalPayment(null)}
      />

      {/* Global In-App Floating Toast Notification */}
      <InAppToastNotification />

      {/* Mobile Bottom Tab Bar */}
      <BottomTabBar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenSidebar={() => setIsSidebarOpen(true)}
        onOpenQuickScan={() => setIsQuickCheckinOpen(true)}
      />

      {/* PWA & Mobile Auto-Updater */}
      <PWAUpdateManager />
    </div>
  );
}

export default function App() {
  return (
    <DataProvider>
      <AuthProvider>
        <ErrorBoundary>
          <MainApp />
        </ErrorBoundary>
      </AuthProvider>
    </DataProvider>
  );
}
