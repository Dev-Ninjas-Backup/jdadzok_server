-- Training / course marketplace with cohorts and completion tracking
CREATE TYPE "TrainingCourseStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
CREATE TYPE "TrainingCohortStatus" AS ENUM ('OPEN', 'FULL', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
CREATE TYPE "TrainingEnrollmentStatus" AS ENUM ('PENDING', 'ENROLLED', 'COMPLETED', 'WITHDRAWN', 'CANCELLED');

CREATE TABLE "training_courses" (
    "id" TEXT NOT NULL,
    "instructorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "skills" TEXT[],
    "price" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" "TrainingCourseStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "training_courses_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "training_cohorts" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "title" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "capacity" INTEGER NOT NULL,
    "enrolledCount" INTEGER NOT NULL DEFAULT 0,
    "status" "TrainingCohortStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "training_cohorts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "training_enrollments" (
    "id" TEXT NOT NULL,
    "cohortId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "status" "TrainingEnrollmentStatus" NOT NULL DEFAULT 'PENDING',
    "pricePaid" DOUBLE PRECISION,
    "enrolledAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "training_enrollments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "training_courses_instructorId_idx" ON "training_courses"("instructorId");
CREATE INDEX "training_courses_status_idx" ON "training_courses"("status");
CREATE INDEX "training_courses_createdAt_idx" ON "training_courses"("createdAt");

CREATE INDEX "training_cohorts_courseId_idx" ON "training_cohorts"("courseId");
CREATE INDEX "training_cohorts_status_idx" ON "training_cohorts"("status");
CREATE INDEX "training_cohorts_startsAt_idx" ON "training_cohorts"("startsAt");

CREATE INDEX "training_enrollments_studentId_idx" ON "training_enrollments"("studentId");
CREATE INDEX "training_enrollments_status_idx" ON "training_enrollments"("status");

CREATE UNIQUE INDEX "training_enrollments_cohortId_studentId_key" ON "training_enrollments"("cohortId", "studentId");

ALTER TABLE "training_courses" ADD CONSTRAINT "training_courses_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "training_cohorts" ADD CONSTRAINT "training_cohorts_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "training_courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "training_enrollments" ADD CONSTRAINT "training_enrollments_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "training_cohorts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "training_enrollments" ADD CONSTRAINT "training_enrollments_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
