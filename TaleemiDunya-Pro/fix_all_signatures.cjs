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
let found = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  // FeeRecord inline styles
  if (content.includes('style=\"height:35px;') || content.includes('style=\"height: 35px;') || content.includes('height:35px;')) {
    content = content.replace(/height:\s*35px/g, 'height:80px');
    changed = true;
  }
  
  if (content.includes('height:31px;')) {
    content = content.replace(/height:31px/g, 'height:80px');
    changed = true;
  }

  // IdCardRenderers / StaffCardRenderer / StudentIdCards
  // In StaffCardRenderer it might be <img src={stampImage} alt=\"Principal Signature\" className=\"h-8 object-contain ...\" />
  // Let's replace any img with alt containing 'Principal' or 'Teacher' or 'Signature'
  const regex = /<img\s+[^>]*alt=\"[^\"]*(Principal|Teacher|Signature)[^\"]*\"[^>]*className=\"([^\"]+)\"[^>]*\/>/gi;
  content = content.replace(regex, (match) => {
    if (match.includes('mix-blend-multiply')) { // This means it's a signature, usually
       let newMatch = match.replace(/h-\d+/g, 'h-24').replace(/max-w-\[[^\]]+\]/g, 'max-w-[200px]').replace(/scale-\d+/g, 'scale-125 origin-bottom');
       if (newMatch !== match) changed = true;
       return newMatch;
    }
    return match;
  });

  // Specifically for IdCardRenderers and StaffCardRenderer which use h-8 or h-10 for stampImage
  const regex2 = /className=\"([^"]*h-\d+[^"]*)\"[^>]*\s+src=\{stampImage\}/gi;
  content = content.replace(regex2, (match, className) => {
       let newMatch = match.replace(/h-\d+/g, 'h-24').replace(/w-\d+/g, 'w-auto max-w-[150px]');
       if (newMatch !== match) changed = true;
       return newMatch;
  });

  const regex3 = /<img[^>]+src=\{stampImage\}[^>]+className=\"([^\"]+)\"[^>]*\/>/gi;
  content = content.replace(regex3, (match, className) => {
       let newMatch = match.replace(/h-\d+/g, 'h-16').replace(/w-\d+/g, 'w-auto max-w-[150px]');
       // wait, h-16 is 64px, maybe h-20
       newMatch = match.replace(/h-\d+/g, 'h-20');
       if (newMatch !== match) changed = true;
       return newMatch;
  });


  if (changed) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Updated', file);
    found++;
  }
});

console.log('Total files updated:', found);
