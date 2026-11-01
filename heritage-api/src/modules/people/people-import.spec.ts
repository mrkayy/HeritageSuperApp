import { describe, expect, it } from 'vitest';
import {
  evaluateImportRow,
  parseCsvRecords,
  parseDayMonth,
  parseGender,
  parseMaritalStatus,
} from './people.service.js';

// Header + rows exactly as exported from the church member data form (tab-separated paste).
const MEMBER_FORM_TSV = [
  'First Name\tSurname\tEmail Address\tHome Address (Full address please)\tGender\tDate of Birth (Day and Month)\tMarital Status\tIf Married, wedding anniversary date (Day and Month)\tJob/Occupation\tPhone Number\tPrimary Team ',
  'Naomi\tEarnest-Suru \tnaomidickson19954real@gmail.com\tPlot 7, Taunu Adjere Street, Compact Mini Estate, Egbeda Lagos.\tFemale\t7-November\tMarried\t6-November\tSoftware Quality Assurance Engineer \t\t',
  'Olumide\tBankole\tbankoleolumide05@gmail.com\t2Ejoyin-Atobatele street, Idimu Lagos\tMale\t17-January\tMarried\t7-May\tFarmer/Gaffer\t\t',
].join('\n');

describe('member data form import parsing', () => {
  it('maps every member-form column, including descriptive headers', () => {
    const rows = parseCsvRecords(MEMBER_FORM_TSV);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      first_name: 'Naomi',
      last_name: 'Earnest-Suru',
      email: 'naomidickson19954real@gmail.com',
      address: 'Plot 7, Taunu Adjere Street, Compact Mini Estate, Egbeda Lagos.',
      gender: 'Female',
      birth_date: '7-November',
      marital_status: 'Married',
      anniversary_date: '6-November',
      occupation: 'Software Quality Assurance Engineer',
      phone: '',
      primary_team: '',
    });
    expect(rows[1]).toMatchObject({ occupation: 'Farmer/Gaffer', birth_date: '17-January', anniversary_date: '7-May' });
  });

  it('parses year-less day+month values', () => {
    expect(parseDayMonth('7-November')).toEqual({ month: 11, day: 7 });
    expect(parseDayMonth('17 Jan')).toEqual({ month: 1, day: 17 });
    expect(parseDayMonth('May 7th')).toEqual({ month: 5, day: 7 });
    expect(parseDayMonth('29-Feb')).toEqual({ month: 2, day: 29 });
    expect(parseDayMonth('07/11')).toEqual({ month: 11, day: 7 });
    expect(parseDayMonth('')).toBeUndefined();
    expect(parseDayMonth('31-April')).toBeNull();
    expect(parseDayMonth('sometime')).toBeNull();
  });

  it('normalizes gender and marital status', () => {
    expect(parseGender('Female')).toBe('FEMALE');
    expect(parseGender(' m ')).toBe('MALE');
    expect(parseGender('')).toBeUndefined();
    expect(parseGender('other')).toBeNull();
    expect(parseMaritalStatus('Married')).toBe('MARRIED');
    expect(parseMaritalStatus('widow')).toBe('WIDOWED');
    expect(parseMaritalStatus('')).toBeUndefined();
    expect(parseMaritalStatus('complicated')).toBeNull();
  });

  it('defaults membership status to WORK_FORCE for membership team uploads and parses dates', () => {
    const parsedRows = parseCsvRecords(MEMBER_FORM_TSV);
    const row = parsedRows[0];
    const evaluated = evaluateImportRow(1, row, [], parsedRows);

    // MembershipStatus defaults to WORK_FORCE
    expect(evaluated.membershipStatus).toBe('WORK_FORCE');
    // Year-less birth and anniversary date mapped to months and days
    expect(evaluated.birthMonth).toBe(11);
    expect(evaluated.birthDay).toBe(7);
    expect(evaluated.anniversaryMonth).toBe(11);
    expect(evaluated.anniversaryDay).toBe(6);
    expect(evaluated.gender).toBe('FEMALE');
    expect(evaluated.maritalStatus).toBe('MARRIED');
    expect(evaluated.errors).toHaveLength(0);
    expect(evaluated.state).toBe('READY');
  });
});

