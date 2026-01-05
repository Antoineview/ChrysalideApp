export interface Grade {
  code: string;
  type: string;
  name: string;
  semester: number;
  grade: number;
  syncedAt?: number; // Timestamp of when this grade was first synced
}

export interface Syllabus {
  id: number;
  UE: string;
  semester: number;
  name: string;
  code: string;
  minScore: number;
  duration: number;
  period: Period;
  exams: Exam[];
  courseDescription: CourseDescription;
  caption: Caption;
  responsables: Responsable[];
  instructorsValidator: Instructor[];
  instructorsEditors: Instructor[];
  activities: Activity[];
  locations: Location[];
  grade?: number;
  matchedGrades?: (Grade & { weighting: number })[];
}

export interface Period {
  startDate: string;
  endDate: string;
}

export interface Exam {
  id: number;
  index: number; // Component index for grade code construction
  description: Description;
  type: string;
  typeName: string;
  weighting: number;
}

export interface Description {
  fr?: string;
  en?: string;
}

export interface CourseDescription {
  coursPlan: Description;
  expected: Description[];
}

export interface Caption {
  name: string;
  goals: Description;
  program: Description;
}

export interface Responsable {
  uid: number;
  login: string;
  lastName: string;
  firstName: string;
}

export interface Instructor {
  uid: number;
  login: string;
  lastName: string;
  firstName: string;
}

export interface Activity {
  id: number;
  type: string;
  typeName: string;
  duration?: number;
}

export interface Location {
  code: string;
  name: string;
}

export interface UserData {
  parent1?: Parent;
  parent2?: Parent;
  financialGuarantor?: FinancialGuarantor;
  student: Student;
  highSchool?: HighSchool;
}

export interface Parent {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  zipCode: string;
  country: number;
}

export interface FinancialGuarantor {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  zipCode: string;
  country: number;
}

export interface Student {
  login: string;
  schoolMail: string;
  mail: string;
  phone: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  cityOfBirth: string;
  countryOfBirth: string;
  gender: string;
  adress: Address;
  city: string;
  country: string;
  entryYear: number;
}

export interface Address {
  street1: string;
  street2?: string;
}

export interface HighSchool {
  option1?: string;
  option2?: string;
  language1?: string;
  language2?: string;
  examType?: string;
  department?: string;
}
