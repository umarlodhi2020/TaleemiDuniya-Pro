const fs = require('fs');

// We know the file locally was saved as UTF-8 but contains broken unicode characters.
// We'll replace the specific corrupted sequences found in the file with the proper Emoji.
let content = fs.readFileSync('server.js', 'utf8');

const replacements = {
  // Common corruptions found in the logs
  'ðŸ «': '🏫',
  'ðŸŽ“': '🎓',
  '1ï¸âƒ£': '1️⃣',
  '2ï¸âƒ£': '2️⃣',
  '3ï¸âƒ£': '3️⃣',
  '4ï¸âƒ£': '4️⃣',
  '5ï¸âƒ£': '5️⃣',
  '6ï¸âƒ£': '6️⃣',
  '7ï¸âƒ£': '7️⃣',
  'ðŸ’¡': '💡',
  'ðŸ“«': '📬',
  '🛡️ï¸ ': '🛡️',
  
  // From task-886 logs
  '1ï¸ âƒ£': '1️⃣',
  '2ï¸ âƒ£': '2️⃣',
  '3ï¸ âƒ£': '3️⃣',
  '4ï¸ âƒ£': '4️⃣',
  '5ï¸ âƒ£': '5️⃣',
  '6ï¸ âƒ£': '6️⃣',
  '7ï¸ âƒ£': '7️⃣',
  'ðŸ›¡ï¸ ': '🛡️',
  'ðŸ”‘': '🔑',
  'ðŸ”’': '🔒',
  'ðŸ‘‡': '👇',
  'ðŸ“‹': '📋',
  'ðŸ‘¤': '👤',
  'ðŸ’°': '💰',
  'â„¹ï¸ ': 'ℹ️',
  'ðŸ”™': '🔙',
  'ðŸ“…': '📅',
  'âœ…': '✅',
  'ðŸ“š': '📚',
  'ðŸ“ ': '📝',
  'ðŸ“Š': '📊',
  'ðŸ †': '🏆',
  'ðŸ—“ï¸ ': '🗓️',
  'ðŸ—“': '🗓️',
  'ðŸŒŸ': '🌟',
  'ðŸ•’': '🕒',
  'ðŸ“ž': '📞',
  'ðŸ“±': '📱',
  'ðŸ”´': '🔴',
  'ðŸ”„': '🔄',
  'ðŸ’¬': '💬',
  'ðŸ¤–': '🤖',
  'ðŸ”¢': '🔢',
  'ðŸ‘¨â€ ðŸ‘¦': '👨‍👦',
  'ðŸŽ‰': '🎉',
  'ðŸ‘‰': '👉',
  'ðŸ“„': '📄',
  'ðŸ”—': '🔗',
  'ðŸŸ¢': '🟢',
  'ðŸš€': '🚀',
  'âš ï¸ ': '⚠️',
  'ðŸ‘©â€ ðŸ‘§': '👩‍👧',
  'ðŸ“¦': '📦',
  'ðŸ’»': '💻',
  'âœ‰ï¸ ': '✉️'
};

for (const [mojibake, emoji] of Object.entries(replacements)) {
  // Use split/join to replace all occurrences without regex to avoid escaping issues
  content = content.split(mojibake).join(emoji);
}

fs.writeFileSync('server.js', content, 'utf8');
console.log('Fixed ALL Mojibake in server.js');
