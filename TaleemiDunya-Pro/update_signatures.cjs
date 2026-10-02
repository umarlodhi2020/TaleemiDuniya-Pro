const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      if (file.endsWith('.jsx')) results.push(file);
    }
  });
  return results;
}

const files = walk('g:/TaleemiDunya-Pro-Main/TaleemiDunya-Pro/src');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  // Replace principal signatures
  const regex1 = /<img\s+src=\{([^}]+)\}\s+alt=\"(Principal|Principal Signature)\"\s+className=\"([^\"]+)\"\s*\/>/g;
  content = content.replace(regex1, (match, src, alt, className) => {
    // Keep mix-blend-multiply, remove h-X, add h-16 max-w-[140px]
    let newClass = className.replace(/h-\d+/g, '').replace(/max-w-\[[^\]]+\]/g, '').trim();
    newClass = 'h-16 max-w-[140px] mix-blend-multiply ' + newClass;
    // avoid duplicate mix-blend-multiply
    newClass = Array.from(new Set(newClass.split(' '))).join(' ');
    changed = true;
    return `<img src={${src}} alt="${alt}" className="${newClass}" />`;
  });

  // Replace teacher signatures
  const regex2 = /<img\s+src=\{([^}]+)\}\s+alt=\"(Class Teacher|Class Teacher Signature)\"\s+className=\"([^\"]+)\"\s*\/>/g;
  content = content.replace(regex2, (match, src, alt, className) => {
    let newClass = className.replace(/h-\d+/g, '').replace(/max-w-\[[^\]]+\]/g, '').trim();
    newClass = 'h-16 max-w-[140px] mix-blend-multiply ' + newClass;
    newClass = Array.from(new Set(newClass.split(' '))).join(' ');
    changed = true;
    return `<img src={${src}} alt="${alt}" className="${newClass}" />`;
  });
  
  // Also fix placeholder divs that were h-6, h-8, h-9, h-10, h-12 where they are siblings
  // We can't do this with a simple regex for the whole file, but let's replace <div className=\"h-10\"></div> to <div className=\"h-16\"></div> if it's related to signature.
  const regex3 = /<div className=\"(h-\d+)\"><\/div>/g;
  content = content.replace(regex3, (match, hClass) => {
    if (['h-6', 'h-8', 'h-9', 'h-10', 'h-12'].includes(hClass)) {
      changed = true;
      return `<div className="h-16"></div>`;
    }
    return match;
  });

  if (changed) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Updated', file);
  }
});
