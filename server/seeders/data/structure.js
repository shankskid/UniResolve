const crypto = require("crypto");

function fixedUuid(seed) {
  const raw = crypto.createHash("sha256").update(seed).digest("hex").slice(0, 32).split("");
  raw[12] = "4";
  raw[16] = "a";
  const hex = raw.join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

const departmentNames = [
  "Agricultural Economics",
  "Food Science Nutrition and Technology",
  "Land Resource Management and Agricultural Technology",
  "Plant Science and Crop Protection",
  "Linguistics and Languages",
  "Philosophy and Religious Studies",
  "Library and Information Science",
  "History and Archeology",
  "Economics and Development Studies",
  "Sociology Social Work and African Women Studies",
  "Political Science and Public Administration",
  "Journalism and Mass Communication",
  "Diplomacy and International Studies",
  "Geography Population and Environmental Studies",
  "Psychology",
  "Architecture",
  "Business Administration",
  "Finance and Accounting",
  "Mechanical Engineering",
  "Civil and Construction Engineering"
];

const departments = departmentNames.map((name) => ({
  id: fixedUuid(`dept-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`),
  name
}));

const halls = Array.from({ length: 40 }).map((_, index) => ({
  id: fixedUuid(`hall-${index + 1}`),
  name: `Hall ${index + 1}`,
  hallNumber: index + 1
}));

const categories = [
  { name: "Accommodation", jurisdiction_type: "hall", min_urgency: null },
  { name: "Water", jurisdiction_type: "hall", min_urgency: null },
  { name: "Electricity", jurisdiction_type: "hall", min_urgency: null },
  { name: "Cleanliness", jurisdiction_type: "hall", min_urgency: null },
  { name: "Security", jurisdiction_type: "hall", min_urgency: null },
  { name: "Repairs & Maintenance", jurisdiction_type: "hall", min_urgency: null },
  { name: "Classroom Facilities", jurisdiction_type: "department", min_urgency: null },
  { name: "Lighting", jurisdiction_type: "department", min_urgency: null },
  { name: "Furniture", jurisdiction_type: "department", min_urgency: null },
  { name: "Department Building Maintenance", jurisdiction_type: "department", min_urgency: null },
  { name: "Equipment", jurisdiction_type: "department", min_urgency: null },
  { name: "Department Services", jurisdiction_type: "department", min_urgency: null }
].map((category) => ({
  id: fixedUuid(`category-${category.name.toLowerCase()}`),
  ...category
}));

module.exports = {
  fixedUuid,
  departments,
  halls,
  categories
};
