import { relations } from 'drizzle-orm';
import { integer, boolean, pgTable, serial, text, timestamp, doublePrecision } from 'drizzle-orm/pg-core';

export const academies = pgTable('academies', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  fantasyName: text('fantasy_name').notNull(),
  cnpj: text('cnpj'),
  headCoachName: text('head_coach_name'),
  headCoachBelt: text('head_coach_belt').default('PRETA'),
  phone: text('phone'),
  email: text('email'),
  address: text('address'),
  logoUrl: text('logo_url'),
  pixKey: text('pix_key'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  name: text('name').notNull(),
  email: text('email').notNull(),
  role: text('role').notNull().default('ALUNO'), // 'ADMIN' | 'PROFESSOR' | 'ALUNO'
  avatarUrl: text('avatar_url'),
  studentId: text('student_id'),
  phone: text('phone'),
  approvalStatus: text('approval_status').default('APPROVED'), // 'APPROVED' | 'PENDING' | 'REJECTED'
  password: text('password').default('123'),
  isActivated: boolean('is_activated').default(true),
  academyId: integer('academy_id').references(() => academies.id),
  createdAt: timestamp('created_at').defaultNow(),
});

export const students = pgTable('students', {
  id: serial('id').primaryKey(),
  uid: text('uid').unique(), // Firebase Auth UID if linked
  registrationNumber: text('registration_number').notNull().unique(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  phone: text('phone'),
  cpf: text('cpf'),
  birthDate: text('birth_date'),
  photoUrl: text('photo_url'),
  belt: text('belt').notNull().default('BRANCA'),
  stripes: integer('stripes').notNull().default(0),
  startDate: text('start_date'),
  totalClassesAttended: integer('total_classes_attended').notNull().default(0),
  classesSinceLastGraduation: integer('classes_since_last_graduation').notNull().default(0),
  weightCategory: text('weight_category').default('MÉDIO'),
  ageCategory: text('age_category').default('ADULTO'),
  active: boolean('active').notNull().default(true),
  notes: text('notes'),
  emergencyContact: text('emergency_contact'),
  planName: text('plan_name').default('Mensal Padrão'),
  planPrice: doublePrecision('plan_price').default(150.0),
  paymentDueDateDay: integer('payment_due_date_day').default(10),
  paymentStatus: text('payment_status').default('PAGO'),
  lastPaymentDate: text('last_payment_date'),
  qrCodeToken: text('qr_code_token').notNull(),
  approvalStatus: text('approval_status').default('APPROVED'),
  academyId: integer('academy_id').references(() => academies.id),
  createdAt: timestamp('created_at').defaultNow(),
});

export const teachers = pgTable('teachers', {
  id: serial('id').primaryKey(),
  uid: text('uid').unique(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  phone: text('phone'),
  belt: text('belt').notNull().default('PRETA'),
  degrees: integer('degrees').notNull().default(0),
  specialty: text('specialty').default('BJJ Fundamental e Avançado'),
  cref: text('cref'),
  photoUrl: text('photo_url'),
  bio: text('bio'),
  active: boolean('active').notNull().default(true),
  startDate: text('start_date'),
  academyId: integer('academy_id').references(() => academies.id),
  createdAt: timestamp('created_at').defaultNow(),
});

export const classes = pgTable('classes', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  professorId: text('professor_id').notNull(),
  professorName: text('professor_name').notNull(),
  daysOfWeek: text('days_of_week').notNull(), // JSON string array e.g. "[1,3,5]"
  time: text('time').notNull(),
  durationMinutes: integer('duration_minutes').notNull().default(90),
  category: text('category').notNull().default('FUNDAMENTAL'),
  maxCapacity: integer('max_capacity').notNull().default(30),
  active: boolean('active').notNull().default(true),
  description: text('description'),
  academyId: integer('academy_id').references(() => academies.id),
  createdAt: timestamp('created_at').defaultNow(),
});

export const attendances = pgTable('attendances', {
  id: serial('id').primaryKey(),
  studentId: text('student_id').notNull(),
  studentName: text('student_name').notNull(),
  classId: text('class_id').notNull(),
  className: text('class_name').notNull(),
  date: text('date').notNull(), // YYYY-MM-DD
  timestamp: text('timestamp').notNull(),
  method: text('method').notNull().default('QR_CODE_STUDENT'), // 'MANUAL' | 'QR_CODE_STUDENT' | 'QR_CODE_TEACHER'
  verifiedBy: text('verified_by'),
  academyId: integer('academy_id').references(() => academies.id),
  createdAt: timestamp('created_at').defaultNow(),
});

export const payments = pgTable('payments', {
  id: serial('id').primaryKey(),
  studentId: text('student_id').notNull(),
  studentName: text('student_name').notNull(),
  amount: doublePrecision('amount').notNull(),
  dueDate: text('due_date').notNull(), // YYYY-MM-DD
  paymentDate: text('payment_date'), // YYYY-MM-DD
  status: text('status').notNull().default('PENDENTE'), // 'PAGO' | 'PENDENTE' | 'ATRASADO'
  paymentMethod: text('payment_method').default('PIX'),
  referenceMonth: text('reference_month').notNull(), // "07/2026"
  receiptUrl: text('receipt_url'),
  pixCode: text('pix_code'),
  academyId: integer('academy_id').references(() => academies.id),
  createdAt: timestamp('created_at').defaultNow(),
});

export const beltRequests = pgTable('belt_requests', {
  id: serial('id').primaryKey(),
  studentId: text('student_id').notNull(),
  studentName: text('student_name').notNull(),
  currentBelt: text('current_belt').notNull(),
  currentStripes: integer('current_stripes').notNull().default(0),
  requestedBelt: text('requested_belt').notNull(),
  requestedStripes: integer('requested_stripes').notNull().default(0),
  requestDate: text('request_date').notNull(),
  notes: text('notes'),
  status: text('status').notNull().default('PENDING'), // 'PENDING' | 'APPROVED' | 'REJECTED'
  reviewedBy: text('reviewed_by'),
  reviewedAt: text('reviewed_at'),
  academyId: integer('academy_id').references(() => academies.id),
  createdAt: timestamp('created_at').defaultNow(),
});

export const trainingLogs = pgTable('training_logs', {
  id: serial('id').primaryKey(),
  studentId: text('student_id').notNull(),
  date: text('date').notNull(),
  durationMinutes: integer('duration_minutes').notNull().default(60),
  techniquesLearned: text('techniques_learned').notNull(), // JSON string array
  roundsCount: integer('rounds_count').notNull().default(4),
  notes: text('notes'),
  moodRating: integer('mood_rating').notNull().default(5),
  academyId: integer('academy_id').references(() => academies.id),
  createdAt: timestamp('created_at').defaultNow(),
});

export const teacherObservations = pgTable('teacher_observations', {
  id: serial('id').primaryKey(),
  studentId: text('student_id').notNull(),
  studentName: text('student_name'),
  teacherId: text('teacher_id').notNull(),
  teacherName: text('teacher_name').notNull(),
  date: text('date').notNull(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  category: text('category').notNull().default('GERAL'),
  academyId: integer('academy_id').references(() => academies.id),
  createdAt: timestamp('created_at').defaultNow(),
});

// Define relations
export const academiesRelations = relations(academies, ({ many }) => ({
  users: many(users),
  students: many(students),
  teachers: many(teachers),
  classes: many(classes),
  attendances: many(attendances),
  payments: many(payments),
  beltRequests: many(beltRequests),
  trainingLogs: many(trainingLogs),
  teacherObservations: many(teacherObservations),
}));

export const usersRelations = relations(users, ({ one }) => ({
  academy: one(academies, {
    fields: [users.academyId],
    references: [academies.id],
  }),
}));