describe('duplicate detection and update selection', () => {
  it('flags existing person match and allows UPDATE_EXISTING decision', () => {
    const parsedRows = parseCsvRecords(MEMBER_FORM_TSV);
    const existing = [
      {
        id: '11111111-1111-1111-1111-111111111111',
        firstName: 'Naomi',
        lastName: 'Earnest',
        phone: null,
        email: 'naomidickson19954real@gmail.com',
        isVerified: true,
      },
    ];

    // Initial evaluation detects duplicate match
    const initial = evaluateImportRow(1, parsedRows[0], existing, parsedRows);
    expect(initial.matchedPersonId).toBe('11111111-1111-1111-1111-111111111111');
    expect(initial.state).toBe('REVIEW_REQUIRED');

    // User chooses to update existing member
    const updated = evaluateImportRow(1, parsedRows[0], existing, parsedRows, true, [], 'UPDATE_EXISTING');
    expect(updated.action).toBe('UPDATE_EXISTING');
    expect(updated.state).toBe('READY');

    // User chooses to skip duplicate
    const skipped = evaluateImportRow(1, parsedRows[0], existing, parsedRows, true, [], 'SKIP');
    expect(skipped.action).toBe('SKIP');
    expect(skipped.state).toBe('READY');
  });

  it('sanitizes duplicate matches by default to UPDATE_EXISTING with READY state for unverified profiles', () => {
    const parsedRows = parseCsvRecords(MEMBER_FORM_TSV);
    const unverifiedExisting = [
      {
        id: '22222222-2222-2222-2222-222222222222',
        firstName: 'Naomi',
        lastName: 'Earnest',
        phone: null,
        email: 'naomidickson19954real@gmail.com',
        isVerified: false,
      },
    ];

    const res = evaluateImportRow(1, parsedRows[0], unverifiedExisting, parsedRows);
    expect(res.matchedPersonId).toBe('22222222-2222-2222-2222-222222222222');
    expect(res.action).toBe('UPDATE_EXISTING');
    expect(res.state).toBe('READY');
    expect(res.errors).toHaveLength(0);
  });

  it('sanitizes intra-batch duplicate contacts by defaulting subsequent rows to SKIP', () => {
    const duplicateBatch = [
      { ...parseCsvRecords(MEMBER_FORM_TSV)[0] },
      { ...parseCsvRecords(MEMBER_FORM_TSV)[0], first_name: 'NaomiCopy' },
    ];

    const row1 = evaluateImportRow(1, duplicateBatch[0], [], duplicateBatch);
    const row2 = evaluateImportRow(2, duplicateBatch[1], [], duplicateBatch);

    expect(row1.action).toBe('CREATE');
    expect(row1.state).toBe('READY');
    expect(row2.action).toBe('SKIP');
    expect(row2.state).toBe('READY');
    expect(row2.errors).toHaveLength(0);
  });

  it('sanitizes non-critical fields (gender, marital status, unknown team) to null without errors', () => {
    const raw = {
      first_name: 'Tola',
      last_name: 'Adebayo',
      email: 'tola@example.com',
      phone: '+2348039998877',
      gender: 'unknown-gender',
      marital_status: 'complicated',
      primary_team: 'Nonexistent Team',
      birth_date: 'invalid-date',
      anniversary_date: '',
      address: '',
      membership_status: '',
      occupation: '',
      birth_month: '',
      birth_day: '',
      anniversary_month: '',
      anniversary_day: '',
    };

    const res = evaluateImportRow(1, raw, [], [raw]);
    expect(res.errors).toHaveLength(0); // Only critical errors would be recorded
    expect(res.state).toBe('READY');
    expect(res.gender).toBeNull();
    expect(res.maritalStatus).toBeNull();
    expect(res.primaryTeamId).toBeNull();
    expect(res.birthMonth).toBeNull();
  });

  it('re-evaluates row when invalid error is edited and fixed', () => {
    const badRow = {
      first_name: 'John',
      last_name: 'Doe',
      email: 'invalid-email-address',
      phone: '',
      address: '',
      membership_status: '',
      birth_month: '',
      birth_day: '',
      anniversary_month: '',
      anniversary_day: '',
      birth_date: '',
      anniversary_date: '',
      gender: '',
      marital_status: '',
      occupation: '',
      primary_team: '',
    };

    const initial = evaluateImportRow(1, badRow, [], [badRow]);
    expect(initial.state).toBe('INVALID');
    expect(initial.errors).toContain('Invalid email address "invalid-email-address"');

    // Now simulate user fixing the email cell
    const fixedRow = { ...badRow, email: 'john.doe@example.com' };
    const fixed = evaluateImportRow(1, fixedRow, [], [fixedRow]);
    expect(fixed.state).toBe('READY');
    expect(fixed.errors).toHaveLength(0);
    expect(fixed.membershipStatus).toBe('WORK_FORCE');
  });
});

describe('visitor data form import parsing', () => {
  const VISITOR_CSV = [
    'First Name,Surname,Phone Number,Email Address,Home Address,Date of Birth,Prayer Request / Notes,Invited By',
    'Samuel,Ogunleye,+2348021234567,samuel.o@example.com,14 Lekki Phase 1,12-August,Please pray for healing and peace,Sister Deborah',
    'Grace,Adeleke,08039876543,grace.a@example.com,,03/15,Safe delivery,Deacon James',
  ].join('\n');

  it('maps visitor columns including prayer request and inviter', () => {
    const rows = parseCsvRecords(VISITOR_CSV);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      first_name: 'Samuel',
      last_name: 'Ogunleye',
      phone: '+2348021234567',
      email: 'samuel.o@example.com',
      address: '14 Lekki Phase 1',
      birth_date: '12-August',
      prayer_request: 'Please pray for healing and peace',
      inviter: 'Sister Deborah',
    });
    expect(rows[1]).toMatchObject({
      first_name: 'Grace',
      last_name: 'Adeleke',
      phone: '08039876543',
      prayer_request: 'Safe delivery',
      inviter: 'Deacon James',
    });
  });

  it('evaluates visitor rows with default status FIRST_TIMER', () => {
    const parsedRows = parseCsvRecords(VISITOR_CSV);
    const row = parsedRows[0];
    const evaluated = evaluateImportRow(1, row, [], parsedRows, false, [], undefined, 'FIRST_TIMER');

    expect(evaluated.membershipStatus).toBe('FIRST_TIMER');
    expect(evaluated.prayerRequest).toBe('Please pray for healing and peace');
    expect(evaluated.inviter).toBe('Sister Deborah');
    expect(evaluated.birthMonth).toBe(8);
    expect(evaluated.birthDay).toBe(12);
    expect(evaluated.errors).toHaveLength(0);
    expect(evaluated.state).toBe('READY');
  });
});
