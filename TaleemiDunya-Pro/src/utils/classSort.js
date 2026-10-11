export const CLASS_ORDER = [
  'play group', 'playgroup', 'pg',
  'nursery', 'nursary',
  'kg', 'k.g', 'k.g.', 'kindergarten',
  'prep', 'preparatory',
  '1', '1st', 'one', 'class 1', 'class 1st',
  '2', '2nd', 'two', 'class 2', 'class 2nd',
  '3', '3rd', 'three', 'class 3', 'class 3rd',
  '4', '4th', 'four', 'class 4', 'class 4th',
  '5', '5th', 'five', 'class 5', 'class 5th',
  '6', '6th', 'six', 'class 6', 'class 6th',
  '7', '7th', 'seven', 'class 7', 'class 7th',
  '8', '8th', 'eight', 'class 8', 'class 8th',
  '9', '9th', 'nine', 'class 9', 'class 9th',
  '10', '10th', 'ten', 'class 10', 'class 10th',
  '11', '11th', 'first year',
  '12', '12th', 'second year'
];

export const sortClasses = (classesArray) => {
  return [...classesArray].sort((a, b) => {
    const aLower = String(a).toLowerCase().trim();
    const bLower = String(b).toLowerCase().trim();
    
    let aIndex = CLASS_ORDER.findIndex(cls => cls === aLower);
    let bIndex = CLASS_ORDER.findIndex(cls => cls === bLower);

    // If both not found in order array, sort alphabetically
    if (aIndex === -1 && bIndex === -1) {
      return aLower.localeCompare(bLower);
    }
    // Put unknown classes at the end
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    
    return aIndex - bIndex;
  });
};
