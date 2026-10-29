export const complaints = [
  { id: 'C-101', time: '10:10', category: 'Submission failure', text: 'My answers are not submitting.', incident: 'INC-001', confidence: 0.94, observations: ['Submission API latency increased', 'Database timeout errors appeared', 'Error rate increased in the same interval'] },
  { id: 'C-102', time: '10:11', category: 'Slow loading', text: 'The examination page is very slow.', incident: 'INC-001', confidence: 0.88, observations: ['Response time above 1,500 ms', 'Database latency elevated'] },
  { id: 'C-103', time: '10:13', category: 'Login failure', text: 'I cannot log in to the portal.', incident: 'INC-002', confidence: 0.91, observations: ['E3 worker environment errors increased'] },
  { id: 'C-104', time: '10:16', category: 'Submission failure', text: 'Submit button spins forever.', incident: 'INC-001', confidence: 0.9, observations: ['Request timeouts increased'] },
  { id: 'C-105', time: '09:48', category: 'Slow loading', text: 'Page froze for a few seconds.', incident: 'INC-003', confidence: 0.62, observations: ['Memory utilization peaked at 92%'] },
];
