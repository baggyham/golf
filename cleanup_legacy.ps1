# Run from the Fairway project root in PowerShell.
# This removes only the 14 known-unreferenced legacy files.
$files = @(
  'src/components/Courses.jsx',
  'src/components/Dashboard.jsx',
  'src/components/Leaderboard.jsx',
  'src/components/Players.jsx',
  'src/components/ScoreStepper.jsx',
  'src/components/Scorecard.jsx',
  'src/components/Setup.jsx',
  'src/components/Tournaments.jsx',
  'src/components/ui/Button.jsx',
  'src/components/ui/Card.jsx',
  'src/components/ui/Field.jsx',
  'src/components/ui/PageHeading.jsx',
  'src/hooks/useTournament.js',
  'src/lib/storage.js'
)
if (-not (Test-Path 'src/App.jsx') -or -not (Test-Path 'package.json')) {
  throw 'Run this script from the Fairway project root (where package.json and src/App.jsx exist).'
}
foreach ($file in $files) {
  if (Test-Path $file) {
    Remove-Item -LiteralPath $file -Force
    Write-Host "Removed $file"
  } else {
    Write-Host "Already absent $file"
  }
}
Write-Host 'Done. Run npm test and npm run build.'
