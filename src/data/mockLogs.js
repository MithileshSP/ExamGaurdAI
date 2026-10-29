export const templates = {
  E1: { level: 'NOTICE', t: 'jk2_init() Found child <*> in scoreboard slot <*>', f: (i) => `jk2_init() Found child ${6000 + i} in scoreboard slot ${i % 12}` },
  E2: { level: 'NOTICE', t: 'workerEnv.init() ok <*>', f: () => 'workerEnv.init() ok /etc/httpd/conf/workers2.properties' },
  E3: { level: 'ERROR', t: 'mod_jk child workerEnv in error state <*>', f: (i) => `mod_jk child workerEnv in error state ${6 + (i % 4)}` },
  E4: { level: 'ERROR', t: "jk2_init() Can't find child <*> in scoreboard", f: (i) => `jk2_init() Can't find child ${7000 + i} in scoreboard` },
  E5: { level: 'NOTICE', t: 'mod_jk child init <*> <*>', f: (i) => `mod_jk child init 1 ${-2 + (i % 3)}` },
  E6: { level: 'ERROR', t: '[client <*>] Directory index forbidden by rule: <*>', f: (i) => `[client 10.0.${i % 9}.${20 + (i % 40)}] Directory index forbidden by rule: /var/www/html/` },
};
const r = (i) => Math.abs((Math.sin(i * 91.7) * 10000) % 1);
const fmt = (s) => [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60].map((n) => String(n).padStart(2, '0')).join(':');
export const logs = Array.from({ length: 160 }, (_, i) => {
  const s = 36000 + Math.floor(i * 10.8), late = s >= 36600;
  const pool = late ? ['E3', 'E3', 'E3', 'E4', 'E6', 'E1'] : ['E1', 'E1', 'E2', 'E5', 'E5', 'E3'];
  const id = pool[Math.floor(r(i) * pool.length)];
  const tpl = templates[id];
  return { lineId: i + 1, time: fmt(s), level: tpl.level, eventId: id, content: tpl.f(i), template: tpl.t, source: i % 2 ? 'web-02' : 'web-01' };
});
