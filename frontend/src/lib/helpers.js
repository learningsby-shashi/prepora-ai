// Anonymous display name generator
const ANIMALS = ['Tiger','Eagle','Panda','Falcon','Lion','Dolphin','Wolf','Phoenix','Hawk','Cheetah','Otter','Lynx','Owl','Fox','Cobra','Jaguar','Bear','Crane','Raven','Stag'];
export const generateAnonymousName = () => {
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  const num = Math.floor(100 + Math.random() * 900);
  return `${animal}${num}`;
};

// Level system
export const LEVELS = [
  { name: 'Beginner', minXp: 0 },
  { name: 'Explorer', minXp: 500 },
  { name: 'Scholar', minXp: 1500 },
  { name: 'Champion', minXp: 3000 },
  { name: 'Legend', minXp: 6000 },
];
export const getLevel = (xp) => {
  let curr = LEVELS[0];
  for (const lvl of LEVELS) if (xp >= lvl.minXp) curr = lvl;
  return curr;
};
export const getNextLevel = (xp) => {
  for (const lvl of LEVELS) if (xp < lvl.minXp) return lvl;
  return null;
};

// XP rules
export const calculateXP = (correctCount, totalCount, isMockTest = false) => {
  let xp = totalCount * 10;
  xp += correctCount * 5;
  if (isMockTest) xp += 50;
  return xp;
};

// Rank motivational message
export const getRankMessage = (percentile) => {
  if (percentile >= 90) return "You're crushing it! Keep the streak!";
  if (percentile >= 75) return "Great progress! Almost at the top!";
  if (percentile >= 50) return "On track! A bit more focus gets you there.";
  return "Every expert started here. Let's climb!";
};

export const getPercentileBand = (percentile) => {
  if (percentile >= 90) return { label: 'Elite Scholar', color: '#F59E0B' };
  if (percentile >= 75) return { label: 'High Achiever', color: '#10B981' };
  if (percentile >= 50) return { label: 'On Track', color: '#4F46E5' };
  return { label: 'Needs Focus', color: '#EF4444' };
};

export const formatDate = (d) => {
  if (!d) return '';
  const dt = typeof d === 'string' ? new Date(d) : d;
  return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

export const daysBetween = (a, b) => {
  const ms = new Date(b).getTime() - new Date(a).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
};

export const todayISO = () => new Date().toISOString().slice(0, 10);

export const getWeekStart = (date = new Date()) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
};

export const ACHIEVEMENT_DEFS = [
  { badge: 'First Practice', description: 'Completed your first session', xp: 50, check: (s) => s.sessionsCount >= 1 },
  { badge: '7 Day Streak', description: 'Practiced 7 days in a row', xp: 100, check: (s) => s.streak >= 7 },
  { badge: '30 Day Streak', description: 'A month of consistent practice', xp: 500, check: (s) => s.streak >= 30 },
  { badge: 'Perfect Score', description: 'Scored 100% in a session', xp: 200, check: (s) => s.bestAccuracy >= 100 },
  { badge: '100 Questions', description: 'Practiced 100 questions', xp: 150, check: (s) => s.totalQuestions >= 100 },
  { badge: 'Class Topper', description: 'Reached rank #1 in class', xp: 500, check: (s) => s.rank === 1 },
  { badge: 'Most Improved', description: 'Improved rank by 5+ in a week', xp: 250, check: (s) => s.rankImprovement >= 5 },
  { badge: 'Subject Star', description: 'Top 3 in a subject', xp: 200, check: (s) => s.topSubjectRank <= 3 },
];
