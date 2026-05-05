const crypto = require("crypto");

function fixedUuid(seed) {
  const hex = crypto.createHash("sha256").update(seed).digest("hex").slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

const campusNames = ["Alpha", "Beta", "Gamma", "Delta", "Epsilon", "Zeta", "Eta", "Theta"];

const campuses = campusNames.map((name) => ({
  id: fixedUuid(`campus-${name.toLowerCase()}`),
  code: name.toLowerCase(),
  name: `Campus ${name}`,
  location: `${name} Region`
}));

const faculties = [
  { name: "Faculty of Science & Technology", campusCode: "alpha" },
  { name: "Faculty of Arts & Humanities", campusCode: "alpha" },
  { name: "Faculty of Business", campusCode: "beta" },
  { name: "Faculty of Law", campusCode: "beta" },
  { name: "Faculty of Medicine", campusCode: "gamma" },
  { name: "Faculty of Engineering", campusCode: "gamma" },
  { name: "Faculty of Education", campusCode: "delta" },
  { name: "Faculty of Agriculture", campusCode: "epsilon" },
  { name: "Faculty of Social Sciences", campusCode: "zeta" },
  { name: "Faculty of Computing", campusCode: "eta" },
  { name: "Faculty of Architecture", campusCode: "theta" }
].map((faculty, index) => ({
  id: fixedUuid(`faculty-${index + 1}-${faculty.name.toLowerCase()}`),
  ...faculty
}));

const departments = faculties.flatMap((faculty) =>
  Array.from({ length: 5 }).map((_, index) => ({
    id: fixedUuid(`dept-${faculty.id}-${index + 1}`),
    name: `${faculty.name.replace("Faculty of ", "")} Department ${index + 1}`,
    facultyId: faculty.id,
    campusCode: faculty.campusCode
  }))
);

const hallZones = campuses.flatMap((campus) => [
  {
    id: fixedUuid(`hall-zone-${campus.code}-a`),
    name: `${campus.name} Zone A`,
    campusCode: campus.code
  },
  {
    id: fixedUuid(`hall-zone-${campus.code}-b`),
    name: `${campus.name} Zone B`,
    campusCode: campus.code
  }
]);

const halls = campuses.flatMap((campus) =>
  Array.from({ length: 10 }).map((_, index) => ({
    id: fixedUuid(`hall-${campus.code}-${index + 1}`),
    name: `Hall ${index + 1}`,
    hallNumber: index + 1,
    campusCode: campus.code,
    hallZoneKey: index < 5 ? "a" : "b"
  }))
);

const categories = [
  { name: "Accommodation", jurisdiction_type: "hall", min_urgency: null },
  { name: "Student Welfare", jurisdiction_type: "hall", min_urgency: null },
  { name: "Security & Safety (Hall)", jurisdiction_type: "hall", min_urgency: null },
  { name: "Academic Grievance", jurisdiction_type: "department", min_urgency: null },
  { name: "Coursework & Deadlines", jurisdiction_type: "department", min_urgency: null },
  { name: "Timetabling & Scheduling", jurisdiction_type: "department", min_urgency: null },
  { name: "Staff Conduct", jurisdiction_type: "department", min_urgency: null },
  { name: "Infrastructure & Facilities", jurisdiction_type: "campus", min_urgency: null },
  { name: "Library & Resources", jurisdiction_type: "campus", min_urgency: null },
  { name: "Transport & Access", jurisdiction_type: "campus", min_urgency: null },
  { name: "Security & Safety (Campus)", jurisdiction_type: "campus", min_urgency: null },
  { name: "Health Services", jurisdiction_type: "campus", min_urgency: null },
  { name: "Financial & Fees", jurisdiction_type: "university", min_urgency: null },
  { name: "Registration & Records", jurisdiction_type: "university", min_urgency: null },
  { name: "Policy & Governance", jurisdiction_type: "university", min_urgency: null },
  { name: "Sexual Harassment / Discrimination", jurisdiction_type: "university", min_urgency: "urgent" }
].map((category) => ({
  id: fixedUuid(`category-${category.name.toLowerCase()}`),
  ...category
}));

module.exports = {
  campuses,
  faculties,
  departments,
  hallZones,
  halls,
  categories
};
