import * as fs from 'fs/promises';
import * as readline from 'readline';

import { getModel } from './ai/providers';
import {
  deepResearch,
  writeFinalAnswer,
  writeFinalReport,
} from './deep-research';
import { generateFeedback } from './feedback';
import {
  understandRequirement,
  understandRequirementNew,
} from './understand-requirment';

// Helper function for consistent logging
function log(...args: any[]) {
  console.log(...args);
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Helper function to get user input
export function askQuestion(query: string): Promise<string> {
  return new Promise(resolve => {
    rl.question(query, answer => {
      resolve(answer);
    });
  });
}

// run the agent
async function run() {
  console.log('Using model: ', getModel().modelId);

  // Get initial query
  const initialQuery =
    (await askQuestion(
      'What would you like to research? (default food order app) ',
    )) ||
    `Healthcare Management Platform – Requirement Specification
1. Project Overview
The goal is to develop a comprehensive healthcare management platform that streamlines patient care, improves operational efficiency, and ensures regulatory compliance (HIPAA/GDPR). The platform will serve hospitals, clinics, laboratories, pharmacies, and telemedicine providers in a unified ecosystem.
2. Scope
Primary Users: Patients, Doctors, Nurses, Administrators, Lab Technicians, Pharmacists, Insurance Providers.
Coverage: Electronic Health Records (EHR), Appointment Management, Telemedicine, Billing & Insurance, Laboratory Management, Pharmacy Integration, Analytics, and Reporting.
Platforms: Web application (responsive), Native Mobile Apps (iOS & Android), and API layer for third-party integrations.
Compliance: HIPAA, GDPR, FHIR standards for interoperability.
3. Core Modules & Requirements
A. Electronic Health Records (EHR)
Purpose: Centralized repository of patient data for accessible, secure, and accurate medical history.
Key Features:
Patient profiles with demographics, medical history, allergies, and current treatments.
Structured and unstructured data support (progress notes, lab results, imaging reports).
Role-based access control with audit logs.
Real-time synchronization across all care providers.
Integration with wearable devices (IoT) for vitals tracking.
B. Appointment & Scheduling
Purpose: Streamline patient appointment booking and provider schedules.
Key Features:
Online appointment booking with slot availability in real-time.
Intelligent scheduling to optimize doctor/nurse workload.
Automated reminders via SMS/Email/Push notifications.
Walk-in management and priority queuing.
Support for group therapy sessions and multi-provider appointments.
C. Telemedicine
Purpose: Enable virtual consultations to expand access to care.
Key Features:
Secure video consultations with end-to-end encryption.
Screen-sharing for diagnostics and patient education.
Digital prescriptions and notes shared instantly.
Payment gateway integration for teleconsultation fees.
Integrated chatbot for symptom triage before booking.
D. Billing & Insurance
Purpose: Automate billing, claims, and insurance workflows.
Key Features:
Patient invoices with CPT/ICD code mapping.
Multiple payment methods (credit card, UPI, net banking).
Insurance claims submission and tracking.
Pre-authorization and co-payment calculation.
Financial reporting with revenue analytics.
E. Laboratory Management
Purpose: Seamlessly manage diagnostic workflows.
Key Features:
Test ordering directly from EHR.
Automated lab results integration into patient records.
Barcoding for sample tracking and chain of custody.
Alerts for abnormal results.
Integration with third-party lab systems via HL7/FHIR.
F. Pharmacy Management
Purpose: Connect doctors, patients, and pharmacies.
Key Features:
e-Prescriptions transmitted directly to pharmacies.
Inventory tracking, auto-reorder levels, and stock expiry alerts.
Drug interaction alerts and generic alternatives suggestion.
POS integration for in-clinic pharmacies.
G. Patient Portal & Mobile App
Purpose: Empower patients to engage with their care.
Key Features:
Access to medical history, prescriptions, and lab results.
Appointment booking, rescheduling, and payments.
Secure messaging with care providers.
Wellness tracking (exercise, diet, medication adherence).
Patient education materials and video library.
H. Analytics & Reporting
Purpose: Support decision-making and performance tracking.
Key Features:
Clinical dashboards (patient flow, bed occupancy, care outcomes).
Financial dashboards (revenue, outstanding payments).
Quality metrics and compliance reports.
Predictive analytics for patient readmission risk.
I. Security & Compliance
Purpose: Ensure data privacy and regulatory adherence.
Key Features:
Data encryption at rest and in transit.
Audit trails for every data access/edit event.
Role-based access control (RBAC) and MFA.
Automatic logouts and session expiry.
Disaster recovery and secure backup.
4. Non-Functional Requirements
Scalability: Handle 10k+ concurrent users with minimal latency.
Performance: API response time < 200ms for core operations.
Availability: 99.9% uptime with failover architecture.
Interoperability: Support HL7/FHIR for data exchange with external systems.
User Experience: Minimal clicks for routine tasks, responsive design.
5. Success Metrics
Reduced patient wait time by 30%.
Improved doctor utilization by 20%.
Increase in telemedicine adoption by 40%.
95%+ accuracy in billing and claims processing.`;

  // Get breath and depth parameters
  const breadth =
    parseInt(
      await askQuestion(
        'Enter research breadth (recommended 2-10, default 4): ',
      ),
      10,
    ) || 4;
  const depth =
    parseInt(
      await askQuestion('Enter research depth (recommended 1-5, default 2): '),
      10,
    ) || 2;
  const isReport =
    (await askQuestion(
      'Do you want to generate a long report or a specific answer? (report/answer, default answer): ',
    )) === 'report';

  let combinedQuery = initialQuery;
  if (isReport) {
    log(`Creating research plan...`);

    // Collect answers to follow-up questions
  }

  log('\nStarting research...\n');

  // const { insights: learnings, visitedUrls } = await deepResearch({
  //   query: combinedQuery,
  // breadth,
  //   depth,

  // });
  const visitedUrls: any[] = [];
  const learnings = await understandRequirementNew({
    fullRequirement: combinedQuery,
  });

  log(`\n\nLearnings:\n\n${learnings.join('\n')}`);
  log(`\n\nVisited URLs (${visitedUrls.length}):\n\n${visitedUrls.join('\n')}`);
  log('Writing final report...');

  if (isReport) {
    const report = await writeFinalReport({
      prompt: combinedQuery,
      learnings: JSON.stringify(learnings),
      visitedUrls,
    });

    await fs.writeFile('report.md', report, 'utf-8');
    console.log(`\n\nFinal Report:\n\n${report}`);
    console.log('\nReport has been saved to report.md');
  } else {
    const answer = await writeFinalAnswer({
      prompt: combinedQuery,
      learnings: JSON.stringify(learnings),
    });

    await fs.writeFile('answer.md', answer, 'utf-8');
    console.log(`\n\nFinal Answer:\n\n${answer}`);
    console.log('\nAnswer has been saved to answer.md');
  }

  rl.close();
}

run().catch(console.error);
