// Illustrative data only. Replace with the rating and scorecard for your actual tees.
export const sampleCourse = {
  id: 'sample-course',
  name: 'Sample Golf Club',
  tees: 'White tees',
  courseRating: 71.8,
  slopeRating: 125,
  holes: [
    { par: 4, strokeIndex: 9 },
    { par: 4, strokeIndex: 3 },
    { par: 3, strokeIndex: 15 },
    { par: 5, strokeIndex: 1 },
    { par: 4, strokeIndex: 11 },
    { par: 4, strokeIndex: 5 },
    { par: 3, strokeIndex: 17 },
    { par: 4, strokeIndex: 7 },
    { par: 5, strokeIndex: 13 },
    { par: 4, strokeIndex: 10 },
    { par: 3, strokeIndex: 16 },
    { par: 5, strokeIndex: 2 },
    { par: 4, strokeIndex: 8 },
    { par: 4, strokeIndex: 14 },
    { par: 4, strokeIndex: 4 },
    { par: 3, strokeIndex: 18 },
    { par: 5, strokeIndex: 6 },
    { par: 4, strokeIndex: 12 },
  ],
};
export const samplePlayers = [
  { id: 'p1', name: 'You', handicapIndex: 12.0 },
  { id: 'p2', name: 'Alex', handicapIndex: 18.0 },
  { id: 'p3', name: 'Ben', handicapIndex: 24.0 },
  { id: 'p4', name: 'Chris', handicapIndex: 8.0 },
];
export const initialTournament = {
  title: 'The Weekend Open',
  allowance: 1,
  course: sampleCourse,
  players: samplePlayers,
  scores: Object.fromEntries(samplePlayers.map((player) => [player.id, Array(18).fill(null)])),
};
